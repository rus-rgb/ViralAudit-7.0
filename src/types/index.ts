// ==========================================
// AUDIT DATA TYPES
// ==========================================

export interface AuditCategory {
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
    visual: AuditCategory;
    audio: AuditCategory;
    copy: AuditCategory;
  };
  checks: CheckItem[];
}

export interface AuditRecord {
  id: string;
  user_id: string;
  video_name: string;
  video_size_mb: number;
  overall_score: number;
  verdict: string;
  categories: {
    visual: AuditCategory;
    audio: AuditCategory;
    copy: AuditCategory;
  };
  checks: CheckItem[];
  created_at: string;
}

// ==========================================
// DEFAULTS
// ==========================================

export const DEFAULT_ANALYSIS: AnalysisData = {
  overallScore: 0,
  verdict: "Analysis failed to load.",
  categories: {
    visual: { score: 0, feedback: "N/A", fix: "" },
    audio: { score: 0, feedback: "N/A", fix: "" },
    copy: { score: 0, feedback: "N/A", fix: "" }
  },
  checks: []
};

// ==========================================
// UPLOAD STATUS
// ==========================================

export type UploadStatus = 'IDLE' | 'COMPRESSING' | 'UPLOADING' | 'ANALYZING' | 'SUCCESS' | 'ERROR';
