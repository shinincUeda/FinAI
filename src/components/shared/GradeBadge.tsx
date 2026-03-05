
export const GRADE_WEIGHT: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };

export function getGradeMeta(grade?: string): { color: string; bg: string } {
    if (grade === 'S') return { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' };
    if (grade === 'A') return { color: '#10b981', bg: 'rgba(16,185,129,0.12)' };
    if (grade === 'B') return { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' };
    if (grade === 'C') return { color: '#f97316', bg: 'rgba(249,115,22,0.12)' };
    if (grade === 'D') return { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' };
    return { color: '#6b7280', bg: 'rgba(107,114,128,0.12)' };
}

interface GradeBadgeProps {
    grade?: string;
    className?: string;
    showLabel?: boolean;
}

export function GradeBadge({ grade, className = '', showLabel = false }: GradeBadgeProps) {
    if (!grade) return null;

    const { color, bg } = getGradeMeta(grade);

    return (
        <span
            className={`font-mono-dm text-[10px] font-bold px-1.5 py-0.5 border rounded inline-flex items-center justify-center ${className}`}
            style={{
                color,
                borderColor: color,
                backgroundColor: bg
            }}
        >
            {grade}{showLabel && ` = ${GRADE_WEIGHT[grade] ?? 0}`}
        </span>
    );
}
