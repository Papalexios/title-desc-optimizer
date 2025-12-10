
import React, { useMemo } from 'react';
import { SeoAnalysis } from '../types';

interface DashboardProps {
    data: SeoAnalysis[];
    showReviewButton: boolean;
    onSwitchView: (view: 'dashboard' | 'review') => void;
}

const StatCard: React.FC<{ label: string; value: string | number, icon: React.ReactNode, color: string }> = ({ label, value, icon, color }) => (
    <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:bg-slate-800/60 transition-colors">
        <div className={`absolute top-0 right-0 p-16 ${color} blur-[60px] opacity-10 group-hover:opacity-20 transition-opacity`}></div>
        <div className="relative z-10 flex items-center gap-4">
            <div className="bg-slate-800/80 p-3 rounded-xl border border-white/5 shadow-lg">
                {icon}
            </div>
            <div>
                <div className="text-3xl font-black text-white tracking-tight">{value}</div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">{label}</div>
            </div>
        </div>
    </div>
);

const ChartBarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const DocumentTextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const ExclamationIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
const CheckBadgeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>;


export const Dashboard: React.FC<DashboardProps> = ({ data, showReviewButton, onSwitchView }) => {
    const analyzedData = useMemo(() => data.filter(item => item.grade !== undefined), [data]);
    const scannedData = useMemo(() => data.filter(item => item.status === 'scanned' || item.status === 'analyzed'), [data]);

    const stats = useMemo(() => {
        const totalGrade = analyzedData.reduce((acc, item) => acc + (item.grade ?? 0), 0);
        const criticalIssuesCount = scannedData.filter(item => 
            item.quickScan?.isTitleMissing || item.quickScan?.isDescriptionMissing || item.quickScan?.isTitleTooLong || item.quickScan?.isTitleDuplicate
        ).length;

        return {
            totalPages: data.length,
            averageGrade: analyzedData.length > 0 ? Math.round(totalGrade / analyzedData.length) : 0,
            criticalIssues: criticalIssuesCount,
            gradeCounts: {
                good: analyzedData.filter(item => item.grade! >= 85).length,
                average: analyzedData.filter(item => item.grade! >= 60 && item.grade! < 85).length,
                poor: analyzedData.filter(item => item.grade! < 60).length,
            }
        };
    }, [data, analyzedData, scannedData]);
    
    const { totalPages, averageGrade, gradeCounts, criticalIssues } = stats;
    const totalAnalyzed = analyzedData.length;

    return (
        <div className="my-8 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <StatCard label="Total Pages Found" value={totalPages} icon={<DocumentTextIcon />} color="bg-cyan-500" />
                <StatCard label="Critical Issues" value={criticalIssues} icon={<ExclamationIcon />} color="bg-rose-500" />
                <StatCard label="Average Optimization" value={totalAnalyzed > 0 ? averageGrade : '-'} icon={<ChartBarIcon />} color="bg-indigo-500" />
            </div>

            {analyzedData.length === 0 && data.length > 0 && (
                 <div className="mt-6 p-6 glass-panel rounded-xl flex items-center justify-center text-center">
                    <div>
                        <h3 className="text-xl font-bold text-white">Scan Complete</h3>
                        <p className="text-slate-400 mt-2 max-w-xl mx-auto">
                            Found <span className="text-white font-mono">{data.length}</span> pages. Select pages in the table below and tap "Analyze".
                        </p>
                    </div>
                </div>
            )}

            {showReviewButton && (
                 <div className="mt-6 p-6 bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg shadow-indigo-900/20 backdrop-blur-sm">
                    <div>
                        <h3 className="text-xl font-bold text-white">Analysis Complete</h3>
                        <p className="text-indigo-200 mt-1">Review the AI suggestions and sync to WordPress.</p>
                    </div>
                    <button
                         onClick={() => onSwitchView('review')}
                        className="flex-shrink-0 flex items-center justify-center px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(79,70,229,0.5)] hover:bg-indigo-500 transition-all duration-300 animate-pulse"
                    >
                        <CheckBadgeIcon />
                        Review Suggestions
                    </button>
                </div>
            )}

            <div className="mt-6 glass-panel p-5 rounded-2xl">
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Optimization Grade Distribution</h3>
                 {totalAnalyzed > 0 ? (
                    <>
                        <div className="flex h-3 rounded-full overflow-hidden bg-slate-800">
                            <div className="bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-700" style={{ width: `${(gradeCounts.good / totalAnalyzed) * 100}%` }}></div>
                            <div className="bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] transition-all duration-700" style={{ width: `${(gradeCounts.average / totalAnalyzed) * 100}%` }}></div>
                            <div className="bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)] transition-all duration-700" style={{ width: `${(gradeCounts.poor / totalAnalyzed) * 100}%` }}></div>
                        </div>
                        <div className="mt-4 flex justify-between text-xs text-slate-400 font-medium">
                            <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-emerald-500"></div>Good ({gradeCounts.good})</div>
                            <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-amber-500"></div>Average ({gradeCounts.average})</div>
                            <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-rose-500"></div>Poor ({gradeCounts.poor})</div>
                        </div>
                    </>
                 ) : (
                    <div className="text-center text-slate-500 py-2 text-sm italic">No data yet.</div>
                 )}
            </div>
        </div>
    );
};
