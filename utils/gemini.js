const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('./logger');

let genAI;
let model;

function initialize() {
    if (!process.env.GEMINI_API_KEY) {
        logger.warn('Gemini API key not found, AI features will be disabled');
        return;
    }

    try {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Use Gemini 2.0 Flash - the newest model
        model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
        logger.info('Gemini AI initialized successfully with Gemini 2.0 Flash');
    } catch (error) {
        logger.error('Error initializing Gemini AI:', error);
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
    analyzeImage,
    moderateContent,
    summarizeText,
    translateText,
    generateCreativeContent,
    chatWithContext,
    isInitialized: () => model !== null
};