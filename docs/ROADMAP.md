# IntoreAI — Roadmap to Market-Ready

> **Purpose of this document:** a single source of truth you can hand to local coding agents (Claude Code or similar) working across both repos — intore-ai-backend and intore-ai-frontend. It captures where the product stands today, the debt that has to be paid down before anyone can call it "market ready," and a phased, sequenced backlog. Each phase has a definition of done. Treat this as a living document — agents should update the checkboxes as they close items, not rewrite the plan.
>
> **Source:** drafted from an external review (Claude). Sections 0–6 are reproduced verbatim. Team amendments live in **Appendix A** — read both.

## 0. How to use this with your agents

Work one phase at a time, in order. Phase 0 is non-negotiable — it fixes things that will otherwise cause silent data corruption or security incidents in every later phase.

Each backlog item below is written so it can be pasted directly as a task for a coding agent: it names the file(s), the problem, and the acceptance criteria.

Every PR from an agent should include: what changed, what test/verification was run (npm run typecheck, npm run build, and any new tests), and which backlog item it closes.

Do not let an agent "clean up" or "refactor while I'm in here" outside the scope of the task it was given — this codebase already has drift problems (see 1.3) from exactly that pattern.

## 1. Current State Snapshot

### 1.1 Backend (intore-ai-backend)

Node.js node:http server (no framework), TypeScript, npm workspaces (api, packages/engine, packages/shared).

Deterministic 5-dimension scoring engine (skills, experience, education, relevance, ProofHire) + Gemini-generated recruiter reasoning with an offline fallback.

Custom JWT (HS256, hand-rolled via crypto.subtle) and salted-hash auth.

MongoDB with an in-memory fallback repository layer for every entity (users, jobs, applications, profiles, challenges, submissions, interviews, notifications, activity logs).

ProofHire: 6 challenge types (coding, SQL, document, debug, api, data), graded by string/pattern matching, not execution.

Resume parsing via a local Python FastAPI service running a Qwen2.5-1.5B GGUF model, invoked from Node via a spawned subprocess per request.

Applicant "Upskill" system: 13-track training catalog, skill-gap recommendations, an offline rules-based "AI mentor" chat.

Demo seed script (scripts/seed-demo.mjs) — 8 recruiters, 14 jobs, 3 ProofHire challenges.

### 1.2 Frontend (intore-ai-frontend)

Next.js 15 + React 19 + Tailwind CSS 4, glass-morphism / Material 3–inspired design system.

Recruiter and applicant dashboards, ProofHire UI, a 5-stage application tracker, a Prep Room (quiz drills + employer challenges), AI Mentor chat UI, Learning Hub.

Talks to the backend over plain HTTP via NEXT_PUBLIC_API_BASE_URL.

~23 routes reported passing typecheck/build as of the last changelog entry.

### 1.3 Product intent (from the stakeholder deck)

Five pillars: Screen → Interview → Integrity → Recommend → Prep Hub, delivered in 5 rollout phases, with an explicit "human always decides" design principle and named compliance targets (Rwanda DPL, GDPR, EU AI Act high-risk employment classification).

This roadmap's job is to close the gap between "hackathon-grade implementation of that vision" and "a platform you can put real candidates' data and real hiring decisions through."

## 2. Critical Risks Found in the Current Codebase

These are not style nits — treat every item in this section as a blocker for Phase 1 sign-off. Each is filed as a backlog item later in this doc, but is called out here so nobody misses it.

| # | Risk | Where | Why it matters |
|---|------|-------|----------------|
| 1 | Duplicate, drifting engine source. packages/engine/src/*.ts and packages/engine/src/*.js are two separate implementations of the same logic, and they've already diverged: scoring.js has no proof dimension, tools.js has a different applicant-normalization algorithm than tools.ts, and packages/shared/src/index.js is a stub (export {}) next to a fully-typed index.ts. Whichever file the build/module resolution picks up silently changes scoring behavior. | packages/engine/src, packages/shared/src | This is the single biggest source of "it works on my machine" bugs. Must be resolved before anything else. |
| 2 | ProofHire grading is pattern-matching, not execution. Coding/SQL/API/data submissions are scored by checking whether the raw text contains certain substrings (normalizedCode.includes(pattern)). A candidate can pass by pasting the expected keywords in a comment. | api/src/proofhire.ts | ProofHire is the product's named differentiator for "verified performance." As implemented, it can't be trusted for a real hiring decision and is easy to game once candidates figure this out. |
| 3 | Weak password hashing. hashPassword is a single round of SHA-256 with a random salt — fast hashes are the wrong primitive for passwords (no work factor), unlike bcrypt/argon2/scrypt/PBKDF2 with high iteration counts. | api/src/auth.ts | If the user table is ever exfiltrated, passwords are crackable at scale. |
| 4 | Hardcoded JWT fallback secret. JWT_SECRET defaults to a literal string in source if the env var is unset. | api/src/auth.ts | If a deployment forgets to set JWT_SECRET, every token in production is forgeable by anyone who reads the public repo. |
| 5 | CORS wide open everywhere. Every response sets Access-Control-Allow-Origin: *. | api/src/server.ts | Fine for a hackathon demo, not acceptable once real user data and bearer tokens are involved — combine with any XSS and it's an easy account-takeover vector. |
| 6 | No input validation layer. Request bodies are cast with as T and trusted; validation is ad hoc if checks scattered per-route. | api/src/server.ts | Malformed/malicious payloads (oversized arrays, wrong types, prototype pollution via JSON) aren't consistently rejected. |
| 7 | No RBAC middleware / route-level authorization is copy-pasted per handler. Every route repeats `if (!user \|\| user.role !== "recruiter")`. | api/src/server.ts | One missed check = one privilege-escalation hole (the ProofHire "questions" endpoint is a known unauthenticated-read gap). |
| 8 | Side effect hidden in a GET request. GET /api/recruiter/notifications mutates state (marks everything as read) as a side effect of reading it. | api/src/server.ts | Violates HTTP semantics, breaks caching/prefetching assumptions, and means a notification can be marked read without the recruiter ever seeing it (e.g., prefetch, retry, or a monitoring probe hits the endpoint). |
| 9 | In-memory repositories are still the default in production topology. Every repo class has an in-memory fallback used whenever MONGODB_URI is unset, and tsx watch (the dev script) restarts on every file save, wiping all data. | api/src/repositories.ts | Needs a hard gate so the app refuses to boot with in-memory storage unless an explicit ALLOW_IN_MEMORY_DB=true (or similar) flag is set — otherwise it's one missed env var away from silent data loss in staging/prod. |
| 10 | No database indexes. Already flagged internally in TASK_ASSIGNMENTS.md as Dev 3 task #1, still open. | Mongo collections: jobs, applications, screenings, users | Every list query is a full collection scan once there's real volume. |
| 11 | Resume parsing spawns a Python subprocess per request with no timeout, concurrency limit, or circuit breaker. | api/src/resume.ts | One slow/hung parse can pile up processes and take the API down; there's also no queue, so parsing blocks the request thread. |
| 12 | No rate limiting anywhere, including auth endpoints. | api/src/server.ts | /api/auth/login and /api/auth/register are open to credential stuffing / brute force. |
| 13 | Fraud-risk detection is a handful of regexes (disposable-email domain list, "lorem ipsum" string match, missing phone). | packages/engine/src/tools.ts | Trivially defeated (use a real name, a Gmail address, and one real sentence). Fine as a first-pass heuristic, not as the only signal feeding a "fraud risk" label shown to recruiters — needs a disclaimer in the UI and a plan to strengthen it (velocity checks, duplicate-detection across applicants, etc.) before GA. |
| 14 | GDPR/data-subject-rights endpoints don't exist yet, despite the stakeholder deck explicitly promising them (data export, hard delete, retention limits) and TASK_ASSIGNMENTS.md listing them as open (Dev 3 #6). | n/a — missing | You cannot legally operate in the EU (or credibly claim GDPR alignment to enterprise buyers) without "right to erasure" and "right to portability" actually implemented and tested. |
| 15 | Misplaced content in test fixtures. parser-llm/test_resumes/resume_1.txt contains a full frontend design-system spec, not a resume — it will get fed to the resume parser as test data and pollute any parser-quality benchmarking. | parser-llm/test_resumes/resume_1.txt | Small but will silently corrupt parser eval metrics if anyone runs a batch-quality test over that folder. Move it into docs/ / the frontend design docs and remove it from the fixture set. |
| 16 | No automated tests anywhere in the backend (TASK_ASSIGNMENTS.md Dev 3 #7 is still open) — the entire ingest → parse → score → rank → reason → return pipeline is unverified except by manual curl/demo runs. | whole repo | Every refactor from here on (starting with de-duplicating the engine, item #1) is unsafe without a baseline test suite. |
| 17 | Secrets/config: .env.example covers the basics but there's no startup-time validation (the app will happily boot with a missing GEMINI_API_KEY or bad MONGODB_URI and fail confusingly later). | api/.env.example, packages/engine/src/config.ts | Should fail fast with a clear error at boot. |

## 3. Target Architecture for GA (General Availability)

This is the shape to converge on by the end of Phase 3. Don't build it all at once — each piece maps to a phase below.

- **API layer:** migrate node:http → Express or Fastify (already Dev 1 task #4) with layered middleware: request logging, Zod validation, auth, RBAC, rate limiting, centralized error handler.
- **Data layer:** MongoDB is the system of record everywhere except local dev; in-memory mode is dev-only and explicitly gated. Indexes defined in code (e.g., a ensureIndexes() run at boot) and covered by a migration/versioning convention.
- **AI/scoring:** keep the deterministic scorer as the trust anchor (it's the right call — it's what makes scores explainable); Gemini stays additive/advisory only, as it already is. Add response caching + retry/backoff + a cost/usage counter.
- **ProofHire grading:** move coding/SQL/API/data challenge types to real, sandboxed execution (see Phase 3 backlog) instead of substring matching. Keep pattern-matching only for document-type challenges, where it's actually appropriate.
- **Resume parsing:** turn the local parser into a proper long-running service with a job queue (even a simple in-process queue with concurrency limits is a big step up from "spawn per request"), health checks, and a timeout + fallback to "manual entry" UX if parsing fails.
- **AuthN/Z:** replace hand-rolled JWT with a maintained library (e.g. jose), replace password hashing with argon2 or bcrypt, and add RBAC middleware instead of per-route checks.
- **Observability:** structured JSON logs, request IDs, basic metrics (latency, error rate per route), and alerting on the screening pipeline and the parser specifically since those are the product's core value.
- **CI/CD:** GitHub Actions running lint + typecheck + build + tests on every PR for both repos, auto-deploy to staging on merge to main, manual promote to prod.
- **Compliance:** consent capture in the applicant flow (camera/audio, ProofHire monitoring), data export endpoint, hard-delete endpoint, retention job, and an audit/decision log that's actually immutable (append-only collection, no update/delete API surface).

## 4. Phased Roadmap

### Phase 0 — Stabilize & De-risk (do this first, ~1–2 weeks, backend-heavy)

Goal: no more silent drift, no open security holes, a real test baseline. Nothing user-facing changes.

- [ ] Kill the duplicate engine sources. Decide TypeScript is the single source of truth for packages/engine/src and packages/shared/src; delete every hand-authored .js twin (config.js, orchestrator.js, promptBuilder.js, scoring.js, tools.js, gemini.js, index.js, shared/src/index.js). Ensure the build (tsc) is what produces the .js that ships, and that api/package.json's workspace resolution points at built output, not hand-edited JS. Add a CI check that fails if a .js file exists next to a .ts file with the same name in these packages.
- [x] Fail fast on missing/insecure config. (DONE: validateRuntimeConfig, bcryptjs per A.2) At server boot, validate JWT_SECRET is set and not the dev default (throw if it's the fallback string in any environment other than NODE_ENV=development), validate MONGODB_URI is set unless ALLOW_IN_MEMORY_DB=true is explicitly set, and validate GEMINI_API_KEY presence is at least logged as a warning.
- [x] Fix password hashing. (DONE: bcryptjs cost 10 + re-hash-on-login; argon2 declined per A.2) Swap the custom SHA-256+salt in api/src/auth.ts for argon2 (preferred) or bcrypt. Write a migration path: on next successful login with an old-format hash, re-hash and store the new format.
- [x] Lock down CORS. (DONE: ALLOWED_ORIGINS allow-list) Replace Access-Control-Allow-Origin: * with an allow-list driven by an env var (ALLOWED_ORIGINS), defaulting to the known frontend origin(s).
- [x] Remove the GET side effect. (DONE: read-only GET + explicit POST read-all) GET /api/recruiter/notifications should only read. Marking as read happens via the existing POST /api/notifications/:id/read and POST /api/notifications/read-all, called explicitly by the frontend when the user actually opens the notification panel.
- [x] Add rate limiting on /api/auth/login, /api/auth/register, and /api/ingest/resume at minimum.
- [ ] Add a request-validation layer (Zod) for every POST/PUT body currently trusted with as T casts, starting with /api/auth/register, /api/jobs, /api/applications, /api/proofhire/challenges.
- [ ] Add RBAC middleware to replace the repeated if (!user || user.role !== "recruiter") blocks; audit every route for a missing check while doing this (the ProofHire "questions" endpoint noted in risk #7 above is a known gap).
- [ ] Clean the fixtures folder — move parser-llm/test_resumes/resume_1.txt out of the resume-fixture set.
- [ ] Stand up a test baseline before touching anything else structural: unit tests for scoring.ts (the actual scoring math — this is the part that must never silently change), proofhire.ts evaluators, and one end-to-end integration test of ingest → parse (mocked) → score → rank → reason → return, per Dev 3 task #7.
- [ ] Gate in-memory storage behind an explicit flag so a misconfigured deploy can't silently run on ephemeral storage.

**Definition of done:** npm run typecheck && npm run build pass with a single source of truth per module, a test suite exists and runs in CI, no default secrets, no wildcard CORS, no unauthenticated write routes, password hashing uses a proper KDF.

### Phase 1 — MVP Hardening (matches product deck's "Phase 1", ~2–3 weeks)

Goal: the screening/matching engine and dashboards are trustworthy and fast at real volume.

- [ ] MongoDB indexes: jobs(status, createdAt), applications(jobId, applicantId, status), screenings(jobId, score), users(email) unique.
- [ ] Migrate node:http → Express/Fastify; port all existing routes 1:1 first (no behavior change), then layer in the middleware from Phase 0 properly instead of ad hoc.
- [ ] Pagination on every list endpoint (/api/jobs, /api/jobs/:id/applications, /api/screenings, /api/recruiter/activity) — cursor or offset/limit, agree on one convention.
- [ ] CI/CD: GitHub Actions for both repos — lint, typecheck, build, test on PR; auto-deploy to staging on merge.
- [ ] Docker: Dockerfile for API + parser, docker-compose.yml with Mongo, so any engineer (or agent) can spin up the full stack in one command.
- [ ] Frontend: confirm the 23-route build stays green through every backend contract change in this phase; add a typed API client layer if one doesn't already fully cover the surface (check lib/api.ts).
- [ ] Resume parser: add a request timeout + queue with a concurrency cap; if parsing fails or times out, the applicant flow falls back to manual profile entry instead of hanging.
- [ ] Improve Gemini prompt templates for reasoning consistency (Dev 2 task #2) — add few-shot examples, and add a JSON-schema validation pass on the Gemini response before trusting it (currently a bare JSON.parse + optional chaining).

**Definition of done:** the platform can absorb a load test of a few hundred concurrent applicants without falling over, every route is paginated, infra is reproducible via Docker, and CI blocks bad merges.

### Phase 2 — In-Platform Interviews

Goal: technical/cognitive interviews run inside the product, not just ProofHire async challenges.

- [ ] Central question bank: new repository + CRUD API for a shared pool of screening/interview questions per role type (Dev 2 task #3).
- [ ] Live/async coding & whiteboard environment for the interviewer view described in the stakeholder deck (Module 02).
- [ ] Cognitive aptitude test engine: new ProofHire-style challenge type for timed logical/analytical reasoning with scoring (Dev 2 task #5).
- [ ] Interviewer decision log tied to the existing Interview model, feeding the audit trail (see Phase 3 compliance work).
- [ ] Multi-interviewer panel comparison API (Dev 2 task #6) — aggregate scores from multiple interviewers on the same candidate for the Panel View shown in the deck (Module 04).

**Definition of done:** a recruiter can run a full interview loop (technical + cognitive) inside the product and see a structured, multi-interviewer view before deciding.

### Phase 3 — Integrity + Real AI Ranking (the trust-critical phase)

Goal: ProofHire scores and integrity flags are actually defensible, not gameable.

- [ ] Sandboxed code execution for coding/debug ProofHire challenges — run submissions against real test cases in an isolated sandbox (container-per-run, resource/time limits, no network access) instead of substring matching. This is the single most important integrity fix in the whole roadmap given "ProofHire" is the marketed differentiator.
- [ ] Real SQL execution against an ephemeral schema/dataset for sql challenges, instead of pattern matching on query text.
- [ ] Telemetry/integrity monitoring: capture attention signals during ProofHire challenges (tab switches, time per question, copy-paste events) per Dev 2 task #4 — implement exactly to the deck's stated design rule: behavior-pattern flags only, routed to a human, never auto-disqualifying, never inferred emotional/psychological state.
- [ ] Immutable audit/decision log (Dev 1 task #7): append-only collection, no update/delete surface, records who decided what and why for every status change.
- [ ] Bias/fairness audits: implement the "outcome parity" metric named in the stakeholder deck (Slide 11) — a scheduled job comparing shortlist/hire rates across demographic buckets where that data is voluntarily provided, surfaced to recruiters as a dashboard, not just a slide-deck promise.
- [ ] Strengthen fraud-risk signals beyond regex (velocity/duplicate detection across applicants for the same job, cross-referencing disposable-email lists that are actually maintained, not hardcoded).

**Definition of done:** a security-minded reviewer (or a candidate trying to cheat) cannot pass a coding/SQL ProofHire challenge without submitting genuinely correct work; every hiring decision has an immutable trail; integrity flags never claim to know a candidate's emotional state.

### Phase 4 — Prep Hub Goes Public

Goal: the job-seeker-facing differentiator (company-specific prep) is safe to open to the public internet.

- [ ] Public-facing rate limiting and abuse prevention (this surface will get bot traffic once it's public).
- [ ] Searchable question bank UI, sourced per the deck from "anonymized, consented interviews on Intore AI plus curated public data" — build the actual consent capture and anonymization pipeline before any real interview content is stored this way, not after.
- [ ] Mock interviews modeled on a target org's real format, with AI feedback (builds on the Upskill/Mentor system already shipped).
- [ ] Content moderation on any user-submitted interview questions/notes before they're shown to other users.

**Definition of done:** the Prep Hub can take public traffic without a moderation or abuse incident, and every piece of "real interview" content in it has a documented consent trail.

### Phase 5 — Expanded Signals & Compliance

Goal: legally and operationally ready for multi-market rollout, including any consented presence checks.

- [ ] Independent legal review of the behavioral-monitoring module before it expands beyond process-level signals (deck's own stated gate — do not skip it).
- [ ] Data-subject rights: export endpoint (portability) and hard-delete endpoint (erasure), plus a scheduled retention-limit job, per GDPR and the deck's own "Trust & Compliance" slide.
- [ ] Multi-tenant hardening: verify tenant data isolation between companies at the query layer (not just convention) — add an automated test that asserts recruiter A can never read recruiter B's applications/jobs/challenges via any endpoint.
- [ ] Org/company profile model + team member management (Dev 3 task #4), needed before this is sellable to a company with more than one recruiter seat.
- [ ] Compliance mapping doc kept current per market (Rwanda DPL, GDPR, EU AI Act high-risk employment classification) with an owner and a review cadence — this is a living document, not a one-time slide.

**Definition of done:** you can onboard a company with multiple recruiter seats, honor a "delete my data" request end-to-end, and defend the compliance claims on the stakeholder deck to an actual auditor.

## 5. Go-to-Market Checklist (run this alongside Phase 3–5, not after)

- [ ] Terms of Service + Privacy Policy reviewed by counsel, linked from both recruiter and applicant sign-up flows.
- [ ] Pricing/billing integration if this will be sold as SaaS (Stripe or similar) — currently no billing code exists anywhere in the repo.
- [ ] Support channel (even just a monitored inbox) and an SLA for the pilot employers named in the deck's "Next Steps" slide.
- [ ] Backup/disaster-recovery plan for MongoDB (automated backups + a tested restore procedure, not just "MongoDB is running").
- [ ] Uptime monitoring + alerting (the /health and /api/system/health endpoints already exist — wire them into an actual monitor, e.g. UptimeRobot/Better Stack, before the first pilot).
- [ ] Load test the screening pipeline and the resume parser specifically — they're the two most likely bottlenecks.
- [ ] Incident response runbook: who gets paged if the parser subprocess pool wedges, or if Gemini's API degrades (the fallback mode should be exercised deliberately, not discovered live).

## 6. Immediate Next 10 Tasks (hand these to agents this week, in this order)

1. [ ] De-duplicate packages/engine/src and packages/shared/src — delete stale .js twins, confirm build output is what's actually consumed (Phase 0).
2. [ ] Write unit tests for scoring.ts locking in current expected behavior before any further changes touch it.
3. [ ] Swap password hashing to argon2/bcrypt with a re-hash-on-login migration path.
4. [ ] Add boot-time config validation (JWT_SECRET, MONGODB_URI/ALLOW_IN_MEMORY_DB, GEMINI_API_KEY warning).
5. [ ] Lock CORS to an allow-list env var.
6. [ ] Remove the mark-as-read side effect from GET /api/recruiter/notifications.
7. [ ] Add Zod validation to /api/auth/register, /api/jobs, /api/applications, /api/proofhire/challenges.
8. [ ] Add rate limiting to /api/auth/login, /api/auth/register, /api/ingest/resume.
9. [ ] Move parser-llm/test_resumes/resume_1.txt out of the fixture set.
10. [ ] Draft the sandboxed-execution design for ProofHire coding/SQL challenges (design doc first, implementation in Phase 3) — this is the highest-leverage integrity fix in the whole roadmap and worth scoping early even though it lands later.

---

## Appendix A — Team Amendments (separate from the verbatim plan above)

### A.1 Phase 0 ordering correction: tests before de-dupe

The verbatim task list orders de-duplication (#1) before the test baseline (#10). Because the `.ts`/`.js` twins have **diverged** (e.g. `scoring.js` has no proof dimension), "delete the stale one" is only safe once we know which twin the runtime actually resolves.

- [ ] **Task 0 (new, do first):** determine which file Node resolves at runtime for each twin pair; write scoring unit tests locking in *that* behavior; then delete the other twin. Only after that proceed with the remaining Phase 0 items.

### A.2 Password hashing: bcryptjs, not argon2

The verbatim plan prefers argon2. The team runs Windows dev machines where argon2's native build is unreliable.

- [ ] **Decision (locked):** use bcryptjs (pure JS, installs cleanly everywhere). Revisit argon2 only if benchmarks justify it. Re-hash-on-login migration path still applies.

### A.3 JWT migration: clean cut, invalidate old sessions

- [ ] **Decision (locked, secure option):** replace hand-rolled JWT with the `jose` library in one cut. All pre-existing sessions are invalidated on deploy; every user logs in again. No dual-accept transition period.

### A.4 Missing piece: Phase 1 frontend track (guided apply + trust cleanup)

The verbatim roadmap is backend-heavy; the applicant apply flow and frontend trust issues have no home. They are tracked here and were scheduled **before** Phase 0 security work:

- [x] Guided 4-step apply wizard — Profile completeness checklist → Resume upload + parse confirmation → Review recruiter-view snapshot → Applied / Assessment-next. (Decided: profile + resume required before Apply enables; required ProofHire may be completed after applying.)
- [x] `isProfileComplete()` validator in shared package, enforced on `POST /api/applications` (400 + missing-fields list) and profile save.
- [ ] Frontend trust cleanup: remove `Math.random()` match %, archive placeholder stats, hardcoded claims (`98.4%`, `Top 5%`, `15%`), dead buttons/links (`Upload Bulk`, `View Complete Activity`, `/privacy`, `/terms`), `alert()` → Toast migration.
- [ ] Frontend P0 bugs: admin page token key (`"token"` vs `"umurava_token"`), login email input blocking usernames, recruiter scanner `ApplicantInput` vs `TalentProfile` mismatch, register password `minLength=6`.

### A.5 Commercial landing page (follow-up, owner: stakeholder)

- [ ] Stakeholder to provide instructions for the commercial/marketing landing page once the apply-flow + security fixes land. Agent: remind the stakeholder at that point.

