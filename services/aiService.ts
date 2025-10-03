import { GoogleGenAI, Type } from "@google/genai";
import { RewriteSuggestion, AiConfig, AiProvider } from '../types';

// Schemas for Gemini's structured JSON output
const analysisSchema = {
    type: Type.OBJECT,
    properties: {
        topic: {
            type: Type.STRING,
            description: 'The main topic or primary keyword phrase of the page, inferred from the title and description.'
        },
        titleAnalysis: {
            type: Type.OBJECT,
            properties: {
                grade: { type: Type.INTEGER, description: 'SEO score for the title (0-100).' },
                feedback: { type: Type.STRING, description: 'Concise, actionable feedback for the title (1-2 sentences).' }
            },
            required: ["grade", "feedback"]
        },
        descriptionAnalysis: {
            type: Type.OBJECT,
            properties: {
                grade: { type: Type.INTEGER, description: 'SEO score for the description (0-100).' },
                feedback: { type: Type.STRING, description: 'Concise, actionable feedback for the description (1-2 sentences).' }
            },
            required: ["grade", "feedback"]
        }
    },
    required: ["topic", "titleAnalysis", "descriptionAnalysis"]
};

const suggestionSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: 'A new, SEO-optimized meta title.' },
            description: { type: Type.STRING, description: 'A new, compelling meta description.' },
            rationale: { type: Type.STRING, description: 'A brief, 1-sentence explanation of why this suggestion is effective for SEO.' }
        },
        required: ["title", "description", "rationale"]
    }
};

// Endpoints for OpenAI-compatible providers
const providerApiEndpoints: Record<Exclude<AiProvider, 'gemini'>, string> = {
    openai: 'https://api.openai.com/v1/chat/completions',
    openrouter: 'https://openrouter.ai/api/v1/chat/completions',
    groq: 'https://api.groq.com/openai/v1/chat/completions',
};

/**
 * A generic, live API handler for all OpenAI-compatible services with built-in rate-limit retries.
 */
async function executeOpenAiCompatibleChat<T>(
    endpoint: string,
    config: AiConfig,
    prompt: string,
    jsonSchemaString: string
): Promise<T> {
    if (!config.model) {
        throw new Error(`A model name must be provided for the '${config.provider}' provider.`);
    }

    const body = {
        model: config.model,
        response_format: { type: "json_object" },
        messages: [
            { 
                role: "system", 
                content: `You are an elite SEO analyst and master copywriter. Your responses must be structured, precise, and adhere strictly to the provided JSON schema: ${jsonSchemaString}`
            },
            { role: "user", content: prompt }
        ]
    };
    
    let lastError: Error | null = null;
    const MAX_RETRIES = 4;
    let delay = 1000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`,
                    'HTTP-Referer': 'https://seo-analyzer.dev', // Required by OpenRouter
                    'X-Title': 'WP SEO Optimizer AI',
                },
                body: JSON.stringify(body)
            });

            if (response.status === 429) {
                 const retryAfter = response.headers.get('Retry-After');
                 const wait = retryAfter ? parseInt(retryAfter, 10) * 1000 : delay;
                 console.warn(`Rate limit hit (attempt ${attempt}). Retrying after ${wait}ms...`);
                 await new Promise(res => setTimeout(res, wait + Math.random() * 500)); // Jitter
                 delay *= 2; // Exponential backoff
                 continue;
            }

            if (!response.ok) {
                const errorBody = await response.text();
                console.error("API Error Response:", errorBody);
                throw new Error(`API request failed for model ${config.model} with status ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content;
            if (!content) throw new Error("Received an empty content response from the AI.");

            try {
                return JSON.parse(content); // Success!
            } catch (e) {
                console.error("Failed to parse JSON response from AI:", content);
                throw new Error("The AI returned invalid JSON.");
            }
        } catch (error) {
            lastError = error as Error;
            if (attempt === MAX_RETRIES) break; // Don't wait after the last attempt
            console.warn(`Request failed (attempt ${attempt}): ${lastError.message}. Retrying in ${delay}ms...`);
            await new Promise(res => setTimeout(res, delay));
            delay *= 2;
        }
    }
    throw lastError ?? new Error(`API request failed for ${config.model} after ${MAX_RETRIES} attempts.`);
}

/**
 * Performs a lightweight, real-world API call to validate the provided API key.
 */
export const validateApiKey = async (config: AiConfig): Promise<boolean> => {
    if (!config.apiKey) return false;
    try {
        switch (config.provider) {
            case 'gemini':
                // Using API key directly as environment variables are not available in this context
                const geminiAi = new GoogleGenAI({ apiKey: config.apiKey });
                await geminiAi.models.generateContent({
                    model: "gemini-2.5-flash", contents: "hello", config: { thinkingConfig: { thinkingBudget: 0 } }
                });
                return true;
            case 'openai':
            case 'openrouter':
            case 'groq':
                const endpoint = providerApiEndpoints[config.provider];
                const testConfig: AiConfig = { 
                    ...config,
                    model: config.model || (config.provider === 'openai' ? 'gpt-3.5-turbo' : 'llama3-8b-8192')
                };
                 // For Groq, Llama3 is a common fast model
                if(config.provider === 'groq' && !config.model) testConfig.model = 'llama3-8b-8192';
                await executeOpenAiCompatibleChat(endpoint, testConfig, "ping", `{"type": "string"}`);
                return true;
            default:
                return false;
        }
    } catch (error) {
        console.error(`API Key validation failed for ${config.provider}:`, (error as Error).message);
        return false;
    }
};

/**
 * Analyzes SEO data using a live call to the configured AI provider.
 */
export const analyzeSeo = async (title: string, description: string, config: AiConfig): Promise<{ topic: string, titleGrade: number, titleFeedback: string, descriptionGrade: number, descriptionFeedback: string }> => {
    const prompt = `
        As an elite SEO analyst, perform a critical review of the following meta elements.
        - Title: "${title}"
        - Description: "${description}"

        Your analysis must be sharp and actionable.
        1.  **Infer Topic:** What is the primary user intent and core keyword phrase this page is targeting? Be specific.
        2.  **Grade Title (0-100):** Evaluate based on modern SEO best practices: optimal length (50-60 chars), keyword prominence, clarity, and its power to compel a click from a savvy user.
        3.  **Grade Description (0-100):** Evaluate based on its ability to support the title, expand on the core promise, meet user intent, and include a strong call-to-action. Length should be optimal (120-155 chars).
        4.  **Feedback:** Provide concise, expert-level feedback for both elements.
        Return your complete analysis in the required JSON format.
    `;
    const errorResult = {
        topic: 'Analysis failed',
        titleGrade: 0, titleFeedback: 'Could not analyze title due to an API error.',
        descriptionGrade: 0, descriptionFeedback: 'Could not analyze description due to an API error.'
    };

    try {
        if (config.provider === 'gemini') {
            const ai = new GoogleGenAI({ apiKey: config.apiKey });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash", contents: prompt,
                config: { responseMimeType: "application/json", responseSchema: analysisSchema },
            });
            const result = JSON.parse(response.text.trim());
            return {
                topic: result.topic || 'N/A',
                titleGrade: result.titleAnalysis?.grade || 0,
                titleFeedback: result.titleAnalysis?.feedback || 'No feedback provided.',
                descriptionGrade: result.descriptionAnalysis?.grade || 0,
                descriptionFeedback: result.descriptionAnalysis?.feedback || 'No feedback provided.'
            };
        } else {
            const endpoint = providerApiEndpoints[config.provider];
            const result = await executeOpenAiCompatibleChat<{ topic: string; titleAnalysis: { grade: number; feedback: string; }; descriptionAnalysis: { grade: number; feedback: string; };}>(endpoint, config, prompt, JSON.stringify(analysisSchema));
             return {
                topic: result.topic || 'N/A',
                titleGrade: result.titleAnalysis?.grade || 0,
                titleFeedback: result.titleAnalysis?.feedback || 'No feedback provided.',
                descriptionGrade: result.descriptionAnalysis?.grade || 0,
                descriptionFeedback: result.descriptionAnalysis?.feedback || 'No feedback provided.'
            };
        }
    } catch (error) {
        console.error(`Error analyzing SEO with ${config.provider}:`, error);
        return errorResult;
    }
};

/**
 * Generates SEO suggestions using a live call to the configured AI provider.
 */
export const generateSeoSuggestions = async (oldTitle: string, oldDescription: string, url: string, topic: string, config: AiConfig, targetLocation?: string): Promise<RewriteSuggestion[]> => {
    
    const geoInstruction = targetLocation
    ? `An important business goal is to rank for the target location: "${targetLocation}". Where it makes sense and feels natural, subtly incorporate this location or local-intent keywords (e.g., 'services in ${targetLocation}', 'near you') into your suggestions to capture local search traffic. Do not force the location if it makes the copy awkward or irrelevant.`
    : `This is for a global audience; do not use location-specific terms.`;

    const prompt = `
        You are a world-class SEO strategist and direct-response copywriter, a true master of crafting meta tags that not only rank but also command the click. Your task is to produce three premium, expert-level rewrite suggestions for the following webpage. These suggestions must be a significant upgrade, not a minor tweak.

        **Webpage Context:**
        - URL: ${url}
        - AI-Identified Core Topic: "${topic}"
        - Current Title: "${oldTitle}"
        - Current Description: "${oldDescription}"

        **Geo-Targeting Instructions:**
        ${geoInstruction}

        **Your Mission:**
        Generate 3 unique and compelling suggestions. For each suggestion, provide a new title, a new description, and a sharp rationale.

        **CRITICAL REQUIREMENTS - Adhere to these strictly:**
        1.  **Title (Under 60 chars):** Must be magnetic but not clickbait. Use power words, numbers, or questions to spark curiosity. It must promise a clear benefit and contain the primary keyword/topic. Your goal is maximum Click-Through Rate (CTR) from a qualified audience.
        2.  **Description (Under 155 chars):** Must be persuasive and trustworthy. It must expand on the title's promise, build credibility, and include a strong, natural call-to-action (CTA). Address the user's core problem or desire with empathy. It must be a compelling summary that convinces the user this page has their answer.
        3.  **Rationale (1 sentence):** Provide a concise, expert rationale for *why* your suggestion is superior from a modern SEO and copywriting perspective. For example: "This title uses a number to attract attention and a strong benefit-driven CTA in the description." or "Integrates the target location to capture high-intent local searchers."
        4.  **Semantic SEO:** Ensure keywords are used naturally and semantically. The copy must read like it was written for a human first, search engine second. Avoid keyword stuffing.
        5.  **Accuracy:** The suggestions must be 100% accurate and relevant to the page's topic. No generic or "placebo" content.
        6.  **Output Format:** Your response must be a JSON array of objects, strictly following the provided schema. Do not deviate.
    `;

    try {
        let result: any;

        if (config.provider === 'gemini') {
            const ai = new GoogleGenAI({ apiKey: config.apiKey });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash", contents: prompt,
                config: { responseMimeType: "application/json", responseSchema: suggestionSchema },
            });
            result = JSON.parse(response.text.trim());
        } else {
             const endpoint = providerApiEndpoints[config.provider];
             result = await executeOpenAiCompatibleChat<RewriteSuggestion[]>(endpoint, config, prompt, JSON.stringify(suggestionSchema));
        }

        // **Strict Zero-Tolerance Validation Layer**
        // Ensure the result is a non-empty array and each item has the required properties.
        if (Array.isArray(result) && result.length > 0 && result.every(item => item.title && item.description && item.rationale)) {
            return result as RewriteSuggestion[];
        } else {
            console.warn("AI returned invalid, empty, or incomplete suggestions:", result);
            throw new Error("AI failed to return valid, non-empty suggestions in the expected format.");
        }

    } catch (error) {
        const errorMessage = (error as Error).message;
        console.error(`Error generating suggestions with ${config.provider}:`, errorMessage);
        // Provide a clear, actionable error to the user.
        throw new Error(`Failed to generate suggestions from ${config.provider}. Reason: ${errorMessage}`);
    }
};