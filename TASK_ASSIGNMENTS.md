# IntoreAI Backend — Task Assignments & Development Roadmap

**Project:** IntoreAI — AI-Powered Talent Screening Platform (Backend)
**Date:** September 17, 2026
**Team:** 3 Fullstack Developers
**Related repo:** Frontend tasks live in **intore-ai-frontend** (FE Dev 1–3).

---

## Current Status: Phase 1 MVP (Backend, Completed)

- Weighted scoring engine (5 dimensions: experience, education, relevance, proof score, skills)
- Anonymized screening pipeline with Gemini AI reasoning (offline fallback)
- Fraud-risk detection (disposable emails, sparse evidence, AI-generated content)
- ProofHire auto-graded challenges (6 types, in-engine grading)
- Authentication system (register/login/JWT via crypto.subtle, salted hashing)
- Notifications & interview scheduling API
- Resume ingestion & parsing (PDF + TXT via Python LLM parser) — cross-platform path resolution
- `.env.example` documenting all required environment variables
- In-memory fallback when MongoDB is unavailable

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + TypeScript (node:http, ESM, npm workspaces) |
| Database | MongoDB 6.x (in-memory fallback) |
| AI Engine | Google Gemini 1.5 Flash (offline fallback) |
| Resume Parser | Python FastAPI + Qwen2.5-1.5B GGUF |
| Auth | Custom JWT HS256 + salted hashing |

---

## TASK ASSIGNMENTS (Backend)

---

### FULLSTACK DEV 1 — Backend/API & Integrations

| # | Task | Description | Priority | Deadline |
|---|------|-------------|----------|----------|
| 1 | ~~Fix notification route bug~~ ✅ Done | `/api/notifications/:id/read` now matches `parts.length === 4 && parts[3] === "read"`, loads the notification, and verifies ownership (403) — conflicts with `/api/notifications/read-all` resolved | — | — |
| 2 | ~~Fix resume parser cross-platform path~~ ✅ Done | resume.ts now resolves `parser-llm` via `PARSER_DIR`, `cwd`, and relative paths — no hardcoded Linux path | — | — |
| 3 | ~~Add `.env.example`~~ ✅ Done | `api/.env.example` documents all required vars: `GEMINI_API_KEY`, `GEMINI_MODEL`, `MONGODB_URI`, `MONGODB_DB`, `JWT_SECRET`, `API_PORT`, `PARSER_DIR`, `PARSER_SERVICE_URL`, `SCREENING_TOP_N`, `SCREENING_MIN_SCORE` | — | — |
| 4 | Migrate to proper HTTP framework | Replace raw `node:http` with Express or Fastify for middleware support, route grouping, error handling | Medium | 2 weeks |
| 5 | Add input validation middleware | Integrate Zod schemas for all API request bodies and query params | Medium | 2 weeks |
| 6 | Add rate limiting | Implement request throttling (e.g., express-rate-limit or custom) to prevent abuse | Medium | 2 weeks |
| 7 | Build audit/decision log | New repository + API endpoints for immutable decision logging (who decided what, when, why) | Low | 3 weeks |
| 8 | Add RBAC middleware | Route-level middleware enforcing recruiter vs applicant access on protected endpoints | Medium | 2 weeks |

---

### FULLSTACK DEV 2 — Screening Engine & AI Pipeline

| # | Task | Description | Priority | Deadline |
|---|------|-------------|----------|----------|
| 1 | Build unified 360° scorecard endpoint | Single API endpoint combining resume scoring + ProofHire results + interview feedback into one ranked candidate view | **High** | 1 week |
| 2 | Improve Gemini prompt templates | Refine `promptBuilder.ts` prompts for better structured reasoning output, add few-shot examples, improve consistency | **High** | 1 week |
| 3 | Add central question bank | New repository + CRUD API for managing a shared pool of screening/interview questions per role type | Medium | 2 weeks |
| 4 | Add telemetry/integrity monitoring | Capture attention signals during ProofHire challenges (tab switches, time per question, copy-paste events) | Medium | 2 weeks |
| 5 | Build cognitive aptitude test engine | New challenge type for timed logical/analytical reasoning tests with scoring | Medium | 3 weeks |
| 6 | Build multi-interviewer panel comparison | API logic to aggregate scores from multiple interviewers for the same candidate | Low | 3 weeks |
| 7 | Build flywheel contributor loop | Re-rank talent pool based on recruiter feedback signals (hire/reject outcomes improve future scoring) | Low | 4 weeks |

---

### FULLSTACK DEV 3 — Data, Auth & DevOps

| # | Task | Description | Priority | Deadline |
|---|------|-------------|----------|----------|
| 1 | Add MongoDB indexes | Create indexes on jobs (status, createdAt), applications (jobId, applicantId, status), screenings (jobId, score), users (email unique) | **High** | 1 week |
| 2 | Set up CI/CD pipeline | GitHub Actions workflow: lint, typecheck, build, test on PR; auto-deploy on merge to main | **High** | 1 week |
| 3 | Docker setup | Dockerfile for API + Parser; docker-compose.yml orchestrating services + MongoDB | **High** | 1 week |
| 4 | Add org/company profiles | Multi-tenant org model, company profile CRUD, team member management | Medium | 2 weeks |
| 5 | Build candidate prep mode API | Endpoint serving question bank filtered by job role for applicant practice | Medium | 2 weeks |
| 6 | GDPR/compliance controls | Data retention policies, export endpoint (right to data portability), hard delete endpoint (right to erasure) | Medium | 3 weeks |
| 7 | Write integration tests | End-to-end tests for screening pipeline: ingest → parse → score → rank → reason → return | Medium | 2 weeks |

---

## Backend Development Timeline

### Week 1 (Sep 17–23) — Critical Fixes & Foundation

| Dev | Tasks | Deliverables |
|-----|-------|-------------|
| FS Dev 1 | Fix notification route | Stable API with no broken routes |
| FS Dev 2 | Build 360° scorecard API, improve Gemini prompts | Unified scoring endpoint, better AI reasoning quality |
| FS Dev 3 | MongoDB indexes, CI/CD pipeline, Docker setup | Fast queries, automated builds, containerized deployment |

### Week 2 (Sep 24–30) — Feature Expansion

| Dev | Tasks |
|-----|-------|
| FS Dev 1 | Migrate to Express/Fastify, add Zod validation, rate limiting, RBAC |
| FS Dev 2 | Central question bank, telemetry/integrity monitoring |
| FS Dev 3 | Org profiles, candidate prep API, integration tests |

### Week 3+ (Oct 1+) — Stretch Goals & Polish

| Dev | Tasks |
|-----|-------|
| FS Dev 1 | Audit/decision logging |
| FS Dev 2 | Cognitive aptitude engine, multi-interviewer panel |
| FS Dev 3 | GDPR compliance controls |

---

## Known Bugs to Fix Immediately

1. ~~Notification route conflict~~ ✅ Fixed — `/api/notifications/:id/read` guard corrected to `parts.length === 4 && parts[3] === "read"`; ownership check added (404/403) (FS Dev 1 #1)
2. ~~Parser hardcoded path~~ ✅ Fixed — resume.ts resolves `parser-llm` relatively via `PARSER_DIR`/`cwd`
3. ~~No `.env.example`~~ ✅ Fixed — `api/.env.example` added
4. **Frontend bug** — admin nav hidden in `recruiter/layout.tsx:107` (tracked in **intore-ai-frontend**)

---

## Verification

```bash
npm install
npm run typecheck     # passes
npm run dev:api       # API on :4000, /health -> {"ok":true}
```

## Repository

```
intore-ai-backend/
├── api/              # Backend API (port 4000)
├── packages/
│   ├── engine/       # Scoring + Gemini AI
│   └── shared/       # Shared backend TypeScript types
├── parser-llm/       # Python resume parser (port 5000)
├── fixtures/         # Sample + testing applicant data
└── docs/             # Specs + submission references
```

**Run locally:**
```bash
npm install
npm run dev:api    # API on :4000

# Parser (separate, optional):
cd parser-llm
uvicorn main:app --reload --port 5000
```