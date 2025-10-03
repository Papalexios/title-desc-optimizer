import { GoogleGenAI, Type } from "@google/genai";
import { RewriteSuggestion } from '../types';

// Ensure you have your API key in the environment variables
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const analysisSchema = {
    type: Type.OBJECT,
    properties: {
        titleAnalysis: {
            type: Type.OBJECT,
            properties: {
                grade: {
                    type: Type.INTEGER,
                    description: 'SEO score for the title (0-100).'
                },
                feedback: {
                    type: Type.STRING,
                    description: 'Concise, actionable feedback for the title (1-2 sentences).'
                }
            },
            required: ["grade", "feedback"]
        },
        descriptionAnalysis: {
            type: Type.OBJECT,
            properties: {
                grade: {
                    type: Type.INTEGER,
                    description: 'SEO score for the description (0-100).'
                },
                feedback: {
                    type: Type.STRING,
                    description: 'Concise, actionable feedback for the description (1-2 sentences).'
                }
            },
            required: ["grade", "feedback"]
        }
    },
    required: ["titleAnalysis", "descriptionAnalysis"]
};


export const analyzeSeo = async (title: string, description: string): Promise<{ titleGrade: number, titleFeedback: string, descriptionGrade: number, descriptionFeedback: string }> => {
    try {
        const prompt = `
            As a world-class SEO strategist, conduct a detailed analysis of the following webpage meta elements.

            Meta Title: "${title}"
            Meta Description: "${description}"

            Instructions:
            1.  **Analyze Title:** Grade the title from 0-100 based on length (ideally 50-60 chars), keyword presence, clarity, and click-worthiness. Provide concise, expert feedback (1-2 sentences) for improvement.
            2.  **Analyze Description:** Grade the description from 0-100 based on length (ideally 120-155 chars), call-to-action, keyword usage, and how well it summarizes the content. Provide concise, expert feedback (1-2 sentences).
            
            Return your analysis in a structured JSON format.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: analysisSchema,
            },
        });
        
        const jsonString = response.text.trim();
        const result = JSON.parse(jsonString);

        return {
            titleGrade: result.titleAnalysis?.grade || 0,
            titleFeedback: result.titleAnalysis?.feedback || 'No feedback provided.',
            descriptionGrade: result.descriptionAnalysis?.grade || 0,
            descriptionFeedback: result.descriptionAnalysis?.feedback || 'No feedback provided.'
        };

    } catch (error) {
        console.error("Error analyzing SEO with Gemini:", error);
        // Return a default error state
        return {
            titleGrade: 0,
            titleFeedback: 'Could not analyze title due to an API error.',
            descriptionGrade: 0,
            descriptionFeedback: 'Could not analyze description due to an API error.'
        };
    }
};

const suggestionSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            title: {
                type: Type.STRING,
                description: 'A new, SEO-optimized meta title.'
            },
            description: {
                type: Type.STRING,
                description: 'A new, compelling meta description.'
            }
        },
        required: ["title", "description"]
    }
};

export const generateSeoSuggestions = async (oldTitle: string, oldDescription: string, url: string): Promise<RewriteSuggestion[]> => {
    try {
        const prompt = `
            Act as a world-class SEO copywriter. I need to improve the meta title and description for a webpage to maximize organic traffic and click-through rate.

            The webpage URL is: ${url}
            The current title is: "${oldTitle}"
            The current description is: "${oldDescription}"

            Generate 3 unique, creative, and highly-optimized suggestions for a new meta title and meta description.
            The title should be under 60 characters.
            The description should be under 155 characters.
            Focus on user intent, clarity, and including relevant keywords naturally.
            Your response must be a JSON array of objects.
        `;
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: suggestionSchema,
            },
        });

        const jsonString = response.text.trim();
        const result = JSON.parse(jsonString);

        if (Array.isArray(result) && result.length > 0) {
            return result;
        }
        return [];

    } catch (error) {
        console.error("Error generating SEO suggestions with Gemini:", error);
        throw new Error("Failed to generate suggestions from AI.");
    }
};