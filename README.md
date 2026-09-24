# IntoreAI — Backend

**IntoreAI** is an AI-powered talent screening platform that ranks job applicants against job requirements using a transparent, explainable scoring engine, then enriches shortlists with AI-generated recruiter reasoning.

This repository contains the **backend** (API, scoring engine, resume parser). The web frontend lives in a separate repository: **intore-ai-frontend**.

## What it does

Screens applicants across five recruiter-controlled dimensions: **skills**, **experience**, **education**, **relevance**, and **ProofHire** challenge results. Recruiters set the weighting of each dimension, define **dealbreakers** (e.g. "visa sponsorship required"), and get a ranked shortlist where every score is transparent, not a black box.

## Key features

- **Transparent scoring** with visible score breakdowns, strengths, and gaps.
- **Dealbreaker detection** flags profiles that fail a hard requirement.
- **Anonymized screening** labels candidates (e.g. `Candidate 84F2`) to reduce bias.
- **Fraud-risk signals** (disposable emails, synthetic language, missing contact info) kept separate from the match score.
- **ProofHire** skills-based challenges (coding, SQL, documents, API, data) auto-evaluated against expected patterns.
- **Assistive recommendations** suggest advance / hold / reject actions while preserving recruiter control.
- **Auth** — custom JWT (HS256) with salted password hashing; **MongoDB** with in-memory fallback.

## Tech stack

- **API** Node.js `node:http`, TypeScript strict (ESM, npm workspaces)
- **Engine** deterministic scorer + Google Gemini (`gemini-1.5-flash`)
- **Parser** Python 3.12 / FastAPI + local Qwen2.5-1.5B model
- **Database** MongoDB (optional, falls back to in-memory)

## Project structure

```text
intore-ai-backend/
├── api/              # Node.js REST API (port 4000)
├── packages/
│   ├── engine/       # Scoring, prompting, Gemini orchestration
│   └── shared/       # Shared backend domain types
├── parser-llm/       # Local resume parsing service (Qwen GGUF, port 5000)
├── fixtures/         # Sample + testing applicant data
└── docs/             # Product specs + submission references
```

## Getting started

```bash
cd backend  # (inside this repo: just run from the root)
npm install
npm run dev:api    # API on http://localhost:4000
```

Parser (separately, optional for resume parsing):

```bash
cd parser-llm
uvicorn main:app --reload --port 5000
```

Set `GEMINI_API_KEY` in `api/.env` for live AI reasoning (optional; the platform falls back to offline mode). Copy `api/.env.example` and fill in values. Supported vars: `GEMINI_API_KEY`, `GEMINI_MODEL`, `MONGODB_URI`, `MONGODB_DB`, `JWT_SECRET`, `API_PORT`, `PARSER_DIR`, `PARSER_SERVICE_URL`, `SCREENING_TOP_N`, `SCREENING_MIN_SCORE`.

## Frontend

The Next.js UI is maintained in the **intore-ai-frontend** repository. It talks to this API over HTTP via `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:4000`).

## Demo data

The platform stores data **in memory** unless `MONGODB_URI` is set, so accounts, jobs, and challenges reset every time the API process restarts. `npm run dev:api` uses `tsx watch`, which restarts on every file change — re-seed after each restart:

```bash
node scripts/seed-demo.mjs
```

It idempotently registers 8 recruiters and the two demo accounts, creates 3 ProofHire challenges (coding, SQL, document), and publishes 14 real jobs (Kigali + remote). Every account uses password `demo1234`:

- Recruiters — e.g. `recruiting@rwandafinserve.rw`, `talent@vista-remote.io` (see `scripts/seed-demo.mjs` for the full list)
- Applicant — `applicant@intore.ai`
- Legacy demo recruiter — `recruiter@intore.ai`