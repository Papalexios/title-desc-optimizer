// The main data structure for a single crawled page.
export interface SeoData {
    url: string;
    title: string;
    description: string;
    content: string; // The main content of the page
}

// Represents the results of a fast, programmatic (non-AI) SEO check.
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
    linkType?: 'contextual' | 'navigational' | 'pillar';
}

// The complete, all-in-one data object for a page, including its analysis and rewrite suggestions.
export interface SeoAnalysis extends SeoData {
    status: 'discovered' | 'scanned' | 'analyzing' | 'analyzed' | 'updating' | 'synced' | 'error';
    issues: string[];
    quickScan?: QuickScanResult;
    grade?: number;
    titleGrade?: number;
    titleFeedback?: string;
    descriptionGrade?: number;
    descriptionFeedback?: string;
    readabilityGrade?: number;
    readabilityFeedback?: string;
    internalLinkSuggestions?: InternalLinkSuggestion[];
    suggestions?: RewriteSuggestion[];
    analysisError?: string;

    // SOTA fields from new aiService
    primaryTopic?: string;
    topic?: string; 
    semanticKeywords?: string[];
    searchIntent?: 'informational' | 'navigational' | 'transactional' | 'commercial';
    contentDepth?: {
        grade: number;
        wordCount: number;
        topicalCoverage: number;
        expertiseSignals?: string[];
        contentGaps?: string[];
    };
    featuredSnippetPotential?: {
        score: number;
        currentFormat?: string;
        recommendedFormat: string;
        optimizationSteps?: string[];
    };
    aeoOptimization?: {
        paaQuestions?: string[];
        voiceSearchOptimization?: string[];
        structuredDataSuggestions?: string[];
    };
    competitiveAdvantage?: {
        strengths?: string[];
        weaknesses?: string[];
        opportunities?: string[];
    };

    // New fields for prioritization and bulk review
    priorityScore?: number; // 0-100 score for prioritization
    pendingSuggestion?: RewriteSuggestion; // The top AI suggestion pending review
    semanticDiff?: string[]; // Explanation of why the new suggestion is better
}

// A single AI-generated rewrite suggestion.
export interface RewriteSuggestion {
    title: string;
    description: string;
    rationale: string;
    competitiveDifferentiator?: string;
    clickThroughOptimization?: {
        emotionalHooks?: string[];
        urgency?: boolean;
        specificity?: string;
    };
    expectedCtrLift?: string;
}

// Data structure for a live competitor result from a SERP scrape.
export interface SerpResult {
    title: string;
    url: string;
    description: string;
}

// NEW: Represents a semantic cluster of pages on the site.
export interface TopicCluster {
    topic: string;
    pages: SeoAnalysis[];
    pageCount: number;
    analyzedCount: number;
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
export type GradeFilter = 'all' | 'good' | 'average' | 'poor' | 'no_grade';