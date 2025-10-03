export interface SeoData {
    url: string;
    title: string;
    description: string;
}

export interface SeoAnalysis extends SeoData {
    grade?: number; // Overall grade
    titleGrade?: number;
    titleFeedback?: string;
    descriptionGrade?: number;
    descriptionFeedback?: string;
    topic?: string;
}

export interface RewriteSuggestion {
    title: string;
    description: string;
    rationale: string;
}

export enum AppState {
    Initial = 'INITIAL',
    AwaitingWpCreds = 'AWAITING_WP_CREDS',
    Crawling = 'CRAWLING',
    Crawled = 'CRAWLED',
    Analyzing = 'ANALYZING',
    Analyzed = 'ANALYZED', // Note: This state is being repurposed/phased out for 'Crawled'
    Rewriting = 'REWRITING',
    UpdatingWp = 'UPDATING_WP',
    Error = 'ERROR',
}

export type AiProvider = 'gemini' | 'openai' | 'openrouter' | 'groq';

export interface AiConfig {
    provider: AiProvider;
    apiKey: string;
    model?: string; // Optional, for OpenRouter/Groq
}

export interface WordPressCreds {
    siteUrl: string;
    username: string;
    appPassword: string;
}

export type GradeFilter = 'all' | 'good' | 'average' | 'poor';