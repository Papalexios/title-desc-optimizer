import React from 'react';

const ZapIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

interface HeaderProps {
    isValidApi: boolean;
}

export const Header: React.FC<HeaderProps> = ({ isValidApi }) => {
    return (
        <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-50 shadow-lg">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    <div className="flex items-center space-x-4">
                        <div className="p-2 bg-slate-800/50 rounded-lg border border-slate-700">
                           <ZapIcon />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-white tracking-tight">
                                    WP SEO Optimizer <span className="text-indigo-400">AI</span>
                                </h1>
                                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${isValidApi ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-slate-500/10 border-slate-500/30 text-slate-400'}`}>
                                    <div className={`h-2 w-2 rounded-full ${isValidApi ? 'bg-green-400' : 'bg-slate-500'}`}></div>
                                    <span className="text-xs font-medium">{isValidApi ? 'API Ready' : 'No API Key'}</span>
                                </div>
                            </div>
                            <p className="text-sm text-slate-400">Your AI-powered SEO audit and content generation tool</p>
                            <p className="text-xs text-slate-500 mt-1">
                                From the creators of <a href="https://affiliatemarketingforsuccess.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 underline transition-colors">AffiliateMarketingForSuccess.com</a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};