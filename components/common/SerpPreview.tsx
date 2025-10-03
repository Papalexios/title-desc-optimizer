import React from 'react';

interface SerpPreviewProps {
    url: string;
    title: string;
    description: string;
}

/**
 * A component that visually simulates how a title and description would appear in Google Search Results.
 */
export const SerpPreview: React.FC<SerpPreviewProps> = ({ url, title, description }) => {
    
    // Formats the URL into a breadcrumb-style display for the preview.
    const formatDisplayUrl = (fullUrl: string) => {
        try {
            const urlObj = new URL(fullUrl);
            const pathParts = urlObj.pathname.split('/').filter(part => part && part.trim() !== '');
            let displayUrl = urlObj.hostname.replace(/^www\./, '');
            if (pathParts.length > 0) {
                displayUrl += ` › ${pathParts.join(' › ')}`;
            }
            return displayUrl;
        } catch (e) {
            // Fallback for invalid URLs
            return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
        }
    };

    return (
        <div className="p-4 font-sans text-left">
            {/* URL Display */}
            <div className="text-sm text-gray-700 dark:text-slate-400 truncate">
                {formatDisplayUrl(url)}
            </div>
            
            {/* Clickable Title */}
            <h3 className="text-lg text-blue-700 dark:text-blue-400 font-medium hover:underline cursor-pointer truncate mt-1">
                {title || "Your SEO Title Will Appear Here"}
            </h3>
            
            {/* Meta Description */}
            <p className="text-sm text-gray-600 dark:text-slate-300 line-clamp-2 mt-1">
                {description || "This preview shows how your meta description will look in search results. Make it descriptive and engaging to attract more clicks."}
            </p>
        </div>
    );
};
