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
            className={`flex items-center justify-center px-4 py-3 text-sm font-semibold w-1/2 transition-colors duration-200 focus:outline-none ${
                active
                    ? 'text-indigo-300 border-b-2 border-indigo-400'
                    : 'text-slate-400 hover:text-white border-b-2 border-transparent'
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
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 shadow-lg mt-6">
            <div className="flex border-b border-slate-700">
                <TabButton active={activeTab === 'crawl'} onClick={() => setActiveTab('crawl')}>
                    <GlobeIcon /> Crawl Live Site
                </TabButton>
                <TabButton active={activeTab === 'upload'} onClick={() => setActiveTab('upload')}>
                    <UploadIcon /> Upload File
                </TabButton>
            </div>
            
            <div className="p-6">
                {activeTab === 'crawl' && (
                    <form onSubmit={handleCrawlSubmit} className="space-y-4">
                        <p className="text-center text-slate-400 mb-6">Enter your site URL. The crawler will attempt to find and process your entire sitemap.</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                                <label htmlFor="url" className="sr-only">Main site URL</label>
                                <input id="url" type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-wordpress-site.com"
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow text-white"
                                    disabled={isLoading} />
                            </div>
                            <div className="md:col-span-1">
                                <label htmlFor="targetLocationCrawl" className="sr-only">Target Location</label>
                                <input id="targetLocationCrawl" type="text" value={targetLocation} onChange={(e) => setTargetLocation(e.target.value)} placeholder="Target Location (e.g., London)"
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow text-white"
                                    disabled={isLoading} />
                            </div>
                        </div>
                        <label htmlFor="sitemapUrl" className="sr-only">Sitemap URL</label>
                        <input id="sitemapUrl" type="text" value={sitemapUrl} onChange={(e) => setSitemapUrl(e.target.value)} placeholder="Sitemap URL (optional, if auto-discovery fails)"
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow text-white"
                            disabled={isLoading} />
                        <div className="flex justify-end">
                            <button type="submit" disabled={isLoading || !url || !isApiConfigured}
                                className="flex items-center justify-center px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-900 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors duration-200"
                                title={!isApiConfigured ? 'Please configure your API key first' : 'Crawl your website'}>
                                {isLoading ? <Spinner /> : 'Crawl Site'}
                                {!isLoading && <ArrowRightIcon />}
                            </button>
                        </div>
                    </form>
                )}
                
                {activeTab === 'upload' && (
                    <form onSubmit={handleProcessFileSubmit} className="space-y-4">
                         <p className="text-center text-slate-400 mb-6">Upload a file containing a list of URLs for analysis. Supported formats: .xml, .csv, .txt</p>
                         
                         <label
                            className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-slate-900 border-2 border-slate-600 border-dashed rounded-md appearance-none cursor-pointer hover:border-slate-500 focus:outline-none"
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                          >
                            <span className="flex items-center space-x-2">
                               <UploadIcon />
                                <span className="font-medium text-slate-300">
                                    {selectedFile ? selectedFile.name : <>Drop files to attach, or <span className="text-indigo-400 underline">browse</span></>}
                                </span>
                            </span>
                            <input type="file" name="file_upload" className="hidden" accept=".xml,.csv,.txt" onChange={handleFileChange} />
                        </label>

                         <label htmlFor="targetLocationUpload" className="sr-only">Target Location</label>
                         <input id="targetLocationUpload" type="text" value={targetLocation} onChange={(e) => setTargetLocation(e.target.value)} placeholder="Target Location (e.g., London)"
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow text-white"
                            disabled={isLoading} />
                            
                         <div className="flex justify-end">
                            <button type="submit" disabled={isLoading || !selectedFile || !isApiConfigured}
                                className="flex items-center justify-center px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-900 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors duration-200"
                                title={!isApiConfigured ? 'Please configure your API key first' : 'Process the uploaded file'}>
                                {isLoading ? <Spinner /> : 'Process File'}
                                {!isLoading && <ArrowRightIcon />}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
