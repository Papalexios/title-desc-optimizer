import { GoogleGenAI, Type } from "@google/genai";
import { RewriteSuggestion, AiConfig, AiProvider, SeoAnalysis, SeoData, InternalLinkSuggestion, SerpResult } from '../types';
import { robustFetch } from './fetchService';

export class RateLimitError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'RateLimitError';
    }
}

// Helper to safely parse JSON from LLM output, handling markdown fences
function safeJsonParse<T>(text: string): T {
    try {
        let clean = text.trim();
        // Remove markdown code blocks if present (common with Gemini/GPT)
        clean = clean.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
        return JSON.parse(clean);
    } catch (e) {
        console.error("JSON Parse Error. Raw Text:", text);
        throw new Error("Failed to parse AI response as JSON.");
    }
}

const topicExtractionSchema = {
    type: Type.OBJECT,
    properties: {
        primaryTopic: {
            type: Type.STRING,
            description: 'The single most specific primary keyword phrase or topic for this content. Be concise (2-5 words).'
        }
    },
    required: ["primaryTopic"]
};

const priorityScoreSchema = {
    type: Type.OBJECT,
    properties: {
        priorityScore: {
            type: Type.INTEGER,
            description: 'The calculated priority score from 0 to 100.'
        }
    },
    required: ["priorityScore"]
};

const semanticDiffSchema = {
    type: Type.OBJECT,
    properties: {
        improvements: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'A bulleted list of 2-4 key strategic improvements in the new version.'
        }
    },
    required: ["improvements"]
};

const ultraDeepAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        primaryTopic: { type: Type.STRING, description: 'The main topic/primary keyword phrase, inferred from content.' },
        semanticKeywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'LSI and semantically related keywords found in the content (10-15 keywords).' },
        searchIntent: { type: Type.STRING, description: "The primary search intent this content serves. Must be one of: 'informational', 'navigational', 'transactional', 'commercial'." },
        titleAnalysis: { type: Type.OBJECT, properties: { grade: { type: Type.INTEGER, description: 'SEO score 0-100' }, feedback: { type: Type.STRING, description: '2-3 sentence actionable feedback' } }, required: ["grade", "feedback"] },
        descriptionAnalysis: { type: Type.OBJECT, properties: { grade: { type: Type.INTEGER, description: 'SEO score 0-100' }, feedback: { type: Type.STRING, description: '2-3 sentence actionable feedback' } }, required: ["grade", "feedback"] },
        contentDepth: { type: Type.OBJECT, properties: { grade: { type: Type.INTEGER, description: 'Content depth score 0-100' }, wordCount: { type: Type.INTEGER }, topicalCoverage: { type: Type.NUMBER, description: 'Percentage of expected subtopics covered (0-100)' }, expertiseSignals: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'E-E-A-T signals detected' }, contentGaps: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Missing subtopics that competitors cover' } }, required: ["grade", "wordCount", "topicalCoverage"] },
        readabilityAnalysis: { type: Type.OBJECT, properties: { grade: { type: Type.INTEGER, description: 'Readability score 0-100' }, feedback: { type: Type.STRING, description: 'Actionable readability feedback' } }, required: ["grade", "feedback"] },
        featuredSnippetPotential: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER, description: 'Likelihood of winning featured snippet 0-100' }, recommendedFormat: { type: Type.STRING, description: "Optimal format. Must be one of: 'paragraph', 'list', 'table', 'faq'." }, optimizationSteps: { type: Type.ARRAY, items: { type: Type.STRING }, description: '3-5 specific steps to win the snippet' } }, required: ["score", "recommendedFormat"] },
        aeoOptimization: { type: Type.OBJECT, properties: { paaQuestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Relevant "People Also Ask" questions to answer' }, voiceSearchOptimization: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Voice search query formats to target' }, structuredDataSuggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Schema markup types to implement' } } },
        internalLinkingAnalysis: { type: Type.ARRAY, description: 'Up to 3 strategic internal link suggestions.', items: { type: Type.OBJECT, properties: { anchorText: { type: Type.STRING }, targetUrl: { type: Type.STRING }, rationale: { type: Type.STRING }, linkType: { type: Type.STRING, description: "Must be one of: 'contextual', 'navigational', 'pillar'." } }, required: ["anchorText", "targetUrl", "rationale", "linkType"] } },
        competitiveAdvantage: { type: Type.OBJECT, properties: { strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'What this page does better than competitors' }, weaknesses: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Where competitors have an edge' }, opportunities: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Untapped ranking opportunities' } } }
    },
    required: ["primaryTopic", "searchIntent", "titleAnalysis", "descriptionAnalysis", "contentDepth", "readabilityAnalysis", "featuredSnippetPotential"]
};

// CRITICAL FIX: Wrapped in Object to prevent "Invalid Schema" errors with Gemini
const ultraSuggestionSchema = {
    type: Type.OBJECT,
    properties: {
        suggestions: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: 'SEO-optimized meta title under 60 chars' },
                    description: { type: Type.STRING, description: 'Compelling meta description under 160 chars' },
                    rationale: { type: Type.STRING, description: '2-3 sentence strategic explanation' },
                    competitiveDifferentiator: { type: Type.STRING, description: 'How this beats competitor titles/descriptions' },
                    clickThroughOptimization: { type: Type.OBJECT, properties: { emotionalHooks: { type: Type.ARRAY, items: { type: Type.STRING } }, urgency: { type: Type.BOOLEAN }, specificity: { type: Type.STRING } } },
                    expectedCtrLift: { type: Type.STRING, description: 'Estimated CTR improvement (e.g., "+15-25%")' }
                },
                required: ["title", "description", "rationale", "competitiveDifferentiator", "expectedCtrLift"]
            }
        }
    }
};

const providerApiEndpoints: Record<Exclude<AiProvider, 'gemini'>, string> = {
    openai: 'https://api.openai.com/v1/chat/completions',
    openrouter: 'https://openrouter.ai/api/v1/chat/completions',
    groq: 'https://api.groq.com/openai/v1/chat/completions',
};

async function executeOpenAiCompatibleRequest<T>(endpoint: string, config: AiConfig, systemPrompt: string, userPrompt: string, temperature: number): Promise<T> {
    const model = config.model || (config.provider === 'openai' ? 'gpt-4o-mini' : 'llama-3.1-8b-instant');
    const response = await robustFetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
            model: model,
            temperature,
            response_format: { type: "json_object" },
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }]
        })
    });
    if (response.status === 429) throw new RateLimitError(`Rate limit hit for ${config.provider}`);
    const data = await response.json();
    return safeJsonParse(data.choices[0].message.content);
}

export const validateApiKey = async (config: AiConfig): Promise<boolean> => {
    if (!config.apiKey) return false;
    try {
        if (config.provider === 'gemini') {
            const geminiAi = new GoogleGenAI({ apiKey: config.apiKey });
            await geminiAi.models.generateContent({ model: "gemini-2.5-flash", contents: "test", config: { thinkingConfig: { thinkingBudget: 0 } } });
        } else {
            await executeOpenAiCompatibleRequest(providerApiEndpoints[config.provider], config, "test", "test", 0.1);
        }
        return true;
    } catch (error) {
        console.error(`API Key validation failed for ${config.provider}:`, (error as Error).message);
        return false;
    }
};

export const extractTopicsForClustering = async (pages: SeoAnalysis[], config: AiConfig, onProgress: (completed: number, total: number) => void): Promise<Map<string, string>> => {
    const topicMap = new Map<string, string>();
    const systemPrompt = "You are an efficient SEO topic extractor. Your only job is to identify the primary keyword topic of the given content. Respond in JSON.";
    
    const processPage = async (page: SeoAnalysis) => {
        try {
            const userPrompt = `Analyze the following page content and identify its primary topic.\nURL: ${page.url}\nTitle: "${page.title}"\nContent Preview:\n${page.content.substring(0, 8000)}...`;
            if (config.provider === 'gemini') {
                const ai = new GoogleGenAI({ apiKey: config.apiKey });
                const response = await ai.models.generateContent({
                    model: "gemini-2.5-flash", contents: userPrompt,
                    config: { systemInstruction: systemPrompt, responseMimeType: "application/json", responseSchema: topicExtractionSchema, temperature: 0.0, thinkingConfig: { thinkingBudget: 0 } },
                });
                topicMap.set(page.url, safeJsonParse<{primaryTopic: string}>(response.text).primaryTopic || 'Uncategorized');
            } else {
                const result = await executeOpenAiCompatibleRequest<{primaryTopic: string}>(providerApiEndpoints[config.provider], config, systemPrompt, userPrompt, 0.0);
                topicMap.set(page.url, result.primaryTopic || 'Uncategorized');
            }
        } catch (e) {
            console.error(`Topic extraction failed for ${page.url}`, e);
            topicMap.set(page.url, 'Uncategorized');
        }
    };
    
    let completed = 0;
    const queue = [...pages];
    await Promise.all(Array(10).fill(null).map(async () => {
        while (queue.length > 0) {
            await processPage(queue.shift()!);
            completed++;
            onProgress(completed, pages.length);
        }
    }));
    return topicMap;
};

export const calculatePriorityScore = async (pages: SeoAnalysis[], config: AiConfig, onProgress: (completed: number, total: number) => void): Promise<Map<string, number>> => {
    const scoreMap = new Map<string, number>();
    const systemPrompt = "You are an SEO Prioritization expert. Your job is to calculate a 'Priority Score' from 0-100. A high score means fixing this page will likely have a high impact on organic traffic. Prioritize low-hanging fruit (poor grade but easy fixes) and high-potential pages. Respond only in JSON.";

    const processPage = async (page: SeoAnalysis) => {
        const userPrompt = `Calculate a priority score for the following page.\n- Current Overall SEO Grade: ${page.grade}\n- Title Grade: ${page.titleGrade}\n- Description Grade: ${page.descriptionGrade}\n- Content Issues: ${page.issues.join(', ') || 'None'}\n- Snippet Potential Score: ${page.featuredSnippetPotential?.score || 'N/A'}`;
        try {
             if (config.provider === 'gemini') {
                const ai = new GoogleGenAI({ apiKey: config.apiKey });
                const response = await ai.models.generateContent({
                    model: "gemini-2.5-flash", contents: userPrompt,
                    config: { systemInstruction: systemPrompt, responseMimeType: "application/json", responseSchema: priorityScoreSchema, temperature: 0.1, thinkingConfig: { thinkingBudget: 0 } },
                });
                scoreMap.set(page.url, safeJsonParse<{priorityScore: number}>(response.text).priorityScore || 0);
            } else {
                const result = await executeOpenAiCompatibleRequest<{priorityScore: number}>(providerApiEndpoints[config.provider], config, systemPrompt, userPrompt, 0.1);
                scoreMap.set(page.url, result.priorityScore || 0);
            }
        } catch (e) {
             console.error(`Priority score calculation failed for ${page.url}`, e);
            scoreMap.set(page.url, 0);
        }
    };
    
    let completed = 0;
    const queue = [...pages];
    await Promise.all(Array(10).fill(null).map(async () => {
        while (queue.length > 0) {
            await processPage(queue.shift()!);
            completed++;
            onProgress(completed, pages.length);
        }
    }));

    return scoreMap;
};

export const getSemanticDiff = async (
    original: { title: string; description: string },
    suggestion: { title: string; description: string },
    config: AiConfig
): Promise<string[]> => {
    const systemPrompt = "You are an SEO Analyst. Your job is to concisely explain the strategic improvements of a new meta title/description pair compared to the original. Focus on SEO value. Respond in JSON.";
    const userPrompt = `Compare the two versions and list the key improvements.\n\n**Original:**\nTitle: "${original.title}"\nDescription: "${original.description}"\n\n**New Suggestion:**\nTitle: "${suggestion.title}"\nDescription: "${suggestion.description}"`;

    try {
        if (config.provider === 'gemini') {
            const ai = new GoogleGenAI({ apiKey: config.apiKey });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash", contents: userPrompt,
                config: { systemInstruction: systemPrompt, responseMimeType: "application/json", responseSchema: semanticDiffSchema, temperature: 0.2, thinkingConfig: { thinkingBudget: 0 } },
            });
            return safeJsonParse<{improvements: string[]}>(response.text).improvements || ["Could not determine difference."];
        } else {
             const result = await executeOpenAiCompatibleRequest<{improvements: string[]}>(providerApiEndpoints[config.provider], config, systemPrompt, userPrompt, 0.2);
            return result.improvements || ["Could not determine difference."];
        }
    } catch (e) {
        console.error(`Semantic diff failed`, e);
        return ["AI analysis of the difference failed."];
    }
};

export const detectContentCannibalization = (clusters: Map<string, SeoAnalysis[]>): Map<string, SeoAnalysis[]> => {
    const issues = new Map<string, SeoAnalysis[]>();
    clusters.forEach((pages, topic) => {
        if (pages.length > 1 && topic !== 'Uncategorized') {
            issues.set(topic, pages);
        }
    });
    return issues;
}

export type AnalysisResult = { 
    primaryTopic: string;
    semanticKeywords?: string[];
    searchIntent?: 'informational' | 'navigational' | 'transactional' | 'commercial';
    titleGrade: number;
    titleFeedback: string;
    descriptionGrade: number;
    descriptionFeedback: string;
    contentDepth?: any;
    readabilityGrade?: number;
    readabilityFeedback?: string;
    featuredSnippetPotential?: any;
    aeoOptimization?: any;
    internalLinkSuggestions?: InternalLinkSuggestion[];
    competitiveAdvantage?: any;
};

const analyzeSeoUltraDeep = async (pageData: SeoAnalysis, config: AiConfig, context: { allPages: SeoData[], topicCluster?: { url: string, title: string, intent?: string }[] }, serpData: SerpResult[]): Promise<AnalysisResult> => {
    const systemPrompt = "You are an ELITE SEO STRATEGIST & SERP PSYCHOLOGIST specializing in Answer Engine Optimization (AEO) and GEO (Generative Engine Optimization). Your analysis is deeply strategic, focusing on semantic SEO, user intent, and competitive differentiation to achieve #1 rankings and Featured Snippets.";
    const competitorIntel = serpData.length > 0 ? `\n\n**🎯 LIVE SERP COMPETITOR INTELLIGENCE (Top ${serpData.length} Results):**\n${serpData.map((result, i) => `- Competitor #${i + 1}: Title: "${result.title}", URL: ${result.url}`).join('\n')}` : '\n\n**⚠️ NO LIVE SERP DATA AVAILABLE**';
    
    // SOTA: Graph RAG Context Injection
    const topicClusterContext = context.topicCluster && context.topicCluster.length > 0 
        ? `\n\n## 🕸️ INTERNAL LINKING OPPORTUNITIES (GRAPH RAG)
           The following pages exist in this site's Knowledge Graph (Topic Cluster). 
           Select the best 2-3 pages to link TO from the current page to boost Topical Authority:
           ${context.topicCluster.filter(p => p.url !== pageData.url).map(p => `- [${p.intent || 'Content'}] ${p.title} (${p.url})`).join('\n')}` 
        : '';

    const analysisPrompt = `Analyze the SEO of this page with extreme depth.\n\n**PAGE DATA:**\n- URL: ${pageData.url}\n- Title: "${pageData.title}"\n- Description: "${pageData.description}"\n- Content Snippet (first 20k chars):\n\`\`\`\n${pageData.content.substring(0, 20000)}\n\`\`\`\n${competitorIntel}${topicClusterContext}\n\nYour response MUST be a single, perfectly formatted JSON object.`;

    if (config.provider === 'gemini') {
        const ai = new GoogleGenAI({ apiKey: config.apiKey });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", contents: analysisPrompt,
            config: { systemInstruction: systemPrompt, responseMimeType: "application/json", responseSchema: ultraDeepAnalysisSchema, temperature: 0.3 },
        });
        const result = safeJsonParse<any>(response.text);
        return { ...result, titleGrade: result.titleAnalysis?.grade, titleFeedback: result.titleAnalysis?.feedback, descriptionGrade: result.descriptionAnalysis?.grade, descriptionFeedback: result.descriptionAnalysis?.feedback, readabilityGrade: result.readabilityAnalysis?.grade, readabilityFeedback: result.readabilityAnalysis?.feedback, internalLinkSuggestions: result.internalLinkingAnalysis };
    } else {
        const result = await executeOpenAiCompatibleRequest<any>(providerApiEndpoints[config.provider], config, systemPrompt, analysisPrompt, 0.3);
        return { ...result, titleGrade: result.titleAnalysis?.grade, titleFeedback: result.titleAnalysis?.feedback, descriptionGrade: result.descriptionAnalysis?.grade, descriptionFeedback: result.descriptionAnalysis?.feedback, readabilityGrade: result.readabilityAnalysis?.grade, readabilityFeedback: result.readabilityAnalysis?.feedback, internalLinkSuggestions: result.internalLinkingAnalysis };
    }
};

// --- SOTA: Reflexion Validation Helper ---
function validateSuggestion(suggestion: RewriteSuggestion): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    if (suggestion.title.length > 60) issues.push(`Title is ${suggestion.title.length} chars (max 60).`);
    if (suggestion.description.length > 160) issues.push(`Description is ${suggestion.description.length} chars (max 160).`);
    // Basic checks to ensure fields are present
    if (!suggestion.rationale) issues.push("Missing rationale.");
    return { valid: issues.length === 0, issues };
}

// --- SOTA: Fallback mechanism ---
function generateFallbackSuggestions(pageData: SeoAnalysis): RewriteSuggestion[] {
    return [{
        title: pageData.title.substring(0, 60),
        description: pageData.description.substring(0, 160),
        rationale: "Fallback suggestion: truncated original content to meet length constraints due to AI processing error.",
        competitiveDifferentiator: "Standard optimization.",
        expectedCtrLift: "+0% (Fallback)"
    }];
}

const generateUltraSeoSuggestions = async (pageData: SeoAnalysis, analysisResult: AnalysisResult, config: AiConfig, serpData: SerpResult[], targetLocation?: string): Promise<RewriteSuggestion[]> => {
    // --- SOTA: REFLEXION LOOP (Self-Correcting Agent) ---
    const MAX_REFLEXION_ATTEMPTS = 3;
    let attempts = 0;
    let currentFeedback = "";

    const systemPrompt = "You are a WORLD-CLASS SERP STRATEGIST & COPYWRITER. Your mission is to write meta tags that are not just optimized, but psychologically compelling to maximize CTR and dominate search results (GEO/AEO optimized). Strict constraints: Title < 60 chars. Description < 160 chars.";
    const geoInstruction = targetLocation ? `🎯 **GEO-TARGETING:** All suggestions must be tailored for an audience in "${targetLocation}".` : `🌍 **GLOBAL AUDIENCE:** Suggestions should have broad appeal.`;
    const competitorBriefing = serpData.length > 0 ? `## 🔥 LIVE SERP BATTLEFIELD INTELLIGENCE\nYou must write titles/descriptions that are SUPERIOR to these top competitors:\n${serpData.map(r => `- Competitor Title: "${r.title}"`).join('\n')}` : `## ⚠️ NO SERP DATA\nProceed with best-practice copywriting.`;
    
    while (attempts < MAX_REFLEXION_ATTEMPTS) {
        let suggestionPrompt = `Based on the provided SEO analysis, create 3 SERP-DOMINATING meta tag variations.\n\n${geoInstruction}\n\n**AI ANALYSIS SUMMARY:**\n- Primary Topic: ${analysisResult.primaryTopic}\n- Search Intent: ${analysisResult.searchIntent}\n- Title Feedback: ${analysisResult.titleFeedback}\n- Description Feedback: ${analysisResult.descriptionFeedback}\n- Key Competitive Weakness to Exploit: ${analysisResult.competitiveAdvantage?.weaknesses?.[0] || 'N/A'}\n\n${competitorBriefing}\n\n**PAGE DATA:**\n- URL: ${pageData.url}\n- Original Title: "${pageData.title}"\n- Original Description: "${pageData.description}"`;
        
        // --- INJECT FEEDBACK from previous failed attempt ---
        if (currentFeedback) {
            suggestionPrompt += `\n\n⚠️ PREVIOUS ATTEMPT REJECTED. YOU MUST FIX THESE SPECIFIC ERRORS:\n${currentFeedback}\n\nReview your character counts carefully before outputting.`;
        }

        suggestionPrompt += `\nYour response MUST be a single, perfectly formatted JSON object containing a 'suggestions' array.`;

        try {
            let result: { suggestions: RewriteSuggestion[] };
            
            if (config.provider === 'gemini') {
                const ai = new GoogleGenAI({ apiKey: config.apiKey });
                const response = await ai.models.generateContent({
                    model: "gemini-2.5-flash", contents: suggestionPrompt,
                    config: { systemInstruction: systemPrompt, responseMimeType: "application/json", responseSchema: ultraSuggestionSchema, temperature: 0.7 },
                });
                result = safeJsonParse<{suggestions: RewriteSuggestion[]}>(response.text);
            } else {
                result = await executeOpenAiCompatibleRequest<{suggestions: RewriteSuggestion[]}>(providerApiEndpoints[config.provider], config, systemPrompt, suggestionPrompt, 0.7);
            }

            // --- CRITIC PASS (Validation) ---
            const validatedSuggestions = result.suggestions.map(s => {
                const check = validateSuggestion(s);
                return { ...s, _valid: check.valid, _issues: check.issues };
            });

            const invalidOnes = validatedSuggestions.filter(s => !s._valid);

            if (invalidOnes.length === 0) {
                return result.suggestions; // SUCCESS! All valid.
            }

            // --- Feedback Generation ---
            currentFeedback = invalidOnes.map(s => `Title "${s.title}" failed: ${s._issues.join(', ')}`).join('\n');
            console.warn(`[Reflexion] Attempt ${attempts + 1} failed for ${pageData.url}. Issues:\n${currentFeedback}`);
            attempts++;

        } catch (e) {
            console.warn(`[Reflexion] AI generation/parsing error attempt ${attempts + 1}:`, e);
            currentFeedback = `JSON Parsing Error or API Failure: ${(e as Error).message}. Ensure valid JSON format.`;
            attempts++;
        }
    }

    console.error(`[Reflexion] Failed after ${MAX_REFLEXION_ATTEMPTS} attempts. Returning fallback.`);
    return generateFallbackSuggestions(pageData);
};

export const runFullAnalysisAndSuggestion = async (pageData: SeoAnalysis, config: AiConfig, context: { allPages: SeoData[]; topicCluster?: { url: string; title: string; intent?: string }[] }, serpData: SerpResult[], targetLocation?: string): Promise<{ analysis: AnalysisResult; suggestions: RewriteSuggestion[] }> => {
    try {
        const analysis = await analyzeSeoUltraDeep(pageData, config, context, serpData);
        // Optimization: Removed artificial delay. We are now using batched updates in App.tsx
        // await new Promise(r => setTimeout(r, 50)); 
        const suggestions = await generateUltraSeoSuggestions(pageData, analysis, config, serpData, targetLocation);
        
        if (!Array.isArray(suggestions) || suggestions.length === 0) throw new Error("AI returned empty suggestions.");
        
        const analysisForState: any = { ...analysis, topic: analysis.primaryTopic };
        delete analysisForState.primaryTopic;
        return { analysis: analysisForState, suggestions };
    } catch (error) {
        const errorMessage = (error as Error).message;
        console.error(`[SOTA] Pipeline failed for ${pageData.url}:`, errorMessage);
        throw new Error(`AI processing failed: ${errorMessage}`);
    }
};