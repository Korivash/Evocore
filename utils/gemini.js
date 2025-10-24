const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const logger = require('./logging');

let genAI;
let model;
let imageModel;

// Track API usage for intelligent fallback
const apiUsage = {
    gemini: { count: 0, lastReset: Date.now(), limit: 1500 },
    huggingface: { count: 0, lastReset: Date.now(), limit: 1000 }
};

function initialize() {
    if (!process.env.GEMINI_API_KEY) {
        logger.warn('Gemini API key not found, some AI features will be limited');
    } else {
        try {
            genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            // Use Gemini 2.0 Flash - the newest text model
            model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
            // Initialize Imagen 3 for image generation
            imageModel = genAI.getGenerativeModel({ model: 'imagen-3.0-generate-001' });
            logger.info('Gemini AI initialized successfully with Gemini 2.0 Flash and Imagen 3');
        } catch (error) {
            logger.error('Error initializing Gemini AI:', error);
        }
    }
}

// Reset daily usage counters
setInterval(() => {
    const now = Date.now();
    if (now - apiUsage.gemini.lastReset > 86400000) { // 24 hours
        apiUsage.gemini.count = 0;
        apiUsage.gemini.lastReset = now;
        logger.info('Gemini usage counter reset');
    }
    if (now - apiUsage.huggingface.lastReset > 2592000000) { // 30 days
        apiUsage.huggingface.count = 0;
        apiUsage.huggingface.lastReset = now;
        logger.info('Hugging Face usage counter reset');
    }
}, 3600000); // Check every hour

async function generateResponse(prompt, context = '') {
    if (!model) {
        throw new Error('Gemini AI is not initialized. Please configure GEMINI_API_KEY.');
    }

    try {
        const fullPrompt = context ? `${context}\n\nUser: ${prompt}` : prompt;
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        logger.error('Error generating AI response:', error);
        throw error;
    }
}

async function generateImage(prompt, aspectRatio = '1:1') {
    // Try providers in order of preference
    const providers = [
        { name: 'Gemini Imagen 3', func: generateImageGemini, needsKey: true },
        { name: 'Pollinations.ai', func: generateImagePollinations, needsKey: false },
        { name: 'Hugging Face', func: generateImageHuggingFace, needsKey: true }
    ];

    let lastError = null;

    for (const provider of providers) {
        // Skip if API key needed but not configured
        if (provider.needsKey && provider.name.includes('Gemini') && !imageModel) {
            logger.info(`Skipping ${provider.name} (no API key configured)`);
            continue;
        }
        if (provider.needsKey && provider.name.includes('Hugging Face') && !process.env.HUGGINGFACE_API_KEY) {
            logger.info(`Skipping ${provider.name} (no API key configured)`);
            continue;
        }

        // Check usage limits
        const usageKey = provider.name.toLowerCase().includes('gemini') ? 'gemini' : 
                        provider.name.toLowerCase().includes('hugging') ? 'huggingface' : null;
        
        if (usageKey && apiUsage[usageKey]) {
            if (apiUsage[usageKey].count >= apiUsage[usageKey].limit) {
                logger.warn(`${provider.name} daily limit reached (${apiUsage[usageKey].limit}), trying next provider`);
                continue;
            }
        }

        try {
            logger.info(`Attempting image generation with ${provider.name}...`);
            const image = await provider.func(prompt, aspectRatio);
            
            // Track successful usage
            if (usageKey && apiUsage[usageKey]) {
                apiUsage[usageKey].count++;
                logger.info(`${provider.name} success! Usage: ${apiUsage[usageKey].count}/${apiUsage[usageKey].limit}`);
            } else {
                logger.info(`${provider.name} success! (No usage limits)`);
            }
            
            return image;
        } catch (error) {
            logger.warn(`${provider.name} failed: ${error.message}`);
            lastError = error;
            continue;
        }
    }

    // All providers failed
    throw new Error(`All image generation providers failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

// Provider 1: Gemini Imagen 3 (Best quality, 1500/day free)
async function generateImageGemini(prompt, aspectRatio = '1:1') {
    if (!imageModel) {
        throw new Error('Gemini image model not initialized');
    }

    const ratioMap = {
        '1:1': '1:1',
        '16:9': '16:9',
        '9:16': '9:16',
        '21:9': '16:9' // Fallback
    };

    const mappedRatio = ratioMap[aspectRatio] || '1:1';

    logger.info(`Generating with Gemini Imagen 3: "${prompt.substring(0, 50)}..." (${mappedRatio})`);

    const result = await imageModel.generateContent({
        contents: [{
            role: 'user',
            parts: [{ text: prompt }]
        }],
        generationConfig: {
            temperature: 1.0,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
            responseMimeType: 'image/png',
        },
        safetySettings: [
            {
                category: 'HARM_CATEGORY_HATE_SPEECH',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
                category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
                category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
                category: 'HARM_CATEGORY_HARASSMENT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            }
        ]
    });

    const response = await result.response;
    
    if (response.candidates && response.candidates[0]) {
        const candidate = response.candidates[0];
        
        if (candidate.finishReason === 'SAFETY') {
            throw new Error('Content blocked by safety filters');
        }

        if (candidate.content?.parts?.[0]?.inlineData) {
            const base64Data = candidate.content.parts[0].inlineData.data;
            return Buffer.from(base64Data, 'base64');
        }
    }

    throw new Error('No image data in Gemini response');
}

// Provider 2: Pollinations.ai (FREE, UNLIMITED, NO API KEY!)
async function generateImagePollinations(prompt, aspectRatio = '1:1') {
    const dimensions = {
        '1:1': { width: 512, height: 512 },
        '16:9': { width: 768, height: 432 },
        '9:16': { width: 432, height: 768 },
        '21:9': { width: 896, height: 384 }
    };

    const { width, height } = dimensions[aspectRatio] || dimensions['1:1'];

    logger.info(`Generating with Pollinations.ai (FREE): "${prompt.substring(0, 50)}..." (${width}x${height})`);

    // Pollinations.ai - Free, unlimited, no API key!
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
    
    const response = await axios.get(url, {
        params: {
            width: width,
            height: height,
            seed: Math.floor(Math.random() * 1000000),
            model: 'flux', // 'flux' is high quality, 'turbo' is faster
            nologo: true,
            enhance: true // Better prompt interpretation
        },
        responseType: 'arraybuffer',
        timeout: 60000, // 60 seconds
        maxRedirects: 5
    });

    if (!response.data || response.data.length === 0) {
        throw new Error('Empty response from Pollinations.ai');
    }

    return Buffer.from(response.data);
}

// Provider 3: Hugging Face (Free tier, 30k/month, requires API key)
async function generateImageHuggingFace(prompt, aspectRatio = '1:1') {
    if (!process.env.HUGGINGFACE_API_KEY) {
        throw new Error('Hugging Face API key not configured');
    }

    const dimensions = {
        '1:1': { width: 512, height: 512 },
        '16:9': { width: 768, height: 432 },
        '9:16': { width: 432, height: 768 },
        '21:9': { width: 896, height: 384 }
    };

    const { width, height } = dimensions[aspectRatio] || dimensions['1:1'];

    logger.info(`Generating with Hugging Face: "${prompt.substring(0, 50)}..." (${width}x${height})`);

    // Using Stable Diffusion XL on Hugging Face
    const response = await axios.post(
        'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
        {
            inputs: prompt,
            parameters: {
                negative_prompt: 'nsfw, nude, explicit, violence, gore, offensive, low quality, blurry',
                width: width,
                height: height,
                num_inference_steps: 25,
                guidance_scale: 7.5
            }
        },
        {
            headers: {
                'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            responseType: 'arraybuffer',
            timeout: 60000
        }
    );

    // Check if response is an error
    if (response.headers['content-type']?.includes('application/json')) {
        const errorData = JSON.parse(Buffer.from(response.data).toString());
        if (errorData.error) {
            throw new Error(errorData.error);
        }
    }

    if (!response.data || response.data.length === 0) {
        throw new Error('Empty response from Hugging Face');
    }

    return Buffer.from(response.data);
}

async function analyzeImage(imageData, prompt) {
    if (!genAI) {
        throw new Error('Gemini AI is not initialized');
    }

    try {
        // Gemini 2.0 Flash supports vision natively
        const visionModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
        const result = await visionModel.generateContent([prompt, imageData]);
        const response = await result.response;
        return response.text();
    } catch (error) {
        logger.error('Error analyzing image:', error);
        throw error;
    }
}

async function moderateContent(content) {
    if (!model) {
        throw new Error('Gemini AI is not initialized');
    }

    try {
        const prompt = `Analyze the following message for harmful content, including hate speech, harassment, explicit content, or dangerous information. Return a JSON object with: {
            "isSafe": boolean,
            "reason": "explanation if not safe",
            "severity": "low/medium/high",
            "categories": ["list of violation categories"]
        }
        
        Message: "${content}"`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Try to parse JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        
        return {
            isSafe: true,
            reason: '',
            severity: 'low',
            categories: []
        };
    } catch (error) {
        logger.error('Error moderating content:', error);
        return {
            isSafe: true,
            reason: 'Error analyzing content',
            severity: 'low',
            categories: []
        };
    }
}

async function summarizeText(text, maxLength = 200) {
    if (!model) {
        throw new Error('Gemini AI is not initialized');
    }

    try {
        const prompt = `Summarize the following text in ${maxLength} characters or less:\n\n${text}`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        logger.error('Error summarizing text:', error);
        throw error;
    }
}

async function translateText(text, targetLanguage) {
    if (!model) {
        throw new Error('Gemini AI is not initialized');
    }

    try {
        const prompt = `Translate the following text to ${targetLanguage}. Only provide the translation, no explanations:\n\n${text}`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        logger.error('Error translating text:', error);
        throw error;
    }
}

async function generateCreativeContent(type, topic, style = '') {
    if (!model) {
        throw new Error('Gemini AI is not initialized');
    }

    try {
        let prompt = '';
        switch (type) {
            case 'story':
                prompt = `Write a short story about ${topic}${style ? ` in a ${style} style` : ''}. Keep it under 500 words.`;
                break;
            case 'poem':
                prompt = `Write a poem about ${topic}${style ? ` in ${style} format` : ''}. Make it creative and engaging.`;
                break;
            case 'joke':
                prompt = `Tell a funny, family-friendly joke about ${topic}.`;
                break;
            case 'fact':
                prompt = `Share an interesting and verified fact about ${topic}. Keep it concise.`;
                break;
            default:
                prompt = `Generate creative content about ${topic}.`;
        }

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        logger.error('Error generating creative content:', error);
        throw error;
    }
}

async function chatWithContext(messages) {
    if (!model) {
        throw new Error('Gemini AI is not initialized');
    }

    try {
        // Use Gemini 2.0's improved chat capabilities
        const chat = model.startChat({
            history: messages.slice(0, -1).map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            })),
            generationConfig: {
                maxOutputTokens: 2048,
                temperature: 0.9,
            },
        });

        const lastMessage = messages[messages.length - 1];
        const result = await chat.sendMessage(lastMessage.content);
        const response = await result.response;
        return response.text();
    } catch (error) {
        logger.error('Error in chat with context:', error);
        throw error;
    }
}

// Get usage statistics
function getUsageStats() {
    const stats = {
        gemini: {
            used: apiUsage.gemini.count,
            limit: apiUsage.gemini.limit,
            remaining: apiUsage.gemini.limit - apiUsage.gemini.count,
            resetIn: Math.max(0, 86400000 - (Date.now() - apiUsage.gemini.lastReset)),
            percentage: Math.round((apiUsage.gemini.count / apiUsage.gemini.limit) * 100)
        },
        huggingface: {
            used: apiUsage.huggingface.count,
            limit: apiUsage.huggingface.limit,
            remaining: apiUsage.huggingface.limit - apiUsage.huggingface.count,
            resetIn: Math.max(0, 2592000000 - (Date.now() - apiUsage.huggingface.lastReset)),
            percentage: Math.round((apiUsage.huggingface.count / apiUsage.huggingface.limit) * 100)
        },
        pollinations: {
            used: '∞',
            limit: '∞',
            remaining: '∞',
            resetIn: 0,
            percentage: 0,
            note: 'Unlimited free usage, no API key required'
        }
    };

    return stats;
}

// Format usage stats for display
function formatUsageStats() {
    const stats = getUsageStats();
    
    let output = '📊 **Image Generation Usage Stats**\n\n';
    
    // Gemini
    if (imageModel) {
        const resetHours = Math.floor(stats.gemini.resetIn / 3600000);
        output += `**Gemini Imagen 3** (Highest Quality)\n`;
        output += `├─ Used: ${stats.gemini.used}/${stats.gemini.limit} (${stats.gemini.percentage}%)\n`;
        output += `├─ Remaining: ${stats.gemini.remaining}\n`;
        output += `└─ Resets in: ${resetHours}h\n\n`;
    } else {
        output += `**Gemini Imagen 3**\n`;
        output += `└─ ❌ Not configured (add GEMINI_API_KEY to .env)\n\n`;
    }
    
    // Pollinations
    output += `**Pollinations.ai** (Backup - FREE)\n`;
    output += `├─ Used: Unlimited\n`;
    output += `├─ Remaining: ∞\n`;
    output += `└─ ✅ Always available, no API key needed\n\n`;
    
    // Hugging Face
    if (process.env.HUGGINGFACE_API_KEY) {
        const resetDays = Math.floor(stats.huggingface.resetIn / 86400000);
        output += `**Hugging Face** (Secondary Backup)\n`;
        output += `├─ Used: ${stats.huggingface.used}/${stats.huggingface.limit} (${stats.huggingface.percentage}%)\n`;
        output += `├─ Remaining: ${stats.huggingface.remaining}\n`;
        output += `└─ Resets in: ${resetDays}d\n`;
    } else {
        output += `**Hugging Face**\n`;
        output += `└─ ⚠️ Not configured (optional)\n`;
    }
    
    return output;
}

// Initialize on module load
initialize();

module.exports = {
    generateResponse,
    generateImage,
    analyzeImage,
    moderateContent,
    summarizeText,
    translateText,
    generateCreativeContent,
    chatWithContext,
    getUsageStats,
    formatUsageStats,
    isInitialized: () => model !== null,
    isImageGenerationAvailable: () => imageModel !== null || true // Always true because Pollinations is always available
};
