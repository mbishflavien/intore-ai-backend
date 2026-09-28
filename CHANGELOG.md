# Changelog

All notable changes to IntoreAI (backend **and** frontend) are documented here.

## [Unreleased]

### Backend — Week 1 Mugisha: indexes, CI/CD, Docker

#### Mugisha #1 — MongoDB indexes
- **`api/src/repositories.ts`** — new `ensureMongoIndexes()` (idempotent `createIndex`): jobs `{status}`, `{createdAt:-1}`; applications `{jobId,applicantId}`, `{status}`; users `{email}` unique; plus supporting `{id}` uniques, owner/lookup keys (jobs recruiterId, applications jobId/applicantId, username unique, screening_runs id+createdAt, recruiter_reviews screeningRunId, profiles applicantId, proof_challenges recruiterId, proof_submissions jobId+applicantId, interviews/notifications/activity owner keys).
- **`api/src/repos.ts`** — `initRepos()` calls it when `MONGODB_URI` is set (skipped in ephemeral in-memory mode); per-index failures warn, never crash boot.
- Note: task listed screenings `(jobId, score)` — screening_runs store opaque run records (no top-level jobId/score), so runs are indexed by `{id}` + `{createdAt}` (the actual query paths) instead.

#### Mugisha #2 — CI/CD pipeline
- **`.github/workflows/ci.yml`** — on PR/push to main+dev: `npm ci`, workspace typecheck, workspace build, boot smoke test in in-memory mode (`/health` 200, empty-register 400 Zod check, unknown-route non-2xx).
- **`.github/workflows/deploy.yml`** — on push to main: full verify, then `DEPLOY_HOOK_URL` trigger (skips with notice when secret unset; set it to enable auto-deploy).

#### Mugisha #3 — Docker setup
- **`api/Dockerfile`** (multi-stage node:20-alpine, compiled `node dist/api/src/server.js`), **`parser-llm/Dockerfile`** (python:3.11-slim, model mounted not baked), **`Dockerfile`** in `intore-ai-frontend` (+ new `npm start` script) for web.
- **`docker-compose.yml`** — mongo (healthchecked, persisted volume) + api (JWT_SECRET required, secure defaults) + web (build-arg API URL) + parser (opt-in `parser` profile, model volume).
- Verified: `docker compose config` valid; API boots healthy in in-memory mode with indexes skipped. Image builds need a running Docker daemon (not available on this machine — first `docker compose build` will confirm).

### Frontend — Week 2 Friend (built in `intore-ai-frontend`)
- Friend #3: skeletons rolled out everywhere (`DashboardSkeleton` + `TableSkeleton` new; all full-page spinners replaced; button spinners kept).
- Friend #4: persisted dark mode (ThemeProvider + no-FOUC boot, header toggles, Tailwind class-based dark variant + dark glass/text layer).
- Friend #5: responsive collapsible sidebar (`AppSidebar` + `useSidebar` shared; icon pillar ↔ labeled rail on desktop, slide-over drawer + hamburger on mobile, responsive content padding).
- Verified: `npm run typecheck` + `npm run build` pass.

### Frontend — Week 2 Sam (built in `intore-ai-frontend`)
- Sam #3: ProofHire timer (persisted deadline, auto-submit at zero) + time/assessment progress bars + 30s autosave with localStorage backup + mobile sticky action bar.
- Sam #4: Saved jobs (`lib/saved-jobs.ts` localStorage store, All/Saved tabs, bookmark toggles, extended search, skeletons).
- Sam #5: Notifications center (`/applicant/notifications` — filters, per-item + mark-all read via `POST /:id/read` + `/read-all`, optimistic rollback, deep links, sidebar entry); `lib/api.ts` gains `notifications.markOne`.
- Verified: `npm run typecheck` + `npm run build` pass (24 routes incl. new notifications page).

### Backend — Week 2 Flavien: Express + Zod + rate-limit + RBAC (secure)

#### Express migration (Task #4)
- **`api/src/server.ts`** — now a thin bootstrap (`startServer()` from `app.ts`); raw `node:http` dispatch + `writeJson/readJsonBody` removed from the request path.
- **`api/src/app.ts`** (new) — Express 4 app factory: `helmet` (HSTS/nosniff/frameguard, CSP off for JSON API), `cors` allow-list (`ALLOWED_ORIGINS`, evil origins → 403), `express.json({limit:"15mb"})`, `trust proxy: 1`, global 429/404 JSON + invalid-JSON 400 handler.
- **`api/src/config.ts` / `repos.ts` / `helpers.ts` / `http.ts`** (new) — runtime config gate, repository singletons, shared screening/job/proof helpers, `param()` route-param coercion.
- **`api/src/routes/*`** (new) — grouped routers preserving every legacy path/status: `auth`, `jobs` (+publish/close/applications/screen), `applications`, `proofhire`, `interviews`, `notifications`, `profiles`, `screening` (/screen, /screenings, /reviews, /ingest/*), `training` + `mentor` + `recruiter` + `system`/`misc` (/stats, /activity, /users/delete).
- Deps: `express@4`, `helmet`, `cors`, `express-rate-limit`, `zod` (+ `@types/express`, `@types/cors`).

#### Zod validation (Task #5)
- **`api/src/schemas/index.ts`** (new) — strict schemas for all major routes: register/login, screening request, reviews, CSV/resume ingest (15MB cap), challenge create, ProofHire config/submission, job create, application create/status, interview create, profile save, training progress/practice-evaluate, mentor chat.
- **`api/src/middleware/validate.ts`** (new) — `validateBody/validateQuery` → 400 `{error, details[]}`; replaces manual `if (!body.title)` checks.

#### Rate limiting (Task #6)
- **`api/src/middleware/rateLimit.ts`** (new) — `express-rate-limit` policies preserving pre-Express budgets: login 30/min, register 30/min, ingest 20/min, general API 300/min; `draft-8` headers only, JSON 429 body, IPv6-safe key via `ipKeyGenerator(req.ip)+userId`.

#### RBAC + auth-gap fixes (Task #8)
- **`api/src/middleware/auth.ts` / `rbac.ts`** (new) — `attachUser` (jose HS256, never throws) + `requireAuth` (401) + `requireRole("recruiter"|"applicant")` (403, no role leak).
- Every protected route now declares its role; ownership still enforced per-record (job owner via `ownsJob`, notification `userId` check, challenge `recruiterId` check, self-delete username match).
- **Fixed:** `GET /api/proofhire/jobs/:id/questions` was unauthenticated and leaked per-submission rows — now recruiter-owner only, returns aggregate `{questions: [], submissionCount}`.
- **Fixed:** `GET /api/proofhire/challenges/:id` direct reads now recruiter-scoped (applicants use the job-scoped brief endpoint).
- Notification ordering kept exact-first: `POST /read-all` before `POST /:id/read` (no `read-all`-as-id misroute).

#### Verified live (Express, in-memory DB)
- `npm run typecheck` + `npm run build` pass (api, engine, shared).
- `GET /health` → 200 `{ok:true}`; evil-origin `Origin: https://evil.example.com` → 403; unknown route → 404 JSON.
- `POST /api/auth/register {}` → 400 Zod details; applicant JWT → `POST /api/jobs` 403; no token → `GET /api/notifications` 401.
- Applicant `GET /api/notifications` 200, `POST /read-all` `{success:true}`, `POST /notifications/nope/read` 404 (no misroute).
- Recruiter creates job 201; applicant → `GET /proofhire/jobs/:id/questions` 403; recruiter → 200 `{questions: [], submissionCount: 0}`.

### Backend — Guided apply flow + security trio

#### Guided apply enforcement (Appendix A.4)
- **`packages/shared/src/index.ts`** — `TalentProfile` gains `resumeUploaded/resumeFileName/resumeUploadedAt`; new `checkProfileCompleteness()` single source of truth (name, headline, location, ≥3 skills, ≥1 experience, ≥1 education).
- **`api/src/server.ts` `POST /api/applications`** — rejects incomplete profiles (400 + `missing` list) and missing resume upload (400); required-ProofHire no longer blocks applying (recorded as-is, completed post-apply).
- **`POST/PUT /api/profiles`** — responses now include `completeness`; starter profile ships `resumeUploaded: false`.
- **`api/src/resume.ts`** — cross-platform venv resolution (`venv/Scripts/python.exe` on Windows); accepts `application/octet-stream` PDFs.

#### Security trio
- **`api/src/auth.ts`** — bcryptjs (cost 10) replaces SHA-256; legacy `salt:hex` hashes still verify with transparent re-hash-on-login migration (`userRepo.updatePasswordHash`, in-memory + Mongo); JWT via `jose` HS256 (clean cut — old hand-rolled tokens no longer verify); refuses insecure fallback secret outside development.
- **`api/src/server.ts`** — boot-time `validateRuntimeConfig()` (JWT_SECRET, MONGODB_URI/ALLOW_IN_MEMORY_DB, GEMINI_API_KEY warning, ALLOWED_ORIGINS warning; `process.exit(1)` on failure); CORS `*` replaced with `ALLOWED_ORIGINS` allow-list (defaults to localhost:3000); `GET /api/recruiter/notifications` is now read-only + new explicit `POST /api/recruiter/notifications/read-all`; sliding-window rate limiting (auth 30/min, ingest/resume 20/min).
- **`api/.env.example`** — documents `ALLOW_IN_MEMORY_DB`, required `JWT_SECRET`, `ALLOWED_ORIGINS`.

#### Verified live
- jose token round-trip, forged token → 401; bcrypt round-trip + legacy-hash verify; incomplete profile → 400 + missing list; resumeless → 400; full apply on required-ProofHire job → 201 `submitted/not_started`; evil-origin CORS blocked, localhost allowed; seed burst correctly 429'd; recruiter feed unread stable across polls; server refuses boot without `MONGODB_URI`/`ALLOW_IN_MEMORY_DB`.

### Frontend — Week 1 High priorities (Sam + Friend, built in `intore-ai-frontend`)
- Friend #2: new `components/ui/` library (Button, Card, Modal, Badge, Table, Toast, Avatar, Dropdown, Tabs, Skeleton).
- Friend #1: inline `style={{}}` 92 → 3 (only data-driven progress widths remain); rewrote landing + both ProofHire applicant pages in glass-morphism.
- Sam #2: 5-stage application status tracker (Applied → Screened → Shortlisted → Interview → Decision) with stats, filters, skeletons.
- Sam #1: new `/applicant/prep` Prep Room reusing training API (quiz drills + employer challenges), wired into sidebar.
- Verified: `npm run typecheck` + `npm run build` pass (23 routes).

### Backend — `intore-ai-backend`

#### New: Applicant self-training (Upskill)

- **`packages/shared/src/index.ts`** — Added training & mentor domain types: `TrainingLevel`, `TrainingQuizQuestion`, `TrainingUnit`, `TrainingModule`, `TrainingProgress`, `TrainingRecommendation`, `PracticeChallengeLite`, `MentorTurn`/`MentorTurnRole`, `MentorQuizState`, `MentorSession`, `MentorChatRequest`, `MentorChatResponse`.
- **`api/src/trainingContent.ts`** (new) — Curated 13-track learning catalog: React & Next.js, TypeScript, Node.js, Python, SQL, Data Analysis, Machine Learning, DevOps, UI/UX Design, Product Management, React Native, QA, Digital Marketing. Each track has 3 units with lesson content, apply-it checklists, topic quizzes, and curated external resources. Includes `findTrainingModuleForSkill` skill → module resolution (works for related skill aliases like "REST APIs").
- **`api/src/training.ts`** (new) — Training service: module accessors, in-memory unit progress store, skill-gap recommendations derived from posted jobs, and the offline AI mentor coach engine with per-session state (lesson told → quiz posed → answer graded → next topic), plus JSON support logs.
- **`api/src/server.ts`** — New applicant-facing endpoints:
  - `GET /api/training` — list catalog.
  - `GET /api/training/:id` — module by id or slug (e.g. `react-nextjs`).
  - `GET /api/training/recommendations` — top 8 skill-gap recommendations (applicant auth).
  - `GET /api/training/progress` and `POST /api/training/progress/:moduleId` — read/update unit progress.
  - `GET /api/training/practice` — ProofHire challenges from published jobs with ProofHire enabled.
  - `GET /api/training/practice/:challengeId` — single challenge for the practice page.
  - `POST /api/training/practice/evaluate` — instant, non-recorded practice evaluation.
  - `POST /api/mentor/chat` — offline AI mentor (applicant auth).

#### New: Demo seed data

- **`scripts/seed-demo.mjs`** (new) — Idempotent seed script (runs against the running API). Registers the two demo accounts plus **8 recruiters**, creates **3 ProofHire challenges** (coding, SQL, document), and publishes **14 real jobs** — a mix of Kigali/Rwanda (Rwanda FinServe, NuruPay, Ukwishyura Bank, Agaciro Agro, Inyenyeri Energy, Tamuka Fashion) and remote/global (Vista Remote, Atlantica Data). 3 jobs are wired with required/optional ProofHire assessments. Re-run after every backend restart (in-memory storage).
- **`README.md`** — Added "Demo data" section: seed command, credentials (all `demo1234`), and the in-memory reset caveat.
- **`.gitignore`** — Ignore `dev-api.log` / `dev-api.log.err` development logs.

### Frontend — `intore-ai-frontend`

#### New: Applicant self-training (Upskill)

- **`lib/types.ts`** — Training/mentor type additions mirroring the backend shared package.
- **`lib/api.ts`** — Added `api.training.*` (listModules, getModule, getProgress, markUnitComplete, getRecommendations, listPracticeChallenges, getPracticeChallenge, practiceEvaluate) and `api.mentor.chat` namespaces.
- **`app/applicant/layout.tsx`** — Sidebar now has **Learning Hub** (`/applicant/training`, GraduationCap) and **AI Mentor** (`/applicant/mentor`, Bot).
- **`app/applicant/page.tsx`** — Dashboard gains a 3-card **Upskill** section (Skill tracks, AI mentor, Practice).
- **`app/applicant/training/page.tsx`** (new) — **Learning Hub**: skill-gap "Recommended for your profile" modules (with Start CTAs / "Lesson soon" fallback), filterable 13-track library with level badges, lesson-count, time, and per-track progress bars; and a **Practice Zone** grid of real employer challenges (no-records, instant feedback badge). Signed-out visitors get a sign-in prompt.
- **`app/applicant/training/[id]/page.tsx`** (new) — Module detail: progress ring, expandable units with content + apply-it checklists + quizzes (immediate right/wrong feedback with explanations), "Mark unit complete" progress tracking, curated external resources, and AI Mentor CTAs seeded with the module's skill.
- **`app/applicant/mentor/page.tsx`** (new) — **AI Mentor** chat: skill picker (from catalog + General), coach lessons with inline quiz question buttons, correct-answer tracking, session reset, typing indicator.
- **`app/applicant/training/practice/[challengeId]/page.tsx`** (new) — Practice page: challenge brief, SQL/document tips, hints + references panels, code/document editor, instant non-recorded evaluation with score and strengths/gaps coach feedback; mentor help CTA.
- **`app/proofhire/applicant/jobs/[id]/page.tsx`** — Added "Practice this challenge without affecting your record" link into the training practice zone.

### Verified

- TypeScript strict typecheck passes in **both** repos (`npm run typecheck`).
- Live-tested vs `http://localhost:4000`: training catalog (13 modules), module-by-slug lookup, mentor chat (lesson + quiz), practice list (3 challenges), practice evaluate (score 92), recommendations (8, all resolve to a module), progress updates.
- Full application pipeline verified: ProofHire challenge evaluation (score 88 → passed) → application submitted with `proofHireStatus: passed` → recruiter screening returns shortlist (overall 69, proof 88, "Viable shortlist candidate").
- All new frontend routes render 200 on `http://localhost:3000`.

## [0.1.0] — Initial platform

- **Backend**: IntoreAI scoring engine, transparent/explainable screening, ProofHire challenges, JWT auth (HS256), MongoDB with in-memory fallback, local resume parser.
- **Frontend**: Next.js web app with design system, applicant and recruiter dashboards, ProofHire assessment UI.