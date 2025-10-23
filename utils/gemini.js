const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('./logger');

let genAI;
let model;
let imageModel;

function initialize() {
    if (!process.env.GEMINI_API_KEY) {
        logger.warn('Gemini API key not found, AI features will be disabled');
        return;
    }

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
    if (!imageModel) {
        throw new Error('Imagen 3 is not initialized');
    }

    try {
        // Map aspect ratios to Imagen 3 format
        const ratioMap = {
            '1:1': '1:1',
            '16:9': '16:9',
            '9:16': '9:16',
            '21:9': '16:9' // Fallback to 16:9 for 21:9
        };

        const mappedRatio = ratioMap[aspectRatio] || '1:1';

        logger.info(`Generating image with prompt: "${prompt}" (${mappedRatio})`);

        // Generate image using Imagen 3
        const result = await imageModel.generateContent({
            contents: [{
                role: 'user',
                parts: [{
                    text: prompt
                }]
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
        
        // Get the image data
        if (response.candidates && response.candidates[0]) {
            const candidate = response.candidates[0];
            
            // Check if blocked by safety filters
            if (candidate.finishReason === 'SAFETY') {
                throw new Error('Image generation blocked by safety filters');
            }

            // Extract image data from the response
            if (candidate.content && candidate.content.parts && candidate.content.parts[0]) {
                const part = candidate.content.parts[0];
                
                // If inline data is present
                if (part.inlineData) {
                    const base64Data = part.inlineData.data;
                    return Buffer.from(base64Data, 'base64');
                }
                
                // If file data is present
                if (part.fileData) {
                    // Handle file data (would need to fetch from URI)
                    throw new Error('File data format not yet supported');
                }
            }
        }

        throw new Error('No image data in response');

    } catch (error) {
        logger.error('Error generating image:', error);
        
        // Provide more specific error messages
        if (error.message.includes('safety')) {
            throw new Error('Image generation blocked by safety filters. Please try a different prompt.');
        } else if (error.message.includes('quota') || error.message.includes('429')) {
            throw new Error('API quota exceeded. Please try again later.');
        } else if (error.message.includes('API key')) {
            throw new Error('Invalid API key configuration.');
        } else if (error.response?.status === 400) {
            throw new Error('Invalid prompt or parameters. Please try rephrasing your request.');
        }
        
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
    generateImage,
    analyzeImage,
    moderateContent,
    summarizeText,
    translateText,
    generateCreativeContent,
    chatWithContext,
    isInitialized: () => model !== null,
    isImageGenerationAvailable: () => imageModel !== null
};
