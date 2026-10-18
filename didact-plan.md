# Didact — Implementation Plan

## Overview

**Didact** is a macOS desktop application (Electron + React/TypeScript) for active-recall studying. Users organize content into folders (called **Content**), each containing exactly two subdirectories: **Materials** (lecture/textbook files) and **Examination** (quiz/test files). The app generates, schedules, and evaluates questions from those files using an LLM and the TypeSafe AI Jev semantic-similarity API.

**Core pillars:**
- Structured content storage (SQLite + LanceDB for vector search)
- LLM-generated questions from Materials (conceptual MC + Feynman free-text) and extracted Q&A from Examinations
- Feynman answer evaluation via Jev (pass/fail → spaced repetition)
- SM-2 spaced repetition for Examination questions
- LLM-modified Examination questions with Jev merge/split validation
- Main study screen with voice input support

**Tech stack:** Electron, React 18, TypeScript, Vite, SQLite (better-sqlite3), LanceDB, OpenAI / Google Gemini / Cursor API (user-selectable), TypeSafe AI Jev REST API, Web Speech API / Whisper (voice).

---

## Sub-Tasks

---

### Sub-Task 1 — Project Scaffold

**Status:** [ ] pending

**Intent**
Bootstrap a working Electron + React/TypeScript + Vite project with all core dependencies installed and a minimal IPC bridge in place. This is the foundation every other sub-task builds on.

**Expected Outcomes**
- `npm run dev` starts the Electron window with a React UI
- `npm run build` produces a packaged macOS app via electron-builder
- Main process and renderer process communicate over a typed IPC channel
- SQLite and LanceDB can be imported in the main process without errors
- ESLint + Prettier config is in place

**Todo List**
1. Scaffold project with `npm create electron-vite` (or equivalent) using the React + TypeScript template
2. Install runtime dependencies: `better-sqlite3`, `@lancedb/lancedb`, `electron-store` (for settings), `openai`, `@google/generative-ai`, `axios` (for Jev + Cursor REST calls)
3. Install dev dependencies: `electron-builder`, `@types/better-sqlite3`, ESLint, Prettier
4. Set up IPC bridge: define a typed `preload.ts` exposing channel names as constants; create a matching `useIpc` hook in the renderer
5. Add a `src/main/` directory for all main-process modules (db, llm, jev, ingest) and `src/renderer/` for UI
6. Add basic `electron-builder` config in `package.json` targeting macOS
7. Verify `npm run dev` opens a blank window with no console errors

**Relevant Context**
- Greenfield project — no existing code
- Use `contextBridge` + `ipcRenderer` / `ipcMain` pattern (never expose Node APIs directly to renderer)

---

### Sub-Task 2 — Settings & LLM Provider Configuration

**Status:** [ ] pending

**Intent**
Give users a persistent settings screen to configure API keys and choose their LLM provider. This unblocks all LLM-dependent sub-tasks and keeps secrets out of source code.

**Expected Outcomes**
- Settings stored securely via `electron-store` (encrypted, outside source tree)
- User can select provider: OpenAI, Gemini, or Cursor API
- Each provider has its own API key field; the Jev API key is a separate field
- A `LLMClient` abstraction in the main process routes calls to the correct provider
- Settings screen accessible from the sidebar footer

**Todo List**
1. Create `src/main/settings.ts` using `electron-store` to persist: `{ llmProvider, openaiKey, geminiKey, cursorKey, jevKey }`
2. Expose get/set IPC handlers for settings
3. Build `src/main/llm/client.ts` — a unified `LLMClient` class with a `complete(prompt, options)` method that dispatches to the selected provider SDK
4. Build `src/renderer/pages/SettingsPage.tsx` — provider radio buttons, per-key input fields, save button
5. Add a ⚙ icon at the bottom of the sidebar linking to settings

**Relevant Context**
- OpenAI: `openai` npm package
- Gemini: `@google/generative-ai` npm package
- Cursor API: REST call to Cursor's endpoint (same OpenAI-compatible format) via `axios`
- Jev: TypeSafe AI REST API — store key here, used in Sub-Task 7 and Sub-Task 10

---

### Sub-Task 3 — Data Model & SQLite Schema

**Status:** [ ] pending

**Intent**
Define and migrate the SQLite schema that underpins the entire app. Getting this right early prevents costly schema changes later.

**Expected Outcomes**
- Database file created at app startup with all tables migrated
- Schema covers: content folders, material files, examination files, questions (all types), SR state, answer history
- A typed TypeScript interface mirrors every table row

**Todo List**
1. Create `src/main/db/schema.sql` with the following tables:
   - `content_folders (id, name, created_at)`
   - `content_files (id, folder_id, type [material|examination], filename, filepath, embedded_at)`
   - `questions (id, folder_id, file_id, type [mc_conceptual|feynman|exam_verbatim|exam_modified], prompt, answer_json, source_ref, time_limit_bucket [null|lt5|lt15|gt15], created_at, is_bad)`
   - `sr_state (question_id PK, ease_factor, interval_days, due_date, repetitions)` — SM-2 fields for exam questions
   - `answer_history (id, question_id, user_answer, score, answered_at)`
   - `essential_propositions (id, question_id, proposition)` — for Feynman questions
2. Create `src/main/db/migrate.ts` — runs schema on first launch and on version bumps
3. Create `src/main/db/index.ts` — exports a single `db` instance (better-sqlite3)
4. Define TypeScript interfaces in `src/main/db/types.ts` for each table

**Relevant Context**
- `better-sqlite3` is synchronous — safe to call from main process IPC handlers
- LanceDB stores embeddings separately; `content_files.id` is used as the document ID in LanceDB

---

### Sub-Task 4 — Sidebar & Content Structure UI

**Status:** [ ] pending

**Intent**
Build the left sidebar: the primary navigation surface. Users create Content folders, see their Material/Examination subdirectories, upload files, and drill into per-file question history from here.

**Expected Outcomes**
- Sidebar lists all Content folders
- Expanding a folder shows exactly two fixed sub-folders: Materials and Examinations
- Each sub-folder lists its uploaded files; clicking a file shows associated questions
- "New Content Folder" button creates a folder (name prompt)
- File upload button on each sub-folder triggers ingestion (Sub-Task 5)
- No other directory types can be created

**Todo List**
1. Create `src/renderer/components/Sidebar/` with `Sidebar.tsx`, `ContentFolder.tsx`, `SubFolder.tsx`, `FileItem.tsx`
2. Fetch content folder list from SQLite via IPC on mount
3. Implement "New Content Folder" flow: modal name prompt → IPC call → re-fetch
4. Each folder renders exactly two fixed sub-folders (Materials, Examinations) — never more, never less
5. File upload button: opens system file picker (PDF, DOCX, image) → sends file path to main process via IPC
6. `FileItem` shows filename + a badge with question count; clicking it opens question history panel
7. Add IPC handlers in main process: `list-content-folders`, `create-content-folder`, `list-files-for-folder`, `get-question-count-for-file`

**Relevant Context**
- Sub-Task 3 defines `content_folders` and `content_files` tables
- File ingestion (Sub-Task 5) is triggered from here but handled in main process

---

### Sub-Task 5 — File Ingestion Pipeline

**Status:** [ ] pending

**Intent**
When a user uploads a file, extract its text, split it into chunks, embed the chunks into LanceDB, and record the file in SQLite. This makes Materials searchable by semantic query and provides raw text for question generation.

**Expected Outcomes**
- PDF, DOCX, and image files are parsed to plain text in the main process
- Text is chunked (e.g. 512-token chunks with overlap)
- Chunks are embedded via the selected LLM provider's embedding API and stored in LanceDB
- `content_files` row is inserted (or updated) in SQLite with `embedded_at` timestamp
- A progress notification is sent back to the renderer during ingestion

**Todo List**
1. Install: `pdf-parse`, `mammoth` (DOCX), `sharp` or base64 pass-through for images (images sent to vision-capable LLM for text extraction)
2. Create `src/main/ingest/parser.ts` — dispatches to correct parser by file extension, returns plain text string
3. Create `src/main/ingest/chunker.ts` — splits text into overlapping chunks; returns `{ chunkIndex, text }[]`
4. Create `src/main/ingest/embedder.ts` — takes chunks, calls embedding API (OpenAI `text-embedding-3-small` or Gemini embedding), returns vectors
5. Create `src/main/ingest/lancedb.ts` — initializes LanceDB table `chunks` with schema `{ id, file_id, chunk_index, text, vector }`, upserts chunks
6. Create `src/main/ingest/index.ts` — orchestrates parser → chunker → embedder → LanceDB → SQLite insert; emits progress events via `webContents.send`
7. Add IPC handler `ingest-file` in main process; renderer shows a loading indicator while in progress

**Relevant Context**
- Image files: pass raw base64 to the LLM's vision endpoint for OCR-style text extraction before chunking
- LanceDB table `chunks` is separate from SQLite; linked via `file_id = content_files.id`

---

### Sub-Task 6 — Materials Question Generation

**Status:** [ ] pending

**Intent**
From a Materials file, generate two question types: (a) multiple-choice conceptual questions and (b) Feynman free-text questions. Both cite the source chunk from LanceDB.

**Expected Outcomes**
- User can trigger "Generate Questions" on a Materials file from the sidebar
- LLM produces a configurable number of MC conceptual questions (prompt + 4 options + correct answer + source citation)
- LLM produces Feynman questions (prompt + model answer + list of essential propositions + source citation)
- All generated questions are stored in the `questions` table with `file_id` association
- Essential propositions are stored in `essential_propositions` table

**Todo List**
1. Create `src/main/questions/materialsMC.ts` — builds a prompt instructing the LLM to generate MC conceptual questions from retrieved chunks; parses the JSON response; saves to `questions` table with `type = mc_conceptual`
2. Create `src/main/questions/feynman.ts` — builds a prompt for Feynman questions; response includes `{ question, model_answer, propositions[], source_chunk_id }`; saves question + propositions
3. Create `src/main/questions/retriever.ts` — given a `file_id`, performs a LanceDB semantic search with the file's stored chunks as context (or fetches all chunks for full-file generation)
4. Add IPC handler `generate-material-questions` with params `{ fileId, types: ['mc'|'feynman'], count }` 
5. Add "Generate Questions" button to `FileItem` in the sidebar for Materials files
6. Renderer shows a spinner and confirmation toast when generation completes

**Relevant Context**
- Source citation: store `source_ref` as the LanceDB chunk ID; when displaying a question, retrieve the chunk text for the "source" widget
- MC questions for Materials share the same display component as MC Examination questions (Sub-Task 8)

---

### Sub-Task 7 — Feynman Answer Evaluation (Voice + Jev)

**Status:** [ ] pending

**Intent**
When the user answers a Feynman question (by typing or speaking), evaluate their answer against the model answer and essential propositions using the Jev API. Score determines whether the question is re-queued or moved to end of deck.

**Expected Outcomes**
- Voice input captured via Web Speech API (renderer) or Whisper (main process fallback)
- User's transcribed/typed answer sent to Jev with model answer + propositions as reference
- Jev returns a score; a threshold (configurable, default 0.7) determines pass/fail
- Pass: question moves to end of current deck
- Fail: question is re-queued soon (within next 3 questions)
- Score and answer stored in `answer_history`

**Todo List**
1. Create `src/renderer/components/VoiceInput.tsx` — uses `window.SpeechRecognition` (Web Speech API); shows mic button, interim transcript, final transcript
2. Create `src/main/jev/client.ts` — wraps the TypeSafe AI Jev REST API: `POST /evaluate` with `{ reference_answer, propositions[], student_answer }`, returns `{ score, proposition_scores[] }`
3. Create `src/main/questions/feynmanEval.ts` — retrieves propositions for the question, calls Jev client, applies threshold, returns `{ pass, score, feedback }`
4. Add IPC handler `evaluate-feynman-answer` with params `{ questionId, userAnswer }`
5. In the study screen (Sub-Task 11), render the Jev result: score badge, per-proposition breakdown, model answer reveal
6. Implement re-queue logic in the deck manager (Sub-Task 11): fail → insert after next 2 cards; pass → append to end

**Relevant Context**
- Jev API base URL and key from `electron-store` settings (Sub-Task 2)
- TypeSafe AI docs: https://docs.typesafe.ai/introduction — REST API, requires `Authorization: Bearer <jev_key>`
- Whisper fallback: call OpenAI Whisper API with recorded audio blob if Web Speech API is unavailable

---

### Sub-Task 8 — Examination Question Extraction

**Status:** [ ] pending

**Intent**
From an Examination file, extract all questions and answers verbatim, classify each as numeric or multiple-choice, and have the LLM infer a time-limit bucket for each. Link each question to at least one Materials chunk (source reference). Users can override the LLM-inferred time-limit bucket.

**Expected Outcomes**
- LLM extracts all Q&A pairs from the Examination file as structured JSON
- Each question classified as `numeric` or `mc`
- Each question assigned an LLM-inferred time-limit bucket: `lt5`, `lt15`, or `gt15`, with the LLM's reasoning recorded
- Questions stored in `questions` table with `type = exam_verbatim`
- SM-2 initial state row created for each question in `sr_state`
- User can override the time-limit bucket from the question history panel (Sub-Task 12) or study screen
- User can trigger extraction from the sidebar

**Todo List**
1. Create `src/main/questions/examExtract.ts` — prompt instructs LLM to return `{ questions: [{ prompt, answer, type, time_limit_bucket, time_limit_reasoning, source_hint }] }` where `time_limit_bucket` is inferred from the question's complexity and the LLM provides brief reasoning; parse and validate JSON response
2. After extraction, run a semantic search in LanceDB against the folder's Materials chunks to find the best matching source chunk for each question; store as `source_ref`
3. Insert each question into `questions` table with `type = exam_verbatim`; store `time_limit_bucket` and `time_limit_reasoning` in `answer_json`
4. Insert initial SM-2 state: `{ ease_factor: 2.5, interval_days: 1, due_date: today, repetitions: 0 }` for each
5. Add IPC handler `extract-exam-questions` with params `{ fileId }`
6. Add IPC handler `set-time-limit-bucket` with params `{ questionId, bucket }` — allows user override
7. Add "Extract Questions" button to Examination file items in sidebar

**Relevant Context**
- Time-limit bucket LLM guidance: lt5 = "you either know it or not" (single-step recall), lt15 = "quick to moderate solve using the right method", gt15 = "multi-stage exam problem"
- User override surfaced in Sub-Task 12 (question history panel) as a dropdown on each question row
- SM-2 scheduler is implemented in Sub-Task 9
- Modified questions (Sub-Task 10) are children of these verbatim questions

---

### Sub-Task 9 — SM-2 Spaced Repetition Engine

**Status:** [ ] pending

**Intent**
Implement the SM-2 scheduling algorithm for Examination questions so that correct answers space out reviews and incorrect answers reset the interval, exactly as Anki does.

**Expected Outcomes**
- `sm2.ts` module exports `updateSM2(state, rating)` — pure function, returns new SM-2 state
- Rating 1 (again) resets interval to 1 day, decreases ease factor
- Rating 3 (good) advances interval per SM-2 formula
- `get-due-exam-questions` IPC handler returns questions whose `due_date <= today`
- Answer recorded in `answer_history`; `sr_state` updated after each answer

**Todo List**
1. Create `src/main/sr/sm2.ts` — implement standard SM-2: `interval' = interval * ease`, `ease' = ease + (0.1 - (3 - rating) * (0.08 + (3 - rating) * 0.02))`, minimum ease 1.3, rating 1 resets interval to 1
2. Create `src/main/sr/scheduler.ts` — `getDueQuestions(folderId?)` queries `sr_state JOIN questions` where `due_date <= today`; `recordAnswer(questionId, rating)` calls `updateSM2`, writes back to `sr_state`, inserts into `answer_history`
3. Add IPC handlers: `get-due-exam-questions`, `record-exam-answer`
4. Write unit tests for `sm2.ts` covering: first correct, first incorrect, repeated correct, ease floor

**Relevant Context**
- Only `exam_verbatim` and `exam_modified` question types use SM-2
- Feynman and MC conceptual questions use pass/fail re-queue (Sub-Task 7), not SM-2

---

### Sub-Task 10 — Modified Examination Questions

**Status:** [ ] pending

**Intent**
Generate "modified" exam questions by using Jev in two passes: first to assess whether merging or splitting verbatim questions makes sense, then to verify the generated question retains its conceptual relationships to the source Materials (e.g. a multi-stage physics problem must still cover the same underlying concepts). The LLM produces the question and solution grounded in Materials. Users can flag bad generated questions.

**Expected Outcomes**
- "Generate Modified Questions" action available per Examination file
- Jev Pass 1 scores candidate merge/split pairs for semantic relatedness; only high-probability pairs proceed to LLM
- LLM produces modified question + solution methodology citing Materials chunks
- Jev Pass 2 scores the generated question prompt against the source Materials chunks; questions that fail concept-retention threshold are discarded
- Modified question stored with `type = exam_modified`; SM-2 state initialized
- Expandable widget on the right side of the study screen shows the Materials methodology source
- User can mark a question as "bad" (`is_bad = 1`) which permanently excludes it from decks

**Todo List**
1. Create `src/main/questions/modifiedExam.ts`:
   a. Fetch candidate pairs of verbatim exam questions from the same folder
   b. **Pass 1 — merge-fit:** Call Jev with both question prompts to get a semantic relatedness score; only proceed if score ≥ threshold (e.g. 0.65)
   c. Call LLM to generate the merged/split/reformulated question; prompt includes both source question prompts and the relevant Materials chunks from LanceDB
   d. Parse LLM response: `{ prompt, answer, solution_methodology, source_chunk_ids[] }`
   e. **Pass 2 — concept retention:** Call Jev with the newly generated question prompt vs. the concatenated source Materials chunks to verify the question still covers the original concepts; discard if score < threshold (e.g. 0.60)
2. Save passing questions with `type = exam_modified`, insert SM-2 initial state
3. Add IPC handler `generate-modified-questions` with params `{ folderId }`
4. Add IPC handler `mark-question-bad` with params `{ questionId }` — sets `is_bad = 1`
5. In the study screen (Sub-Task 11), add a collapsible right-side panel showing `solution_methodology` and source chunks when a modified question is active

**Relevant Context**
- Jev Pass 1: scores semantic relatedness between two question *prompts* (do they test related concepts worth combining?)
- Jev Pass 2: scores the generated question *prompt* against source *Materials chunks* to confirm conceptual integrity is preserved (e.g. a multi-stage physics problem still references all required concepts from the source material)
- Both thresholds are configurable in settings alongside the Feynman pass/fail threshold (Sub-Task 2)
- "Bad" questions are filtered out of all deck queries via `WHERE is_bad = 0`

---

### Sub-Task 11 — Main Study Screen

**Status:** [ ] pending

**Intent**
Build the primary study interface: the right-hand panel showing one question at a time with the appropriate answer input, feedback, and deck navigation. This ties together all question types and evaluation logic.

**Expected Outcomes**
- Study session can be started for a Content folder or a specific file
- Questions are drawn from the due deck (SM-2 for exam, re-queue logic for Feynman/MC)
- MC questions display 4 answer options; correct/incorrect feedback shown immediately with source citation
- Numeric questions display a text input; answer checked exactly (or within tolerance)
- Feynman questions display a text area + mic button; Jev evaluation shown after submission
- Modified exam questions show the collapsible methodology panel on the right
- Session ends when deck is empty; summary screen shows score breakdown
- Keyboard shortcuts: 1 = again, 3 = good for SM-2 questions

**Todo List**
1. Create `src/renderer/pages/StudyPage.tsx` — top-level page; receives `folderId` or `fileId` as route param
2. Create `src/main/study/deck.ts` — `buildDeck(folderId)` combines due SM-2 questions + all-pending Feynman/MC questions; returns ordered list; handles re-queue insertions
3. Create `src/renderer/components/QuestionCard/` with sub-components: `MCQuestion.tsx`, `NumericQuestion.tsx`, `FeynmanQuestion.tsx` (includes `VoiceInput` from Sub-Task 7)
4. Create `src/renderer/components/SourceCitation.tsx` — fetches and displays the source chunk text for a given `source_ref`; used by all question types
5. Create `src/renderer/components/MethodologyPanel.tsx` — collapsible right panel for modified exam questions
6. Wire answer submission to IPC: MC/Numeric → `record-exam-answer`, Feynman → `evaluate-feynman-answer`
7. After each answer, update local deck state (re-queue or pop) and advance to next card
8. Build `SessionSummary.tsx` shown when deck is empty: total questions, pass rate, time spent

**Relevant Context**
- `buildDeck` must filter `is_bad = 0` and respect `due_date` for SM-2 questions
- SM-2 ratings 1 and 3 are the only valid values per spec
- Feynman re-queue: fail = insert after position `min(currentIndex + 3, deckLength - 1)`; pass = append

---

### Sub-Task 12 — Per-File Question History Panel

**Status:** [ ] pending

**Intent**
Let users view all questions associated with a content file directly from the sidebar, so they can audit generated/extracted questions and see past performance.

**Expected Outcomes**
- Clicking a file in the sidebar opens a Question History panel in the main area (or a slide-over)
- Panel lists all questions for that file (not bad ones by default, with toggle to show bad)
- Each question row shows: type badge, prompt preview, last score, due date (for SM-2), created date
- Clicking a question expands it to show full prompt, answer, source citation

**Todo List**
1. Create `src/renderer/pages/FileHistoryPage.tsx` — receives `fileId` as route param
2. Add IPC handler `get-questions-for-file` returning all questions + latest answer_history row per question
3. Build `QuestionHistoryList.tsx` — virtualized list (react-window) for large question sets; filter/sort controls
4. Build `QuestionHistoryItem.tsx` — collapsed row + expandable detail view; "Mark Bad" button on each item
5. Route from `FileItem` sidebar click → `FileHistoryPage`

**Relevant Context**
- Re-uses `SourceCitation.tsx` from Sub-Task 11 for the expanded detail view
- "Mark Bad" calls `mark-question-bad` IPC handler from Sub-Task 10

---

## Dependency Order

```
Sub-Task 1 (Scaffold)
  └─> Sub-Task 2 (Settings / LLM)
        └─> Sub-Task 3 (DB Schema)
              ├─> Sub-Task 4 (Sidebar UI)
              │     └─> Sub-Task 5 (Ingestion)
              │           ├─> Sub-Task 6 (Materials Questions)
              │           │     └─> Sub-Task 7 (Feynman Eval)
              │           └─> Sub-Task 8 (Exam Extraction)
              │                 ├─> Sub-Task 9 (SM-2)
              │                 └─> Sub-Task 10 (Modified Exam)
              └─> Sub-Task 11 (Study Screen) — requires 7, 9, 10
                    └─> Sub-Task 12 (Question History)
```
