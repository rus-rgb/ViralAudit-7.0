export interface CategoryData {
    score: number;
    feedback: string;
    fix?: string;
}

export interface CheckItem {
    label: string;
    status: 'PASS' | 'FAIL' | 'WARN';
    details: string;
    fix?: string;
}

export interface AnalysisData {
    overallScore: number;
    verdict: string;
    categories: {
        visual: CategoryData;
        audio: CategoryData;
        copy: CategoryData;
    };
    checks: CheckItem[];
}