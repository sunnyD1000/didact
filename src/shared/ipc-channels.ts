/**
 * All IPC channel names used between main and renderer.
 * Keep these in sync between preload.ts and main-process handlers.
 */
export const IPC = {
  // Settings
  GET_SETTINGS: "get-settings",
  SET_SETTINGS: "set-settings",

  // Content folders
  LIST_CONTENT_FOLDERS: "list-content-folders",
  CREATE_CONTENT_FOLDER: "create-content-folder",
  LIST_FILES_FOR_FOLDER: "list-files-for-folder",
  GET_QUESTION_COUNT_FOR_FILE: "get-question-count-for-file",

  // File ingestion
  INGEST_FILE: "ingest-file",
  INGEST_PROGRESS: "ingest-progress", // main → renderer push

  // Question generation
  GENERATE_MATERIAL_QUESTIONS: "generate-material-questions",
  EXTRACT_EXAM_QUESTIONS: "extract-exam-questions",
  GENERATE_MODIFIED_QUESTIONS: "generate-modified-questions",

  // Feynman evaluation
  EVALUATE_FEYNMAN_ANSWER: "evaluate-feynman-answer",

  // Exam study
  GET_DUE_EXAM_QUESTIONS: "get-due-exam-questions",
  RECORD_EXAM_ANSWER: "record-exam-answer",
  SET_TIME_LIMIT_BUCKET: "set-time-limit-bucket",

  // Question management
  MARK_QUESTION_BAD: "mark-question-bad",
  GET_QUESTIONS_FOR_FILE: "get-questions-for-file",

  // Study deck
  BUILD_DECK: "build-deck",
} as const;

export type IpcChannel = (typeof IPC)[keyof typeof IPC];
