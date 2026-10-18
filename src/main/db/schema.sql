-- Didact schema v1

CREATE TABLE IF NOT EXISTS content_folders (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS content_files (
  id          TEXT PRIMARY KEY,
  folder_id   TEXT NOT NULL REFERENCES content_folders(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('material', 'examination')),
  filename    TEXT NOT NULL,
  filepath    TEXT NOT NULL,
  embedded_at TEXT
);

CREATE TABLE IF NOT EXISTS questions (
  id                TEXT PRIMARY KEY,
  folder_id         TEXT NOT NULL REFERENCES content_folders(id) ON DELETE CASCADE,
  file_id           TEXT NOT NULL REFERENCES content_files(id) ON DELETE CASCADE,
  type              TEXT NOT NULL CHECK (type IN ('mc_conceptual', 'feynman', 'exam_verbatim', 'exam_modified')),
  prompt            TEXT NOT NULL,
  answer_json       TEXT NOT NULL,
  source_ref        TEXT,
  time_limit_bucket TEXT CHECK (time_limit_bucket IN ('lt5', 'lt15', 'gt15')),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  is_bad            INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sr_state (
  question_id  TEXT PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
  ease_factor  REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 1,
  due_date     TEXT NOT NULL,
  repetitions  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS answer_history (
  id           TEXT PRIMARY KEY,
  question_id  TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_answer  TEXT NOT NULL,
  score        REAL,
  answered_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS essential_propositions (
  id          TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  proposition TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER NOT NULL
);
