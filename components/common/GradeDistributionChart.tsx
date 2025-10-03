import React from 'react';
import { SeoAnalysis } from '../../types';

interface GradeDistributionChartProps {
    data: SeoAnalysis[];
}

export const GradeDistributionChart: React.FC<GradeDistributionChartProps> = ({ data }) => {
    const gradeBuckets = {
        good: data.filter(item => item.grade >= 85).length,
        average: data.filter(item => item.grade >= 60 && item.grade < 85).length,
        poor: data.filter(item => item.grade < 60).length,
    };
    const total = data.length;
    
    if (total === 0) return null;

    const getPercentage = (count: number) => (total > 0 ? (count / total) * 100 : 0);
    
    const chartData = [
        { label: 'Good', count: gradeBuckets.good, color: 'bg-green-500', percentage: getPercentage(gradeBuckets.good) },
        { label: 'Average', count: gradeBuckets.average, color: 'bg-yellow-500', percentage: getPercentage(gradeBuckets.average) },
        { label: 'Poor', count: gradeBuckets.poor, color: 'bg-red-500', percentage: getPercentage(gradeBuckets.poor) },
    ];

    return (
        <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
            <h3 className="text-lg font-semibold text-gray-200 mb-4">Overall SEO Performance</h3>
            <div className="flex h-8 rounded-lg overflow-hidden bg-gray-700">
                {chartData.map(bar => (
                    bar.percentage > 0 && (
                        <div
                            key={bar.label}
                            className={`${bar.color} transition-all duration-500`}
                            style={{ width: `${bar.percentage}%` }}
                            title={`${bar.label}: ${bar.count} page(s) (${bar.percentage.toFixed(1)}%)`}
                        />
                    )
                ))}
            </div>
            <div className="mt-4 flex justify-between text-sm text-gray-400">
                {chartData.map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-sm ${item.color}`}></div>
                        <span>{item.label} ({item.count})</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
