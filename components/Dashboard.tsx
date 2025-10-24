import React, { useMemo } from 'react';
import { SeoAnalysis } from '../types';

interface DashboardProps {
    data: SeoAnalysis[];
}

const StatCard: React.FC<{ label: string; value: string | number, icon: React.ReactNode }> = ({ label, value, icon }) => (
    <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700 flex items-center gap-4">
        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-600">
            {icon}
        </div>
        <div>
            <div className="text-3xl font-bold text-white">{value}</div>
            <div className="text-sm font-medium text-slate-400">{label}</div>
        </div>
    </div>
);

const ChartBarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const DocumentTextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const ExclamationIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;


export const Dashboard: React.FC<DashboardProps> = ({ data }) => {
    const analyzedData = useMemo(() => data.filter(item => item.grade !== undefined), [data]);
    const scannedData = useMemo(() => data.filter(item => item.status === 'scanned' || item.status === 'analyzed'), [data]);

    const stats = useMemo(() => {
        const totalGrade = analyzedData.reduce((acc, item) => acc + (item.grade ?? 0), 0);
        
        const criticalIssuesCount = scannedData.filter(item => 
            item.quickScan?.isTitleMissing || item.quickScan?.isDescriptionMissing
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
        <div className="my-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard label="Total Pages Found" value={totalPages} icon={<DocumentTextIcon />} />
                <StatCard label="Critical Issues Found" value={criticalIssues} icon={<ExclamationIcon />} />
                <StatCard label="Average AI SEO Grade" value={totalAnalyzed > 0 ? averageGrade : 'N/A'} icon={<ChartBarIcon />} />
            </div>

            <div className="mt-6 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                 <h3 className="text-base font-semibold text-slate-300 mb-3">AI Performance Distribution ({totalAnalyzed} Analyzed)</h3>
                 {totalAnalyzed > 0 ? (
                    <>
                        <div className="flex h-4 rounded-full overflow-hidden bg-slate-700">
                            <div className="bg-green-500 transition-all duration-500" style={{ width: `${(gradeCounts.good / totalAnalyzed) * 100}%` }} title={`Good: ${gradeCounts.good}`}></div>
                            <div className="bg-yellow-500 transition-all duration-500" style={{ width: `${(gradeCounts.average / totalAnalyzed) * 100}%` }} title={`Average: ${gradeCounts.average}`}></div>
                            <div className="bg-red-500 transition-all duration-500" style={{ width: `${(gradeCounts.poor / totalAnalyzed) * 100}%` }} title={`Poor: ${gradeCounts.poor}`}></div>
                        </div>
                        <div className="mt-3 flex justify-around text-xs text-slate-400">
                            <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-green-500"></div>Good ({gradeCounts.good})</div>
                            <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-yellow-500"></div>Average ({gradeCounts.average})</div>
                            <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-red-500"></div>Poor ({gradeCounts.poor})</div>
                        </div>
                    </>
                 ) : (
                    <div className="text-center text-slate-400 py-4">Select pages and click "Analyze & Generate Suggestions" to see AI-driven performance data.</div>
                 )}
            </div>
        </div>
    );
};
