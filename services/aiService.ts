import { GoogleGenAI, Type } from "@google/genai";
import { RewriteSuggestion, AiConfig, AiProvider, SeoAnalysis, SeoData, InternalLinkSuggestion, SerpResult } from '../types';
import { fetchSerpData } from "./serpService";

/**
 * Custom error class to specifically identify rate-limiting issues.
 * This allows the AILoadBalancer to catch this specific error and
 * implement cool-down logic for the affected API key.
 */
export class RateLimitError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'RateLimitError';
    }
}

// A new, comprehensive schema for deep SEO analysis.
const deepAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        topic: {
            type: Type.STRING,
            description: 'The main topic or primary keyword phrase of the page, inferred from the title, description, and content.'
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
        },
        readabilityAnalysis: {
            type: Type.OBJECT,
            properties: {
                gradeLevel: { type: Type.NUMBER, description: 'The Flesch-Kincaid reading grade level of the content.' },
                feedback: { type: Type.STRING, description: 'A brief, 1-sentence analysis of the readability and suggestions for improvement.' }
            },
            required: ["gradeLevel", "feedback"]
        },
        aeoAnalysis: { // Answer Engine Optimization
            type: Type.OBJECT,
            properties: {
                feedback: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: '3-4 bullet points of actionable advice to improve the content for featured snippets and voice search (e.g., adding a Q&A section, using clearer headings).'
                }
            },
            required: ["feedback"]
        },
        internalLinkAnalysis: {
            type: Type.ARRAY,
            description: 'Up to 3 strategic internal link suggestions to improve site structure and user flow.',
            items: {
                type: Type.OBJECT,
                properties: {
                    anchorText: { type: Type.STRING, description: 'A relevant phrase from the page content to use as anchor text.' },
                    targetUrl: { type: Type.STRING, description: 'The most relevant internal URL to link to from the provided list of site URLs.' },
                    rationale: { type: Type.STRING, description: 'A brief, 1-sentence explanation of why this link is valuable for SEO.' }
                },
                required: ["anchorText", "targetUrl", "rationale"]
            }
        }
    },
    required: ["topic", "titleAnalysis", "descriptionAnalysis", "readabilityAnalysis", "aeoAnalysis", "internalLinkAnalysis"]
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
        const errorBody = await response.json();
        const errorMessage = errorBody?.error?.message || 'Rate limit exceeded.';
        console.warn(`Rate limit hit for ${config.provider} (${config.model}): ${errorMessage}`);
        throw new RateLimitError(`Rate limit hit for ${config.provider}: ${errorMessage}`);
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
}

/**
 * Performs a lightweight, real-world API call to validate the provided API key.
 */
export const validateApiKey = async (config: AiConfig): Promise<boolean> => {
    if (!config.apiKey) return false;
    try {
        switch (config.provider) {
            case 'gemini':
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

export type AnalysisResult = { 
    topic: string, 
    titleGrade: number, 
    titleFeedback: string, 
    descriptionGrade: number, 
    descriptionFeedback: string,
    readabilityGrade?: number;
    readabilityFeedback?: string;
    aeoFeedback?: string[];
    internalLinkSuggestions?: InternalLinkSuggestion[];
};

/**
 * Analyzes SEO data using a live call to the configured AI provider.
 */
const analyzeSeo = async (pageData: SeoAnalysis, config: AiConfig, context: { allPages: SeoData[] }): Promise<AnalysisResult> => {
    const internalLinkCandidates = context.allPages
        .filter(p => p.url !== pageData.url)
        .map(p => `- URL: ${p.url}\n  Title: ${p.title}`)
        .join('\n');

    const prompt = `
        As a world-class, data-driven SEO consultant, perform a comprehensive on-page analysis of the following webpage.

        **Page Context:**
        - URL: "${pageData.url}"
        - Title: "${pageData.title}"
        - Description: "${pageData.description}"
        - Content Snippet (first 2000 chars): "${pageData.content.substring(0, 2000)}..."

        **Your Analysis Tasks:**
        1.  **Core Topic Identification:** Distill the page's primary topic into a concise keyword phrase.
        2.  **Meta Tag Evaluation (0-100 Scale):**
            -   **Title:** Grade based on length (under 60 chars), keyword placement, clarity, and click-through rate (CTR) potential.
            -   **Description:** Grade based on length (under 155 chars), persuasiveness, and CTA inclusion.
        3.  **Content Readability Analysis:** Determine the Flesch-Kincaid grade level and provide one sentence of feedback.
        4.  **Answer Engine Optimization (AEO):** Provide 3-4 bullet points of high-impact advice for capturing Featured Snippets.
        5.  **Strategic Internal Linking:** Identify up to 3 contextually relevant anchor texts from the content and match them with the most relevant URL from the provided list of internal candidates.

        **Internal Link Candidates (The Website's Other Pages):**
        ${internalLinkCandidates}

        **CRITICAL:** Your final output must be a single, perfectly structured JSON object adhering to the provided schema.
    `;
    
    if (config.provider === 'gemini') {
        const ai = new GoogleGenAI({ apiKey: config.apiKey });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: deepAnalysisSchema },
        });
        const result = JSON.parse(response.text.trim());
        return {
            topic: result.topic,
            titleGrade: result.titleAnalysis?.grade,
            titleFeedback: result.titleAnalysis?.feedback,
            descriptionGrade: result.descriptionAnalysis?.grade,
            descriptionFeedback: result.descriptionAnalysis?.feedback,
            readabilityGrade: result.readabilityAnalysis?.gradeLevel,
            readabilityFeedback: result.readabilityAnalysis?.feedback,
            aeoFeedback: result.aeoAnalysis?.feedback,
            internalLinkSuggestions: result.internalLinkAnalysis,
        };
    } else {
        const endpoint = providerApiEndpoints[config.provider];
        const result = await executeOpenAiCompatibleChat<any>(endpoint, config, prompt, JSON.stringify(deepAnalysisSchema));
            return {
            topic: result.topic,
            titleGrade: result.titleAnalysis?.grade,
            titleFeedback: result.titleAnalysis?.feedback,
            descriptionGrade: result.descriptionAnalysis?.grade,
            descriptionFeedback: result.descriptionAnalysis?.feedback,
            readabilityGrade: result.readabilityAnalysis?.gradeLevel,
            readabilityFeedback: result.readabilityAnalysis?.feedback,
            aeoFeedback: result.aeoAnalysis?.feedback,
            internalLinkSuggestions: result.internalLinkAnalysis,
        };
    }
};

/**
 * Generates SEO suggestions using a live call to the configured AI provider.
 */
const generateSeoSuggestions = async (
    pageData: SeoAnalysis,
    analysisResult: AnalysisResult,
    config: AiConfig,
    serpData: SerpResult[],
    targetLocation?: string
): Promise<RewriteSuggestion[]> => {
    
    const geoInstruction = targetLocation
    ? `An important business goal is to rank for the target location: "${targetLocation}". Where it makes sense and feels natural, subtly incorporate this location or local-intent keywords (e.g., 'services in ${targetLocation}', 'near you') into your suggestions to capture local search traffic. Do not force the location if it makes the copy awkward or irrelevant.`
    : `This is for a global audience; do not use location-specific terms.`;

    const competitorAnalysis = serpData.length > 0
        ? `
        **//-- CRUCIAL: Live SERP Competitive Intelligence --//**
        Here are the top-ranking competitors for the target topic. You MUST analyze their titles and descriptions to identify patterns, weaknesses, and opportunities for differentiation.

        ${serpData.map((result, i) => `
        - Competitor #${i + 1}:
          - Title: "${result.title}"
          - Description: "${result.description}"
        `).join('')}
        
        **//-- Strategic Analysis of Competitors --//**
        Based on the live SERP data, identify the dominant search intent. Note any recurring elements (like dates, numbers, brackets, or specific keywords like 'review' or 'guide'). Your suggestions MUST be strategically superior and designed to stand out from this specific competition.`
        : `**//-- No Competitor Data --//**
        No live competitor data was available. Proceed based on general SEO best practices.`;

    const prompt = `
        **//-- Persona --//**
        You are a 10X SEO SERP Strategist, an expert at winning the click on the search results page. Your analysis is guided by Google's Helpful Content Update and E-E-A-T principles. You don't just write copy; you reverse-engineer the SERP to engineer snippets that dominate the competition.

        **//-- Your Page's Context --//**
        - URL: ${pageData.url}
        - AI-Identified Core Topic: "${analysisResult.topic}"
        - Current Title: "${pageData.title}"
        - Current Description: "${pageData.description}"

        ${competitorAnalysis}

        **//-- Geo-Targeting Instructions --//**
        ${geoInstruction}

        **//-- Mission: Generate 3 Elite-Tier, Competitively-Aware Suggestions --//**
        Produce three distinct, world-class rewrite suggestions. Each suggestion must be a complete package: a new title, a new description, and an expert rationale that explicitly references how it improves upon the competition.

        **//-- The Unbreakable Rules of Engagement --//**
        For EACH of the 3 suggestions, you MUST adhere to the following:

        1.  **Title (STRICTLY under 60 characters):**
            -   **Beat The Competition:** Craft a title that is more compelling, more specific, or more helpful than the competitor titles provided.
            -   **Benefit-Driven:** Promise a clear, tangible benefit or answer.
        2.  **Description (STRICTLY under 155 characters):**
            -   **Answer Engine Optimization (AEO):** The first sentence must be a concise summary that could serve as a direct answer.
            -   **Signal Superior E-E-A-T:** Use language that builds more trust and authority than the competitors.
            -   **Compelling CTA:** End with a natural call-to-action that encourages the click.
        3.  **Rationale (1 sharp sentence):**
            -   Provide a high-level, strategic justification that directly addresses the competitive landscape. Example: "This angle stands out by using a specific number instead of a generic 'Top X' like the competitors."

        **//-- Final Command --//**
        Your output must be a single, perfectly structured JSON array of objects, adhering to the provided schema. There will be no text, conversation, or explanations outside of this JSON object. Execute.
    `;
    
    if (config.provider === 'gemini') {
        const ai = new GoogleGenAI({ apiKey: config.apiKey });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: suggestionSchema },
        });
        return JSON.parse(response.text.trim());
    } else {
            const endpoint = providerApiEndpoints[config.provider];
            return await executeOpenAiCompatibleChat<RewriteSuggestion[]>(endpoint, config, prompt, JSON.stringify(suggestionSchema));
    }
};


/**
 * NEW SOTA Orchestrator: Combines deep analysis, live SERP scraping, and suggestion generation
 * into a single, efficient operation. This is the primary function used by the load balancer.
 */
export const runFullAnalysisAndSuggestion = async (
    pageData: SeoAnalysis,
    config: AiConfig,
    context: { allPages: SeoData[] },
    targetLocation?: string
): Promise<{ analysis: AnalysisResult; suggestions: RewriteSuggestion[] }> => {
    try {
        // Step 1: Perform the deep SEO analysis to understand the page and its topic.
        const analysis = await analyzeSeo(pageData, config, context);

        // Step 2: Use the identified topic to fetch live, relevant competitor data.
        const serpData = await fetchSerpData(analysis.topic, targetLocation);

        // Step 3: Feed all context (original data, analysis, competitors) into the suggestion engine.
        const suggestions = await generateSeoSuggestions(pageData, analysis, config, serpData, targetLocation);
        
        if (!Array.isArray(suggestions) || suggestions.length === 0) {
            throw new Error("AI failed to return valid, non-empty suggestions in the expected format.");
        }

        return { analysis, suggestions };

    } catch (error) {
        const errorMessage = (error as Error).message;
        console.error(`Full analysis pipeline failed for ${pageData.url} with ${config.provider}:`, errorMessage);
        // Re-throw the error to be handled by the AILoadBalancer's retry/error logic.
        throw new Error(`AI processing failed: ${errorMessage}`);
    }
};
