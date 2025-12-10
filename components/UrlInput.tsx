import React, { useState, useCallback } from 'react';
import { Spinner } from './common/Spinner';

interface UrlInputProps {
    onCrawl: (url: string, sitemapUrl?: string, targetLocation?: string) => void;
    onProcessFile: (file: File, targetLocation?: string) => void;
    isLoading: boolean;
    isApiConfigured: boolean;
}

const GlobeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h1a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.884 11.536l.272 1.945M16.116 11.536l-.272 1.945M12 21a9 9 0 100-18 9 9 0 000 18z" /></svg>;
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;
const ArrowRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>;

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => {
    return (
        <button
            onClick={onClick}
            className={`flex items-center justify-center px-4 py-4 text-sm font-bold w-1/2 transition-all duration-300 focus:outline-none ${
                active
                    ? 'text-indigo-300 bg-slate-800/50 border-b-2 border-indigo-500 shadow-inner'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 border-b-2 border-transparent'
            }`}
        >
            {children}
        </button>
    );
};

export const UrlInput: React.FC<UrlInputProps> = ({ onCrawl, onProcessFile, isLoading, isApiConfigured }) => {
    const [activeTab, setActiveTab] = useState<'crawl' | 'upload'>('crawl');
    
    // State for Crawl Tab
    const [url, setUrl] = useState('https://plantastichaven.com/');
    const [sitemapUrl, setSitemapUrl] = useState('');
    
    // State for Upload Tab
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    
    // Shared State
    const [targetLocation, setTargetLocation] = useState('');

    const handleCrawlSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (url && !isLoading && isApiConfigured) {
            onCrawl(url, sitemapUrl || undefined, targetLocation || undefined);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleProcessFileSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedFile && !isLoading && isApiConfigured) {
            onProcessFile(selectedFile, targetLocation || undefined);
        }
    };
    
    const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setSelectedFile(e.dataTransfer.files[0]);
        }
    }, []);


    return (
        <div className="mt-12 mb-16 relative">
            {/* Hero Text */}
            <div className="text-center mb-10 space-y-4">
                <h2 className="text-5xl font-extrabold text-white tracking-tight">
                    Serp<span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">Quantum</span>
                </h2>
                <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                    The World's Most Advanced <strong>Autonomous SEO Engine</strong>. Deploy graph-aware AI agents to analyze, self-correct, and optimize your content strategy at scale.
                </p>
            </div>

            <div className="max-w-3xl mx-auto bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden relative">
                {/* Glow Effect */}
                <div className="absolute -top-32 -left-32 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px]"></div>
                <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px]"></div>

                <div className="flex border-b border-slate-700/50 relative z-10">
                    <TabButton active={activeTab === 'crawl'} onClick={() => setActiveTab('crawl')}>
                        <GlobeIcon /> Live Site Crawl
                    </TabButton>
                    <TabButton active={activeTab === 'upload'} onClick={() => setActiveTab('upload')}>
                        <UploadIcon /> Batch File Upload
                    </TabButton>
                </div>
                
                <div className="p-8 relative z-10">
                    {activeTab === 'crawl' && (
                        <form onSubmit={handleCrawlSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div className="md:col-span-2 group">
                                    <label htmlFor="url" className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Target Website URL</label>
                                    <input id="url" type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-wordpress-site.com"
                                        className="w-full px-4 py-3.5 bg-slate-800 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-white placeholder-slate-600"
                                        disabled={isLoading} />
                                </div>
                                <div className="md:col-span-1">
                                    <label htmlFor="targetLocationCrawl" className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Target Geo (Optional)</label>
                                    <input id="targetLocationCrawl" type="text" value={targetLocation} onChange={(e) => setTargetLocation(e.target.value)} placeholder="e.g. USA, London"
                                        className="w-full px-4 py-3.5 bg-slate-800 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-white placeholder-slate-600"
                                        disabled={isLoading} />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="sitemapUrl" className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Sitemap URL (Optional)</label>
                                <input id="sitemapUrl" type="text" value={sitemapUrl} onChange={(e) => setSitemapUrl(e.target.value)} placeholder="Auto-detect if empty"
                                    className="w-full px-4 py-3.5 bg-slate-800 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-white placeholder-slate-600"
                                    disabled={isLoading} />
                            </div>
                            <button type="submit" disabled={isLoading || !url || !isApiConfigured}
                                className="w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-lg font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:-translate-y-0.5"
                                title={!isApiConfigured ? 'Please configure your API key first' : 'Initialize Autonomous Agent'}>
                                {isLoading ? <Spinner /> : 'Initialize Quantum Audit'}
                                {!isLoading && <ArrowRightIcon />}
                            </button>
                        </form>
                    )}
                    
                    {activeTab === 'upload' && (
                        <form onSubmit={handleProcessFileSubmit} className="space-y-6">
                             <label
                                className="flex flex-col items-center justify-center w-full h-40 px-4 transition-all bg-slate-800/50 border-2 border-slate-600 border-dashed rounded-xl appearance-none cursor-pointer hover:border-indigo-500 hover:bg-slate-800 group"
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                              >
                                <span className="flex flex-col items-center space-y-2">
                                   <div className="p-3 bg-slate-700 rounded-full group-hover:bg-indigo-600 transition-colors">
                                        <UploadIcon />
                                   </div>
                                    <span className="font-medium text-slate-300 group-hover:text-white transition-colors">
                                        {selectedFile ? selectedFile.name : 'Drop XML, CSV, or TXT file here'}
                                    </span>
                                    <span className="text-xs text-slate-500">Supports sitemaps & URL lists</span>
                                </span>
                                <input type="file" name="file_upload" className="hidden" accept=".xml,.csv,.txt" onChange={handleFileChange} />
                            </label>

                             <div>
                                <label htmlFor="targetLocationUpload" className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Target Geo (Optional)</label>
                                <input id="targetLocationUpload" type="text" value={targetLocation} onChange={(e) => setTargetLocation(e.target.value)} placeholder="e.g. USA, London"
                                    className="w-full px-4 py-3.5 bg-slate-800 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-white placeholder-slate-600"
                                    disabled={isLoading} />
                             </div>
                                
                             <button type="submit" disabled={isLoading || !selectedFile || !isApiConfigured}
                                className="w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-lg font-bold rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:-translate-y-0.5"
                                title={!isApiConfigured ? 'Please configure your API key first' : 'Process file'}>
                                {isLoading ? <Spinner /> : 'Ingest Data & Begin Analysis'}
                                {!isLoading && <ArrowRightIcon />}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};