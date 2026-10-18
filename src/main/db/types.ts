export interface ContentFolder {
  id: string;
  name: string;
  created_at: string;
}

export interface ContentFile {
  id: string;
  folder_id: string;
  type: "material" | "examination";
  filename: string;
  filepath: string;
  embedded_at: string | null;
}

export type QuestionType = "mc_conceptual" | "feynman" | "exam_verbatim" | "exam_modified";
export type TimeLimitBucket = "lt5" | "lt15" | "gt15";

export interface Question {
  id: string;
  folder_id: string;
  file_id: string;
  type: QuestionType;
  prompt: string;
  /** JSON-encoded answer data — structure varies by question type */
  answer_json: string;
  source_ref: string | null;
  time_limit_bucket: TimeLimitBucket | null;
  created_at: string;
  is_bad: 0 | 1;
}

export interface SrState {
  question_id: string;
  ease_factor: number;
  interval_days: number;
  due_date: string;
  repetitions: number;
}

export interface AnswerHistory {
  id: string;
  question_id: string;
  user_answer: string;
  score: number | null;
  answered_at: string;
}

export interface EssentialProposition {
  id: string;
  question_id: string;
  proposition: string;
}

// ── Answer JSON shapes per question type ──────────────

export interface McAnswer {
  options: string[];
  correct: number; // index 0-3
  source_chunk_id?: string;
}

export interface FeynmanAnswer {
  model_answer: string;
  source_chunk_id?: string;
}

export interface ExamVerbatimAnswer {
  answer: string;
  answer_type: "numeric" | "mc";
  /** Options list, only if answer_type === 'mc' */
  options?: string[];
  time_limit_bucket: TimeLimitBucket;
  time_limit_reasoning: string;
}

export interface ExamModifiedAnswer {
  answer: string;
  answer_type: "numeric" | "mc";
  options?: string[];
  solution_methodology: string;
  source_chunk_ids: string[];
  time_limit_bucket: TimeLimitBucket;
}
