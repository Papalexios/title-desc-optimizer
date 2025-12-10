
import React from 'react';

const ZapIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const CheckBadgeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>;
const TableIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;


interface HeaderProps {
    isValidApi: boolean;
    showReviewButton: boolean;
    onSwitchView: (view: 'dashboard' | 'review') => void;
    currentView: 'dashboard' | 'review';
}

export const Header: React.FC<HeaderProps> = ({ isValidApi, showReviewButton, onSwitchView, currentView }) => {
    return (
        <header className="sticky top-0 z-50 bg-slate-950/60 backdrop-blur-2xl border-b border-white/5 transition-all duration-300">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row items-center justify-between h-auto sm:h-20 py-3 sm:py-0 gap-4 sm:gap-0">
                    
                    {/* Artistic SOTA Logo Section */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 group cursor-default">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="absolute inset-0 bg-indigo-500 rounded-xl blur-lg opacity-50 group-hover:opacity-80 transition-opacity duration-500 animate-pulse"></div>
                                <div className="relative p-2.5 bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-600 rounded-xl shadow-inner border border-white/20">
                                <ZapIcon />
                                </div>
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-white tracking-tighter leading-none">
                                    SERP<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-300">QUANTUM</span>
                                </h1>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className={`flex h-1.5 w-1.5 rounded-full ${isValidApi ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-red-500'}`}></span>
                                    <span className="text-[9px] font-bold tracking-widest uppercase text-slate-500">
                                        {isValidApi ? 'System Online' : 'Offline'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Creator Attribution Link */}
                        <div className="hidden lg:flex h-8 w-px bg-white/10 mx-2"></div>
                        <a 
                            href="https://affiliatemarketingforsuccess.com" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hidden sm:block text-[10px] text-slate-400 hover:text-white transition-colors border border-white/5 bg-white/5 rounded-full px-3 py-1 hover:bg-white/10 hover:border-white/10"
                        >
                            From the creators of <span className="text-indigo-300 font-semibold">AffiliateMarketingForSuccess.com</span>
                        </a>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        {showReviewButton ? (
                            <div className="flex p-1 bg-slate-900/60 rounded-xl border border-white/10 backdrop-blur-md">
                                 <button
                                    onClick={() => onSwitchView('dashboard')}
                                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${currentView === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    <TableIcon /> <span className="hidden sm:inline">Data Grid</span>
                                </button>
                                <button
                                    onClick={() => onSwitchView('review')}
                                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${currentView === 'review' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    <CheckBadgeIcon /> <span className="hidden sm:inline">Bulk Sync</span>
                                </button>
                            </div>
                        ) : (
                             <div className="px-4 py-1.5 rounded-full bg-slate-900/50 border border-slate-700/50 text-[10px] font-mono text-indigo-300/80 shadow-lg">
                                V3.0 QUANTUM
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};
