// Seeded demo data for IntoreAI — real recruiters, real jobs, mix of Kigali + remote.
// Idempotent: logs in if the account exists, registers otherwise. Safe to re-run.
// Usage: node scripts/seed-demo.mjs   (require backend running on :4000)
const BASE = process.env.API_URL || "http://localhost:4000/api";
const PASSWORD = "demo1234";

async function request(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) {
    const error = new Error(data.error || `HTTP ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function getRecruiter(username, password, firstName, lastName, email, company) {
  try {
    const { token } = await request("/auth/login", {
      method: "POST",
      body: { emailOrUsername: username, password },
    });
    return { token, username, email, company };
  } catch (error) {
    if (error.status !== 401 && error.status !== 400) throw error;
    await request("/auth/register", {
      method: "POST",
      body: {
        username,
        password,
        firstName,
        lastName,
        email,
        role: "recruiter",
        company,
      },
    });
    const { token } = await request("/auth/login", {
      method: "POST",
      body: { emailOrUsername: username, password },
    });
    return { token, username, email, company };
  }
}

async function createJob(token, job) {
  const { job: created } = await request("/jobs", { method: "POST", body: job, token });
  await request(`/jobs/${created.id}/publish`, { method: "POST", token });
  return created;
}

async function createChallenge(token, challenge) {
  const { challenge: created } = await request("/proofhire/challenges", {
    method: "POST",
    body: challenge,
    token,
  });
  return created;
}

const RECRUITERS = [
  {
    username: "rfi_kigali",
    firstName: "Clarisse",
    lastName: "Mukamana",
    email: "recruiting@rwandafinserve.rw",
    company: "Rwanda FinServe",
    jobs: [
      {
        title: "Senior Full-Stack Engineer",
        summary:
          "Own end-to-end features across our Kigali payments stack — React frontends, Node.js APIs, and Postgres-backed services. Ship fast, review carefully.",
        requiredSkills: ["React", "TypeScript", "Node.js", "SQL", "REST APIs"],
        preferredSkills: ["Next.js", "PostgreSQL", "Redis", "Docker", "GraphQL"],
        minimumYearsExperience: 4,
        educationLevel: "bachelors",
        location: "Kigali, Rwanda (on-site)",
        dealbreakers: ["Cannot relocate to Kigali"],
        screeningWeights: { skills: 35, experience: 20, education: 10, relevance: 15, proof: 20 },
        proofHire: { enabled: true, mode: "required", challengeId: null },
      },
      {
        title: "Payment Systems Analyst",
        summary:
          "Analyze mobile-money transaction flows, reconcile discrepancies, and help design safer, faster settlement rails for East Africa.",
        requiredSkills: ["SQL", "Data Analysis", "Excel", "Fintech"],
        preferredSkills: ["Python", "BI Tools", "Mobile Money"],
        minimumYearsExperience: 2,
        educationLevel: "bachelors",
        location: "Kigali, Rwanda (hybrid)",
        screeningWeights: { skills: 35, experience: 20, education: 10, relevance: 15, proof: 20 },
      },
      {
        title: "Fintech Mobile Engineer (React Native)",
        summary:
          "Build a fast, secure mobile experience for transfers, bills, and savings used across Rwanda. Deep care for offline-first UX and fraud safety.",
        requiredSkills: ["React Native", "TypeScript", "REST APIs"],
        preferredSkills: ["Offline-first", "Push Notifications", "Kotlin/Swift"],
        minimumYearsExperience: 2,
        educationLevel: "bachelors",
        location: "Kigali, Rwanda (on-site)",
        screeningWeights: { skills: 35, experience: 20, education: 10, relevance: 15, proof: 20 },
      },
    ],
    challenge: {
      type: "coding",
      title: "Mobile Money Transfer Validator",
      instructions:
        "Write a TypeScript function that validates a mobile-money transfer request. Return a result object; do not throw on invalid input.",
      prompt:
        "Implement `validateTransfer(amount, senderBalance, dailyLimit, limitUsed)`\nRules:\n- amount must be a positive number\n- sender must have enough balance (balance >= amount)\n- the transfer must stay within the daily limit (limitUsed + amount <= dailyLimit)\nReturn { valid: boolean, reason?: string }. Use clear early returns.",
      starterCode: "export function validateTransfer(amount, senderBalance, dailyLimit, limitUsed) {\n  // your code here\n}\n",
      requiredSkills: ["TypeScript", "Node.js", "Fintech"],
      testCases: [
        { title: "Valid transfer", description: "A normal transfer within balance and limit passes.", expectedPatterns: ["return { valid: true", "return {valid: true"], weight: 30 },
        { title: "Rejects insufficient balance", description: "Amount greater than balance is rejected.", expectedPatterns: ["valid: false", "balance"], weight: 25 },
        { title: "Rejects over daily limit", description: "Transfer exceeding the remaining daily limit is rejected.", expectedPatterns: ["valid: false", "limit"], weight: 25 },
        { title: "Rejects non-positive amount", description: "Zero or negative amounts are rejected early.", expectedPatterns: ["amount <= 0", "amount < 0", "amount > 0", "amount <= 0.001"], weight: 10 },
      ],
      rubric: { correctnessWeight: 60, qualityWeight: 20, completenessWeight: 20, minimumPassingScore: 65 },
      hints: [
        { text: "Guard clauses make each rule obvious and testable.", source: "system" },
        { text: "Keep the return shape consistent: { valid, reason }.", source: "system" },
      ],
    },
  },
  {
    username: "nuru_pay",
    firstName: "Eric",
    lastName: "Niyonzima",
    email: "talent@nurupay.com",
    company: "NuruPay",
    jobs: [
      {
        title: "Payments Platform Engineer",
        summary:
          "Scale a payments platform processing thousands of transactions a day across Rwanda and the region. Node.js, Postgres, and event-driven services.",
        requiredSkills: ["Node.js", "TypeScript", "SQL", "Microservices"],
        preferredSkills: ["RabbitMQ", "Redis", "Kubernetes"],
        minimumYearsExperience: 3,
        educationLevel: "bachelors",
        location: "Kigali, Rwanda (hybrid)",
        screeningWeights: { skills: 35, experience: 20, education: 10, relevance: 15, proof: 20 },
      },
      {
        title: "DevOps / SRE Engineer",
        summary:
          "Keep our checkout APIs fast and our pipelines green. Terraform, Docker, CI/CD, and observability for a fintech that cannot afford downtime.",
        requiredSkills: ["Linux", "Docker", "CI/CD", "AWS", "Monitoring"],
        preferredSkills: ["Terraform", "Kubernetes", "Prometheus"],
        minimumYearsExperience: 3,
        location: "Kigali, Rwanda or Remote (EAT ±3h)",
        screeningWeights: { skills: 35, experience: 20, education: 10, relevance: 15, proof: 20 },
      },
    ],
  },
  {
    username: "ukwishyura_bank",
    firstName: "Aline",
    lastName: "Uwase",
    email: "hr@ukwishyurabank.rw",
    company: "Ukwishyura Bank",
    jobs: [
      {
        title: "Data Analyst (Retail Banking)",
        summary:
          "Turn branch and digital channel data into decisions — from onboarding funnels to loan risk reviews. You'll own dashboards and weekly insight packs.",
        requiredSkills: ["SQL", "Data Analysis", "Excel", "Python", "Reporting"],
        preferredSkills: ["Power BI", "Statistics", "Banking"],
        minimumYearsExperience: 2,
        educationLevel: "bachelors",
        location: "Kigali, Rwanda (on-site)",
        screeningWeights: { skills: 35, experience: 20, education: 10, relevance: 15, proof: 20 },
        proofHire: { enabled: true, mode: "required", challengeId: null },
      },
      {
        title: "Risk & Compliance Officer",
        summary:
          "Help the bank stay ahead of AML/CFT expectations: review accounts, investigate alerts, and keep our compliance documentation sharp.",
        requiredSkills: ["Compliance", "Analytical Skills", "Banking", "Communication"],
        preferredSkills: ["AML/CFT", "Audit"],
        minimumYearsExperience: 3,
        educationLevel: "bachelors",
        location: "Kigali, Rwanda (on-site)",
        screeningWeights: { skills: 35, experience: 20, education: 10, relevance: 15, proof: 20 },
      },
    ],
    challenge: {
      type: "sql",
      title: "Loan Portfolio Health Check",
      instructions:
        "Write a single read-only SQL query. Only SELECT statements allowed — no INSERT, UPDATE, DELETE, DROP or ALTER.",
      prompt:
        "Return the 10 loans with the highest outstanding balances for non-settled accounts, ordered by balance descending.\nUse tables `loans` (id, account_id, outstanding, status, updated_at) and `accounts` (id, region, created_at).\nShow columns: account region and loan balance.",
      starterQuery: "SELECT",
      requiredSkills: ["SQL", "Data Analysis"],
      testCases: [
        { title: "SELECT present", description: "Query must be a SELECT.", expectedPatterns: ["select"], weight: 25 },
        { title: "Uses FROM with loans", description: "Query reads from the loans table.", expectedPatterns: ["from loans", "from loans "], weight: 25 },
        { title: "Ordered by balance", description: "Results ordered by outstanding balance descending.", expectedPatterns: ["order by", "order by outstanding"], weight: 25 },
        { title: "Limited to 10 rows", description: "Query caps results at ten.", expectedPatterns: ["limit 10", "limit 10;", "limit 10)"], weight: 15 },
        { title: "Read-only", description: "No write operations allowed.", expectedPatterns: ["select", "select "], weight: 10 },
      ],
      rubric: { correctnessWeight: 70, qualityWeight: 10, completenessWeight: 20, minimumPassingScore: 60 },
      sqlConfig: {
        schema: { tables: ["loans", "accounts"], columns: ["id", "account_id", "outstanding", "status", "updated_at", "region", "created_at"] },
        validPatterns: ["select", "from", "order by", "limit"],
        blockedKeywords: ["insert", "update", "delete", "drop", "alter", "truncate", "grant", "revoke"],
      },
      hints: [
        { text: "Start with SELECT to specify which columns you need.", source: "system" },
        { text: "Use ORDER BY outstanding DESC then LIMIT 10.", source: "system" },
      ],
    },
  },
  {
    username: "agaciro_agro",
    firstName: "Jean",
    lastName: "Bosco",
    email: "jobs@agaciroagro.rw",
    company: "Agaciro Agro",
    jobs: [
      {
        title: "Full-Stack Engineer (AgriPlatform)",
        summary:
          "Build tools that help Rwandan farmers track yields, prices, and deliveries. React + Node.js, with field-friendly mobile-first UIs.",
        requiredSkills: ["React", "Node.js", "TypeScript", "SQL"],
        preferredSkills: ["React Native", "Maps", "Offline-first"],
        minimumYearsExperience: 2,
        location: "Kigali, Rwanda (on-site)",
        screeningWeights: { skills: 35, experience: 20, education: 10, relevance: 15, proof: 20 },
      },
    ],
  },
  {
    username: "inyenyeri_energy",
    firstName: "Sonia",
    lastName: "Ingabire",
    email: "careers@inyenyerienergy.rw",
    company: "Inyenyeri Energy",
    jobs: [
      {
        title: "IoT Firmware Engineer (Smart Meters)",
        summary:
          "Firmware for smart energy meters that report usage over low-bandwidth networks. C, embedded Linux, and serious attention to power budgets.",
        requiredSkills: ["C", "Embedded Systems", "Networking", "Linux"],
        preferredSkills: ["LoRaWAN", "MQTT", "ESP32"],
        minimumYearsExperience: 3,
        educationLevel: "bachelors",
        location: "Kigali, Rwanda (on-site w/ field visits)",
        screeningWeights: { skills: 35, experience: 20, education: 10, relevance: 15, proof: 20 },
      },
    ],
  },
  {
    username: "tamuka_fashion",
    firstName: "Diane",
    lastName: "Umutesi",
    email: "hello@tamukafashion.rw",
    company: "Tamuka Fashion",
    jobs: [
      {
        title: "Digital Marketing Specialist",
        summary:
          "Own growth for a Rwandan fashion brand across social, content, and paid channels. Analytical, creative, and KPIs-obsessed.",
        requiredSkills: ["Digital Marketing", "Content Creation", "Analytics", "Social Media"],
        preferredSkills: ["Meta Ads", "SEO", "Canva"],
        minimumYearsExperience: 1,
        location: "Kigali, Rwanda (hybrid)",
        screeningWeights: { skills: 35, experience: 20, education: 10, relevance: 15, proof: 20 },
      },
    ],
  },
  {
    username: "vista_remote",
    firstName: "Marcus",
    lastName: "Okafor",
    email: "talent@vista-remote.io",
    company: "Vista Remote",
    jobs: [
      {
        title: "Backend Engineer (Node.js)",
        summary:
          "Fully remote. Build high-throughput APIs and background jobs for a global SaaS product with users in 40+ countries.",
        requiredSkills: ["Node.js", "TypeScript", "SQL", "REST APIs"],
        preferredSkills: ["PostgreSQL", "Redis", "Queue Systems"],
        minimumYearsExperience: 4,
        location: "Remote (worldwide, async)",
        screeningWeights: { skills: 35, experience: 20, education: 10, relevance: 15, proof: 20 },
      },
      {
        title: "Machine Learning Engineer",
        summary:
          "Take models from notebooks to production: feature pipelines, training jobs, evaluation harnesses, and monitoring.",
        requiredSkills: ["Python", "Machine Learning", "SQL", "AWS"],
        preferredSkills: ["PyTorch", "MLOps", "Docker"],
        minimumYearsExperience: 3,
        location: "Remote (worldwide, async)",
        screeningWeights: { skills: 35, experience: 20, education: 10, relevance: 15, proof: 20 },
      },
      {
        title: "Product Manager (B2B SaaS)",
        summary:
          "Own the roadmap for a user-facing product tracking a remote-first engineering team. Deep research, crisp docs, data-backed decisions.",
        requiredSkills: ["Product Management", "User Research", "Analytics", "Roadmapping", "Communication"],
        preferredSkills: ["SaaS", "Technical Background"],
        minimumYearsExperience: 3,
        location: "Remote (worldwide, async)",
        screeningWeights: { skills: 35, experience: 20, education: 10, relevance: 15, proof: 20 },
        proofHire: { enabled: true, mode: "optional", challengeId: null },
      },
    ],
    challenge: {
      type: "document",
      title: "48-hour Product Brief",
      instructions:
        "Write a concise product brief for a work-in-progress feature. Include an intro, the problem, proposed solution, success metrics, and a short timeline.",
      prompt:
        "Product brief for: \"Add an offline mode to the mobile app\"\nWrite 150-300 words. Structure should include sections for Problem, Solution, Metrics, and Timeline, and mention the target users.",
      requiredSkills: ["Product Management", "Communication"],
      testCases: [
        { title: "Problem section", description: "Brief describes the problem.", expectedPatterns: ["problem"], weight: 20 },
        { title: "Solution section", description: "Brief proposes a solution.", expectedPatterns: ["solution"], weight: 20 },
        { title: "Metrics section", description: "Brief defines success metrics.", expectedPatterns: ["metrics"], weight: 20 },
        { title: "Timeline section", description: "Brief includes a timeline.", expectedPatterns: ["timeline"], weight: 20 },
        { title: "Offline context", description: "Brief references offline usage.", expectedPatterns: ["offline"], weight: 20 },
      ],
      rubric: { correctnessWeight: 50, qualityWeight: 25, completenessWeight: 25, minimumPassingScore: 60 },
      documentConfig: {
        requiredSections: ["Problem", "Solution", "Metrics", "Timeline"],
        requiredKeywords: ["offline", "users", "impact"],
        minLength: 150,
        maxLength: 300,
      },
      hints: [
        { text: "Include a brief introduction about yourself and the context.", source: "system" },
        { text: "End with a clear next step.", source: "system" },
      ],
    },
  },
  {
    username: "atlantica_data",
    firstName: "Nadia",
    lastName: "Hassan",
    email: "people@atlanticadata.io",
    company: "Atlantica Data",
    jobs: [
      {
        title: "Analytics Engineer",
        summary:
          "Remote. Own the dbt models, SQL transforms, and data marts that power a data team serving finance and retail clients in Africa and Europe.",
        requiredSkills: ["SQL", "dbt", "Python", "Data Warehousing"],
        preferredSkills: ["Snowflake", "Airflow", "Git"],
        minimumYearsExperience: 3,
        location: "Remote (EU / EAT overlap)",
        screeningWeights: { skills: 35, experience: 20, education: 10, relevance: 15, proof: 20 },
      },
    ],
  },
];

const DEMO_ACCOUNTS = [
  { username: "demo_recruiter", firstName: "Demo", lastName: "Recruiter", email: "recruiter@intore.ai", role: "recruiter", company: "IntoreAI Demo" },
  { username: "demo_applicant", firstName: "Demo", lastName: "Applicant", email: "applicant@intore.ai", role: "applicant" },
];

async function seed() {
  console.log("Seeding IntoreAI demo data against", BASE);
  const summary = [];

  for (const demo of DEMO_ACCOUNTS) {
    try {
      await request("/auth/login", { method: "POST", body: { emailOrUsername: demo.username, password: PASSWORD } });
      summary.push(`demo account ${demo.username} already exists`);
    } catch {
      const body = { ...demo, password: PASSWORD };
      if (demo.company) body.company = demo.company;
      await request("/auth/register", { method: "POST", body });
      summary.push(`registered demo account ${demo.username}`);
    }
  }

  let jobCount = 0;
  for (const recruiter of RECRUITERS) {
    const { token, email, company } = await getRecruiter(
      recruiter.username,
      PASSWORD,
      recruiter.firstName,
      recruiter.lastName,
      recruiter.email,
      recruiter.company,
    );

    let challengeId = null;
    if (recruiter.challenge) {
      const challenge = await createChallenge(token, recruiter.challenge);
      challengeId = challenge.id;
      summary.push(`challenge "${recruiter.challenge.title}" -> ${challengeId}`);
    }

    for (const job of recruiter.jobs) {
      const body = { ...job };
      if (job.proofHire?.enabled) {
        body.proofHire = { ...job.proofHire, challengeId };
      }
      const created = await createJob(token, body);
      jobCount += 1;
      summary.push(`job "${created.title}" (${company}) published -> ${created.id}`);
    }
  }

  console.log("\n===== SEED SUMMARY =====");
  summary.forEach((line) => console.log(line));
  console.log(`\nTotal jobs published: ${jobCount}`);
  console.log(`Recruiters: ${RECRUITERS.length}`);
  console.log("\nLogin credentials (password for all: demo1234)");
  console.log("  recruiter examples:");
  console.log(`    ${RECRUITERS[0].email}`);
  console.log(`    ${RECRUITERS[6].email}`);
  console.log("  applicant example: applicant@intore.ai");
}

seed().catch((error) => {
  console.error("Seed failed:", error.message);
  if (error.data) console.error(error.data);
  process.exit(1);
});