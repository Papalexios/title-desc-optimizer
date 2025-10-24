// The main data structure for a single crawled page.
export interface SeoData {
    url: string;
    title: string;
    description: string;
    content: string; // The main content of the page
}

// NEW: Represents the results of a fast, programmatic (non-AI) SEO check.
export interface QuickScanResult {
    isTitleMissing: boolean;
    isTitleTooLong: boolean;
    isTitleTooShort: boolean;
    isDescriptionMissing: boolean;
    isDescriptionTooLong: boolean;
    isDescriptionTooShort: boolean;
    isTitleDuplicate: boolean;
    isDescriptionDuplicate: boolean;
}

// Represents a strategic suggestion for an internal link.
export interface InternalLinkSuggestion {
    anchorText: string;
    targetUrl: string;
    rationale: string;
}

// The complete, all-in-one data object for a page, including its analysis and rewrite suggestions.
export interface SeoAnalysis extends SeoData {
    // Per-URL status tracking for a more granular and clear UI.
    status: 'crawled' | 'scanned' | 'analyzing' | 'analyzed' | 'updating' | 'synced' | 'error';
    
    // NEW: A list of specific issues found during the programmatic "Quick Scan".
    issues: string[];

    // NEW: Detailed results from the quick scan.
    quickScan?: QuickScanResult;
    
    // Core SEO analysis results from the AI.
    grade?: number; // Overall grade
    titleGrade?: number;
    titleFeedback?: string;
    descriptionGrade?: number;
    descriptionFeedback?: string;
    topic?: string;

    // Deep content analysis fields from the AI.
    readabilityGrade?: number;
    readabilityFeedback?: string;
    aeoFeedback?: string[];
    internalLinkSuggestions?: InternalLinkSuggestion[];
    
    // AI-generated rewrite suggestions are now stored directly with the page data.
    suggestions?: RewriteSuggestion[];
    
    // Field to store any errors that occur during analysis for a specific URL.
    analysisError?: string;
}

// A single AI-generated rewrite suggestion.
export interface RewriteSuggestion {
    title: string;
    description: string;
    rationale: string;
}

// Data structure for a live competitor result from a SERP scrape.
export interface SerpResult {
    title: string;
    url: string;
    description: string;
}

// Defines the supported AI providers.
export type AiProvider = 'gemini' | 'openai' | 'openrouter' | 'groq';

// Configuration for a single AI provider API key.
export interface AiConfig {
    id: string; // Unique ID for list management
    provider: AiProvider;
    apiKey: string;
    model?: string; // Optional, for OpenRouter/Groq
    isValid: boolean | null; // null = untested, true = valid, false = invalid
}

// Credentials for updating a WordPress site.
export interface WordPressCreds {
    siteUrl: string;
    username: string;
    appPassword: string;
}

// Filter types for the data table.
export type GradeFilter = 'all' | 'good' | 'average' | 'poor';
