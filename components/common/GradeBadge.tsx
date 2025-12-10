
import React from 'react';

interface GradeBadgeProps {
    grade: number;
}

export const GradeBadge: React.FC<GradeBadgeProps> = ({ grade }) => {
    const getGradeColor = () => {
        if (grade >= 85) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]';
        if (grade >= 60) return 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]';
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]';
    };

    return (
        <span className={`inline-flex items-center justify-center min-w-[32px] px-2 py-0.5 rounded text-xs font-black border ${getGradeColor()}`}>
            {grade}
        </span>
    );
};
