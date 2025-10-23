const { GoogleGenerativeAI } = require('@google/generative-ai');
const Replicate = require('replicate');
const logger = require('./logger');
const axios = require('axios');

let genAI;
let model;
let replicate;

function initialize() {
    if (!process.env.GEMINI_API_KEY) {
        logger.warn('Gemini API key not found, AI features will be disabled');
    } else {
        try {
            genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            // Use Gemini 2.0 Flash - the newest text model
            model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
            logger.info('Gemini AI initialized successfully with Gemini 2.0 Flash');
        } catch (error) {
            logger.error('Error initializing Gemini AI:', error);
        }
    }

    if (process.env.REPLICATE_API_TOKEN) {
        try {
            replicate = new Replicate({
                auth: process.env.REPLICATE_API_TOKEN,
            });
            logger.info('Replicate initialized successfully for image generation');
        } catch (error) {
            logger.error('Error initializing Replicate:', error);
        }
    } else {
        logger.warn('Replicate API token not found, image generation will be disabled');
    }
}

async function generateResponse(prompt, context = '') {
    if (!model) {
        throw new Error('Gemini AI is not initialized');
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
    if (!replicate) {
        throw new Error('Image generation is not available. Please configure REPLICATE_API_TOKEN in your .env file.');
    }

    try {
        logger.info(`Generating image with Stable Diffusion SDXL: "${prompt}" (${aspectRatio})`);

        // Map aspect ratios to width/height for SDXL
        const dimensions = {
            '1:1': { width: 1024, height: 1024 },
            '16:9': { width: 1344, height: 768 },
            '9:16': { width: 768, height: 1344 },
            '21:9': { width: 1536, height: 640 }
        };

        const { width, height } = dimensions[aspectRatio] || dimensions['1:1'];

        // Use Stable Diffusion XL for high quality image generation
        const output = await replicate.run(
            "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
            {
                input: {
                    prompt: prompt,
                    width: width,
                    height: height,
                    num_outputs: 1,
                    scheduler: "K_EULER",
                    num_inference_steps: 30,
                    guidance_scale: 7.5,
                    negative_prompt: "ugly, blurry, poor quality, distorted, deformed",
                    refine: "expert_ensemble_refiner",
                    high_noise_frac: 0.8
                }
            }
        );

        // Output is an array of URLs
        if (output && output[0]) {
            const imageUrl = output[0];
            logger.info(`Image generated successfully: ${imageUrl}`);
            
            // Download the image and return as buffer
            const response = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 30000
            });

            return Buffer.from(response.data);
        }

        throw new Error('No image generated');

    } catch (error) {
        logger.error('Error generating image:', error);
        
        // Provide specific error messages
        if (error.message.includes('not available')) {
            throw error;
        } else if (error.message.includes('Prediction failed')) {
            throw new Error('Image generation failed. Please try a different prompt.');
        } else if (error.message.includes('safety')) {
            throw new Error('Image generation blocked by safety filters. Please try a different prompt.');
        } else if (error.message.includes('timeout')) {
            throw new Error('Image generation timed out. Please try again.');
        } else if (error.response?.status === 401) {
            throw new Error('Invalid Replicate API token. Please check your configuration.');
        } else if (error.response?.status === 429) {
            throw new Error('API quota exceeded. Please try again later.');
        }
        
        throw new Error(`Image generation error: ${error.message}`);
    }
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
    isInitialized: () => model !== null,
    isImageGenerationAvailable: () => replicate !== null
};
