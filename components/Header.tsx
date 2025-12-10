import React from 'react';

const ZapIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const CheckBadgeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>;
const TableIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;


interface HeaderProps {
    isValidApi: boolean;
    showReviewButton: boolean;
    onSwitchView: (view: 'dashboard' | 'review') => void;
    currentView: 'dashboard' | 'review';
}

export const Header: React.FC<HeaderProps> = ({ isValidApi, showReviewButton, onSwitchView, currentView }) => {
    return (
        <header className="sticky top-0 z-50 bg-slate-900/70 backdrop-blur-xl border-b border-white/10 shadow-2xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 pointer-events-none"></div>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
                <div className="flex items-center justify-between h-20">
                    <div className="flex items-center space-x-4 group cursor-default">
                        <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
                           <ZapIcon />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-black text-white tracking-tighter">
                                    SERP<span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">QUANTUM</span>
                                </h1>
                            </div>
                             <div className="flex items-center gap-2 mt-0.5">
                                <div className={`h-1.5 w-1.5 rounded-full transition-all duration-500 ${isValidApi ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-red-500 animate-pulse'}`}></div>
                                <span className={`text-[10px] font-bold tracking-widest uppercase ${isValidApi ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {isValidApi ? 'System Online' : 'API Disconnected'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {showReviewButton ? (
                            <div className="flex p-1 bg-slate-800/80 rounded-lg border border-slate-700/50 backdrop-blur-md">
                                 <button
                                    onClick={() => onSwitchView('dashboard')}
                                    className={`flex items-center px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${currentView === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
                                >
                                    <TableIcon /> Data Grid
                                </button>
                                <button
                                    onClick={() => onSwitchView('review')}
                                    className={`flex items-center px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${currentView === 'review' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
                                >
                                    <CheckBadgeIcon /> Bulk Sync
                                </button>
                            </div>
                        ) : (
                            <div className="hidden md:flex text-sm text-slate-400">
                                <span className="opacity-75 font-mono text-xs border border-slate-700 px-2 py-1 rounded bg-slate-800/50">v3.0.0 QUANTUM BUILD</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};