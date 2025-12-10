
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
const StarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>;

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => {
    return (
        <button
            onClick={onClick}
            className={`flex items-center justify-center px-4 py-4 text-sm font-bold w-1/2 transition-all duration-300 focus:outline-none relative overflow-hidden ${
                active ? 'text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}
        >
            {active && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]"></div>}
            <span className="relative z-10 flex items-center">{children}</span>
        </button>
    );
};

export const UrlInput: React.FC<UrlInputProps> = ({ onCrawl, onProcessFile, isLoading, isApiConfigured }) => {
    const [activeTab, setActiveTab] = useState<'crawl' | 'upload'>('crawl');
    const [url, setUrl] = useState('https://plantastichaven.com/');
    const [sitemapUrl, setSitemapUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
        e.preventDefault(); e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault(); e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setSelectedFile(e.dataTransfer.files[0]);
        }
    }, []);


    return (
        <div className="mt-8 mb-24 relative z-10 flex flex-col items-center">
            {/* Artistic SOTA Hero Section */}
            <div className="text-center mb-12 space-y-6 max-w-4xl mx-auto">
                <div className="inline-block relative">
                    <div className="absolute inset-0 blur-3xl bg-indigo-500/30 rounded-full"></div>
                    <h2 className="relative text-5xl sm:text-7xl font-black text-white tracking-tighter drop-shadow-2xl leading-tight">
                        Serp<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 animate-gradient-x">Quantum</span>
                    </h2>
                </div>
                
                <p className="text-lg sm:text-2xl text-slate-300 font-light leading-relaxed">
                    Deploy <span className="text-indigo-300 font-semibold border-b border-indigo-500/30">Autonomous Graph-RAG Agents</span> to optimize your content strategy with <strong className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">10,000x efficiency</strong>.
                </p>

                {/* SOTA CTA Button */}
                <div className="pt-6 pb-8">
                    <a 
                        href="https://seo-hub.affiliatemarketingforsuccess.com/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="group relative inline-flex items-center justify-center px-8 py-5 text-lg font-bold text-white transition-all duration-300 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-full hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-[0_0_40px_rgba(99,102,241,0.6)] hover:shadow-[0_0_60px_rgba(168,85,247,0.8)] overflow-hidden"
                    >
                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"></div>
                        <StarIcon />
                        <span>Dominate Your Niche – Unlock Your Complete AI-Powered SEO Arsenal</span>
                        <ArrowRightIcon />
                    </a>
                </div>
            </div>

            {/* Input Panel */}
            <div className="w-full max-w-3xl glass-panel rounded-3xl shadow-2xl overflow-hidden relative group border border-white/10">
                {/* Glow Effect */}
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] group-hover:bg-indigo-600/30 transition-all duration-1000"></div>
                <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] group-hover:bg-purple-600/30 transition-all duration-1000"></div>

                <div className="flex border-b border-white/5 relative z-10 bg-slate-900/40 backdrop-blur-md">
                    <TabButton active={activeTab === 'crawl'} onClick={() => setActiveTab('crawl')}>
                        <GlobeIcon /> Live Crawl
                    </TabButton>
                    <TabButton active={activeTab === 'upload'} onClick={() => setActiveTab('upload')}>
                        <UploadIcon /> File Upload
                    </TabButton>
                </div>
                
                <div className="p-6 sm:p-10 relative z-10 bg-slate-900/20">
                    {activeTab === 'crawl' && (
                        <form onSubmit={handleCrawlSubmit} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-2 space-y-2">
                                    <label htmlFor="url" className="text-xs font-bold text-indigo-300 uppercase tracking-wider ml-1">Target Website URL</label>
                                    <div className="relative group/input">
                                        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl blur opacity-20 group-hover/input:opacity-50 transition duration-500"></div>
                                        <input id="url" type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-site.com"
                                            className="relative w-full px-5 py-4 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-white placeholder-slate-600 font-medium"
                                            disabled={isLoading} />
                                    </div>
                                </div>
                                <div className="md:col-span-1 space-y-2">
                                    <label htmlFor="targetLocationCrawl" className="text-xs font-bold text-indigo-300 uppercase tracking-wider ml-1">Geo Target</label>
                                    <div className="relative group/input">
                                         <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl blur opacity-20 group-hover/input:opacity-50 transition duration-500"></div>
                                        <input id="targetLocationCrawl" type="text" value={targetLocation} onChange={(e) => setTargetLocation(e.target.value)} placeholder="e.g. USA"
                                            className="relative w-full px-5 py-4 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-white placeholder-slate-600 font-medium"
                                            disabled={isLoading} />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="sitemapUrl" className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Sitemap URL (Optional)</label>
                                <input id="sitemapUrl" type="text" value={sitemapUrl} onChange={(e) => setSitemapUrl(e.target.value)} placeholder="Auto-detect if empty"
                                    className="w-full px-5 py-4 bg-slate-900/60 border border-slate-700/50 rounded-xl focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50 transition-all text-white placeholder-slate-600 shadow-inner"
                                    disabled={isLoading} />
                            </div>
                            <button type="submit" disabled={isLoading || !url || !isApiConfigured}
                                className="w-full flex items-center justify-center px-6 py-5 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white text-lg font-bold rounded-xl shadow-[0_10px_40px_rgba(79,70,229,0.3)] hover:shadow-[0_10px_50px_rgba(79,70,229,0.5)] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all duration-300 group/btn"
                                title={!isApiConfigured ? 'Configure API key first' : 'Initialize Agent'}>
                                {isLoading ? <Spinner /> : <span className="group-hover/btn:tracking-widest transition-all duration-300">Initialize Quantum Audit</span>}
                                {!isLoading && <ArrowRightIcon />}
                            </button>
                        </form>
                    )}
                    
                    {activeTab === 'upload' && (
                        <form onSubmit={handleProcessFileSubmit} className="space-y-8">
                             <label
                                className="flex flex-col items-center justify-center w-full h-48 px-4 transition-all bg-slate-900/60 border-2 border-slate-700/50 border-dashed rounded-2xl cursor-pointer hover:border-indigo-500/50 hover:bg-slate-900/80 group"
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                              >
                                <span className="flex flex-col items-center space-y-4">
                                   <div className="p-4 bg-slate-800 rounded-full group-hover:bg-indigo-600 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(79,70,229,0.6)] transition-all duration-300">
                                        <UploadIcon />
                                   </div>
                                    <span className="font-medium text-slate-300 group-hover:text-white transition-colors text-lg">
                                        {selectedFile ? selectedFile.name : 'Drop XML, CSV, or TXT file here'}
                                    </span>
                                </span>
                                <input type="file" name="file_upload" className="hidden" accept=".xml,.csv,.txt" onChange={handleFileChange} />
                            </label>

                             <div className="space-y-2">
                                <label htmlFor="targetLocationUpload" className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Geo Target (Optional)</label>
                                <input id="targetLocationUpload" type="text" value={targetLocation} onChange={(e) => setTargetLocation(e.target.value)} placeholder="e.g. USA"
                                    className="w-full px-5 py-4 bg-slate-900/60 border border-slate-700/50 rounded-xl focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50 transition-all text-white placeholder-slate-600 shadow-inner"
                                    disabled={isLoading} />
                             </div>
                                
                             <button type="submit" disabled={isLoading || !selectedFile || !isApiConfigured}
                                className="w-full flex items-center justify-center px-6 py-5 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white text-lg font-bold rounded-xl shadow-[0_10px_40px_rgba(192,38,211,0.3)] hover:shadow-[0_10px_50px_rgba(192,38,211,0.5)] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all duration-300"
                                title={!isApiConfigured ? 'Configure API key first' : 'Process file'}>
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
