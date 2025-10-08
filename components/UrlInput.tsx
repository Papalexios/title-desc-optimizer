import React, { useState } from 'react';
import { Spinner } from './common/Spinner';

interface UrlInputProps {
    onAnalyze: (url: string, sitemapUrl?: string, targetLocation?: string) => void;
    isLoading: boolean;
    isApiConfigured: boolean;
}

const ArrowRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);

export const UrlInput: React.FC<UrlInputProps> = ({ onAnalyze: onCrawl, isLoading, isApiConfigured }) => {
    const [url, setUrl] = useState('https://example.com');
    const [sitemapUrl, setSitemapUrl] = useState('');
    const [targetLocation, setTargetLocation] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (url && !isLoading && isApiConfigured) {
            onCrawl(url, sitemapUrl || undefined, targetLocation || undefined);
        }
    };

    return (
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 shadow-lg mt-6">
            <h2 className="text-xl font-semibold text-center mb-4 text-slate-200">Start Your SEO Audit</h2>
            <p className="text-center text-slate-400 mb-6">Enter your site URL. The crawler will attempt to find and process your entire sitemap.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://your-wordpress-site.com"
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow text-white"
                            disabled={isLoading}
                            aria-label="Main site URL"
                        />
                    </div>
                     <div className="md:col-span-1">
                         <input
                            type="text"
                            value={targetLocation}
                            onChange={(e) => setTargetLocation(e.target.value)}
                            placeholder="Target Location (e.g., London)"
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow text-white"
                            disabled={isLoading}
                            aria-label="Target Location (optional)"
                        />
                    </div>
                </div>
                 <input
                    type="text"
                    value={sitemapUrl}
                    onChange={(e) => setSitemapUrl(e.target.value)}
                    placeholder="Sitemap URL (optional, if auto-discovery fails)"
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow text-white"
                    disabled={isLoading}
                    aria-label="Sitemap URL (optional)"
                />
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={isLoading || !url || !isApiConfigured}
                        className="flex items-center justify-center px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-900 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors duration-200"
                        title={!isApiConfigured ? 'Please configure your API key first' : 'Crawl your website'}
                    >
                        {isLoading ? <Spinner /> : 'Crawl Site'}
                        {!isLoading && <ArrowRightIcon />}
                    </button>
                </div>
            </form>
        </div>
    );
};
