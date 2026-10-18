# Didact — Pass 1 Changes

## Overview

Full greenfield implementation of the Didact macOS desktop application (Electron + React/TypeScript + Vite) as specified in `didact-plan.md`. All 12 sub-tasks completed in a single pass.

---

## Files Created

### Configuration & Root
| File | Purpose |
|------|---------|
| `package.json` | Runtime + dev deps, npm scripts (`dev`, `build`, `test`, `lint`), electron-builder macOS config |
| `tsconfig.json` | Renderer TypeScript config (ESNext/bundler, React JSX) |
| `tsconfig.electron.json` | Main process TypeScript config (CommonJS output to `dist-electron/`) |
| `vite.config.ts` | Vite config — renderer root `src/renderer`, output `dist/` |
| `jest.config.json` | ts-jest config targeting `tests/**/*.test.ts` |
| `.prettierrc` | Prettier: 2-space, double-quote, ES5 trailing commas |
| `eslint.config.js` | Flat ESLint config with `@typescript-eslint` |

### Shared
| File | Purpose |
|------|---------|
| `src/shared/ipc-channels.ts` | All IPC channel names as a typed `IPC` constant object; imported by both preload and main process |

### Electron Entry
| File | Purpose |
|------|---------|
| `src/main.ts` | App entry — creates `BrowserWindow`, runs DB migration, registers all IPC handler groups |
| `src/preload.ts` | `contextBridge` exposing `window.didact.invoke`, `window.didact.on`, `window.didact.IPC` |

### Main Process — Settings
| File | Purpose |
|------|---------|
| `src/main/settings.ts` | JSON-file settings persistence at `userData/settings.json`; `getSettings()` / `setSettings(partial)` + IPC handlers |

### Main Process — LLM Client
| File | Purpose |
|------|---------|
| `src/main/llm/client.ts` | `LLMClient` class with `complete(prompt, options)` and `embed(texts)` dispatching to OpenAI, Gemini, or Cursor API |

### Main Process — Database
| File | Purpose |
|------|---------|
| `src/main/db/schema.sql` | 6-table SQLite schema: `content_folders`, `content_files`, `questions`, `sr_state`, `answer_history`, `essential_propositions`, `schema_version` |
| `src/main/db/index.ts` | `getDb()` — `better-sqlite3` singleton with WAL mode and foreign keys |
| `src/main/db/migrate.ts` | Version-gated migration runner — reads `schema.sql`, runs idempotent `CREATE TABLE IF NOT EXISTS` |
| `src/main/db/types.ts` | TypeScript interfaces for every table row and all answer JSON shapes (`McAnswer`, `FeynmanAnswer`, `ExamVerbatimAnswer`, `ExamModifiedAnswer`) |
| `src/main/db/handlers.ts` | IPC: `list-content-folders`, `create-content-folder`, `list-files-for-folder`, `get-question-count-for-file` |

### Main Process — Ingestion
| File | Purpose |
|------|---------|
| `src/main/ingest/parser.ts` | File → plain text: PDF (`pdf-parse`), DOCX (`mammoth`), TXT/MD (fs), images (LLM vision) |
| `src/main/ingest/chunker.ts` | Paragraph-boundary overlapping chunker (~512 token target, ~64 token overlap) |
| `src/main/ingest/embedder.ts` | Calls `LLMClient.embed()` per chunk batch → `EmbeddedChunk[]` |
| `src/main/ingest/lancedb.ts` | LanceDB `chunks` table: `upsertChunks`, `searchChunks`, `getChunksForFile`, `getChunkById` |
| `src/main/ingest/index.ts` | Ingestion orchestrator: parser → chunker → embedder → LanceDB → SQLite; emits `ingest-progress` push events |
| `src/main/ingest/handlers.ts` | IPC: `ingest-file` (opens file dialog, runs pipeline), `get-chunk-by-id` |

### Main Process — Jev Client
| File | Purpose |
|------|---------|
| `src/main/jev/client.ts` | TypeSafe AI REST calls; `evaluateFeynmanAnswer(questionId, userAnswer)` → `{ pass, score, feedback }`; `jevScore(text1, text2)` for relatedness |

### Main Process — Questions
| File | Purpose |
|------|---------|
| `src/main/questions/materialsMC.ts` | LLM → multiple-choice conceptual questions from Materials chunks; saves to `questions` with `type = mc_conceptual` |
| `src/main/questions/feynman.ts` | LLM → Feynman questions + model answer + essential propositions; saves to `questions` + `essential_propositions` |
| `src/main/questions/examExtract.ts` | LLM verbatim exam Q&A extraction with time-limit bucket inference; SM-2 state init; semantic source linking via LanceDB |
| `src/main/questions/modifiedExam.ts` | Two-pass Jev-gated modified question generation (merge-fit + concept-retention); saves `type = exam_modified` with SM-2 init |
| `src/main/questions/handlers.ts` | IPC: `generate-material-questions`, `extract-exam-questions`, `generate-modified-questions`, `evaluate-feynman-answer`, `mark-question-bad`, `set-time-limit-bucket`, `get-questions-for-file` |

### Main Process — Spaced Repetition
| File | Purpose |
|------|---------|
| `src/main/sr/sm2.ts` | Pure `updateSM2(state, rating)` function — standard SM-2 algorithm, ratings 1/3, ease floor 1.3 |
| `src/main/sr/scheduler.ts` | `getDueQuestions(folderId?)` + `recordExamAnswer(questionId, rating)` — reads/writes `sr_state` and `answer_history` |
| `src/main/sr/handlers.ts` | IPC: `get-due-exam-questions`, `record-exam-answer`, `build-deck` (combines SM-2 due + all pending Feynman/MC) |

### Renderer — Core
| File | Purpose |
|------|---------|
| `src/renderer/index.html` | HTML entry with strict CSP |
| `src/renderer/main.tsx` | React 18 root, `HashRouter`, mounts `App` |
| `src/renderer/App.tsx` | Route tree: `/`, `/study/:folderId`, `/study/file/:fileId`, `/history/:fileId`, `/settings` |
| `src/renderer/App.module.css` | Flex layout: sidebar + main |
| `src/renderer/styles/global.css` | CSS variables, reset, scrollbars, base typography |
| `src/renderer/types.d.ts` | `*.module.css` type declarations |
| `src/renderer/hooks/useIpc.ts` | `useIpc()` → `{ invoke, on }`; `useIpcListener()` for push event subscriptions with auto-cleanup |

### Renderer — Sidebar
| File | Purpose |
|------|---------|
| `src/renderer/components/Sidebar/Sidebar.tsx` | Folder list, "New Content Folder" inline form, ⚙ Settings link |
| `src/renderer/components/Sidebar/ContentFolder.tsx` | Expandable folder — always renders exactly two fixed sub-folders (Materials, Examinations) + Study button |
| `src/renderer/components/Sidebar/SubFolder.tsx` | File list, upload button (triggers `ingest-file` IPC), ingestion progress display |
| `src/renderer/components/Sidebar/FileItem.tsx` | Filename, question-count badge, generate/extract button, navigate to history on click |
| `src/renderer/components/Sidebar/types.ts` | Shared `IngestProgress` interface |

### Renderer — Question Cards
| File | Purpose |
|------|---------|
| `src/renderer/components/QuestionCard/MCQuestion.tsx` | 4-option MC with immediate correct/wrong reveal and source citation |
| `src/renderer/components/QuestionCard/NumericQuestion.tsx` | Text input + answer reveal + SM-2 rating buttons (1 / 3) |
| `src/renderer/components/QuestionCard/FeynmanQuestion.tsx` | Textarea + mic, calls Jev, shows score badge + per-proposition breakdown + model answer |
| `src/renderer/components/QuestionCard/SourceCitation.tsx` | Collapsible source chunk text fetched via `get-chunk-by-id` |

### Renderer — Shared Components
| File | Purpose |
|------|---------|
| `src/renderer/components/VoiceInput.tsx` | Web Speech API mic button with interim transcript display |
| `src/renderer/components/MethodologyPanel.tsx` | Collapsible right-side panel showing solution methodology and source chunk IDs for modified exam questions |

### Renderer — Pages
| File | Purpose |
|------|---------|
| `src/renderer/pages/WelcomePage.tsx` | Onboarding screen with 4-step getting-started guide |
| `src/renderer/pages/SettingsPage.tsx` | Provider radio buttons, API key fields (password inputs), threshold range sliders |
| `src/renderer/pages/StudyPage.tsx` | Full deck engine: `build-deck` IPC, SM-2 rating handling, Feynman re-queue logic, session summary |
| `src/renderer/pages/FileHistoryPage.tsx` | Question list with type badges, last score, due date, expandable detail view, mark-bad button, show-flagged toggle |

### Tests
| File | Purpose |
|------|---------|
| `tests/sm2.test.ts` | 7 unit tests: first correct, second correct, third correct (interval formula), first fail, fail after streak, ease floor, due-date future |
| `tests/__mocks__/electron.ts` | Minimal Electron mock (`app.getPath`, `ipcMain`, `BrowserWindow`, `dialog`) for Jest isolation |

---

## Design Decisions (Pass 1)

### Settings storage: plain JSON instead of `electron-store`
`electron-store` v10 is ESM-only and incompatible with the CommonJS compilation target required by the Electron main process. Replaced with a direct `fs.readFileSync` / `fs.writeFileSync` approach writing to `userData/settings.json`. Functionally equivalent; no encryption (acceptable for API keys stored locally on a personal Mac).

### LanceDB query API: `.query().where()` not `.filter()`
LanceDB v0.18 removed the top-level `.filter()` shorthand. All non-vector queries use `.query().where(sqlFilter).toArray()`. Vector queries use `.search(vector).limit(n)` with an optional `.where(filter)` chained on the `VectorQuery`.

### SM-2 ratings: strictly 1 and 3
Per the spec ("correct answer = pressing 3 (good), wrong = 1 (again)"). The standard SM-2 intermediate ratings (2, 4, 5) are not exposed. The ease-factor update formula is applied with these two values only: rating 3 increases ease slightly, rating 1 decreases it, both floored at 1.3.

### Feynman re-queue: `min(currentIndex + 3, deckLength - 1)`
Failed Feynman questions are spliced back into the deck at `currentIndex + 3` (or the last position if fewer than 3 cards remain). Passed questions are appended to the end. This is handled entirely in renderer state — no IPC round-trip needed.

### Two-pass Jev validation for modified questions
- **Pass 1 (merge-fit):** Jev scores the two source question *prompts* against each other. Only pairs with relatedness ≥ `mergeRelatenessThreshold` (default 0.65) advance to the LLM.
- **Pass 2 (concept retention):** Jev scores the *generated question prompt* against the concatenated source *Materials chunks*. Questions scoring below `conceptRetentionThreshold` (default 0.60) are discarded. Both thresholds are configurable in Settings.

### IPC channel constants in `src/shared/`
All channel names live in [`src/shared/ipc-channels.ts`](src/shared/ipc-channels.ts) as a single `IPC` object. The preload script exposes the full object as `window.didact.IPC`, so the renderer never imports Node modules just to read a string constant.

### CSS Modules throughout
All component styles use `*.module.css` files with a custom type declaration in [`src/renderer/types.d.ts`](src/renderer/types.d.ts). A single [`src/renderer/styles/global.css`](src/renderer/styles/global.css) defines the CSS custom-property design tokens (`--bg`, `--surface`, `--accent`, etc.) used everywhere.

---

## Test Results (Pass 1)

```
PASS tests/sm2.test.ts
  SM-2 updateSM2
    ✓ first correct answer gives interval 1, increments repetitions
    ✓ second correct answer gives interval 6
    ✓ third correct answer multiplies by ease factor
    ✓ first incorrect answer resets interval to 1 and repetitions to 0
    ✓ incorrect after several correct resets interval and repetitions
    ✓ ease factor floor is 1.3
    ✓ due_date is in the future after correct answer

Tests: 7 passed, 7 total
```

TypeScript: zero errors on both `tsconfig.json` (renderer) and `tsconfig.electron.json` (main process).
