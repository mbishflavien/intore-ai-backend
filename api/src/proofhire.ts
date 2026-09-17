import type {
  ProofApplicantStatus,
  ProofChallenge,
  ProofChallengeType,
  ProofChallengeTestCase,
  ProofEvaluation,
  ProofHint,
  ProofReference,
  ProofSubmission,
  DocumentChallengeConfig,
  SQLChallengeConfig,
  APIChallengeConfig,
  DataChallengeConfig,
} from "../../packages/shared/src/index.js";

export function evaluateProofSubmission(
  challenge: ProofChallenge,
  code: string,
): ProofEvaluation {
  const normalizedCode = code.toLowerCase();
  const matchedPatterns = new Set<string>();
  const missingPatterns = new Set<string>();
  let earnedWeight = 0;
  let totalWeight = 0;

  for (const testCase of challenge.testCases) {
    totalWeight += testCase.weight;
    const patterns = testCase.expectedPatterns.map((pattern) => pattern.toLowerCase());
    const matched = patterns.some((pattern) => normalizedCode.includes(pattern));

    if (matched) {
      earnedWeight += testCase.weight;
      patterns.forEach((pattern) => matchedPatterns.add(pattern));
    } else {
      patterns.forEach((pattern) => missingPatterns.add(pattern));
    }
  }

  const correctnessScore = totalWeight === 0 ? 0 : Math.round((earnedWeight / totalWeight) * 100);
  const qualitySignals = [
    /function|=>/.test(code),
    /return/.test(normalizedCode),
    /if|switch|try/.test(normalizedCode),
    code.split("\n").length >= 5,
    /const|let/.test(normalizedCode),
  ].filter(Boolean).length;
  const completenessSignals = [
    code.trim().length >= 80,
    /export|module\.exports/.test(code),
    challenge.requiredSkills.length === 0 ||
      challenge.requiredSkills.some((skill) => normalizedCode.includes(skill.toLowerCase())),
    !challenge.starterCode || challenge.starterCode.trim() === "" || code.trim() !== challenge.starterCode.trim(),
    challenge.testCases.length === 0 || matchedPatterns.size > 0,
  ].filter(Boolean).length;

  const qualityScore = Math.round((qualitySignals / 5) * 100);
  const completenessScore = Math.round((completenessSignals / 5) * 100);
  const score = Math.round(
    (correctnessScore * challenge.rubric.correctnessWeight +
      qualityScore * challenge.rubric.qualityWeight +
      completenessScore * challenge.rubric.completenessWeight) / 100,
  );

  const passed = score >= challenge.rubric.minimumPassingScore;

  return {
    score,
    passed,
    correctnessScore,
    qualityScore,
    completenessScore,
    summary: passed
      ? "Submission meets the current ProofHire benchmark for this challenge."
      : "Submission needs more work before it satisfies the current ProofHire benchmark.",
    strengths: buildStrengths(correctnessScore, qualityScore, completenessScore, matchedPatterns),
    gaps: buildGaps(correctnessScore, qualityScore, completenessScore, missingPatterns),
    matchedPatterns: [...matchedPatterns],
    missingPatterns: [...missingPatterns],
    generatedAt: new Date().toISOString(),
  };
}

export function evaluateChallenge(
  challengeType: ProofChallengeType,
  submission: string,
  config: {
    testCases?: ProofChallengeTestCase[];
    documentConfig?: DocumentChallengeConfig;
    sqlConfig?: SQLChallengeConfig;
    apiConfig?: APIChallengeConfig;
    dataConfig?: DataChallengeConfig;
  },
): ProofEvaluation {
  switch (challengeType) {
    case "coding":
    case "debug":
      return evaluateCodingChallenge(submission, config.testCases || []);
    case "sql":
      return evaluateSQLChallenge(submission, config.sqlConfig);
    case "document":
      return evaluateDocumentChallenge(submission, config.documentConfig);
    case "api":
      return evaluateAPIChallenge(submission, config.apiConfig);
    case "data":
      return evaluateDataChallenge(submission, config.dataConfig);
    default:
      return evaluateCodingChallenge(submission, config.testCases || []);
  }
}

function evaluateCodingChallenge(
  code: string,
  testCases: ProofChallengeTestCase[],
): ProofEvaluation {
  const normalizedCode = code.toLowerCase();
  const matchedPatterns = new Set<string>();
  const missingPatterns = new Set<string>();
  let earnedWeight = 0;
  let totalWeight = 0;

  for (const testCase of testCases) {
    totalWeight += testCase.weight;
    const patterns = testCase.expectedPatterns.map((p) => p.toLowerCase());
    const matched = patterns.some((p) => normalizedCode.includes(p));

    if (matched) {
      earnedWeight += testCase.weight;
      patterns.forEach((p) => matchedPatterns.add(p));
    } else {
      patterns.forEach((p) => missingPatterns.add(p));
    }
  }

  const correctnessScore = totalWeight === 0 ? 0 : Math.round((earnedWeight / totalWeight) * 100);
  const qualitySignals = [
    /function|=>/.test(code),
    /return/.test(normalizedCode),
    /if|switch|try/.test(normalizedCode),
    code.split("\n").length >= 5,
    /const|let|var/.test(normalizedCode),
  ].filter(Boolean).length;
  const completenessSignals = [
    code.trim().length >= 50,
    /export|module\.exports/.test(code),
    code.trim().length >= 80,
    matchedPatterns.size > 0,
  ].filter(Boolean).length;

  const qualityScore = Math.round((qualitySignals / 5) * 100);
  const completenessScore = Math.round((completenessSignals / 4) * 100);
  const score = Math.round((correctnessScore * 0.5 + qualityScore * 0.25 + completenessScore * 0.25));

  return {
    score,
    passed: score >= 60,
    correctnessScore,
    qualityScore,
    completenessScore,
    summary: score >= 60
      ? "Code meets the expected solution patterns."
      : "Code needs additional work to meet expected patterns.",
    strengths: correctnessScore >= 70 ? ["Solution covers expected behaviors."] : [],
    gaps: correctnessScore < 70 ? ["Missing expected solution patterns."] : [],
    matchedPatterns: [...matchedPatterns],
    missingPatterns: [...missingPatterns],
    generatedAt: new Date().toISOString(),
  };
}

function evaluateSQLChallenge(
  query: string,
  config?: SQLChallengeConfig,
): ProofEvaluation {
  const normalizedQuery = query.toLowerCase().trim();
  const matchedPatterns = new Set<string>();
  const missingPatterns = new Set<string>();
  let earnedWeight = 0;
  let totalWeight = 0;

  const validPatterns = config?.validPatterns || ["select", "from"];
  for (const pattern of validPatterns) {
    totalWeight += 20;
    if (normalizedQuery.includes(pattern.toLowerCase())) {
      earnedWeight += 20;
      matchedPatterns.add(pattern);
    } else {
      missingPatterns.add(pattern);
    }
  }

  const blockedKeywords = config?.blockedKeywords || ["drop", "delete", "insert", "update", "truncate", "alter"];
  for (const keyword of blockedKeywords) {
    if (normalizedQuery.includes(keyword.toLowerCase())) {
      earnedWeight = 0;
      missingPatterns.add(`blocked: ${keyword}`);
    }
  }

  const correctnessScore = totalWeight === 0 ? 0 : Math.round((earnedWeight / totalWeight) * 100);
  const hasValidStructure = /select\s+.+\s+from/i.test(query);
  const completenessSignals = [
    hasValidStructure,
    query.trim().length > 10,
    query.trim().length < 500,
    !query.toLowerCase().includes("drop"),
  ].filter(Boolean).length;

  const completenessScore = Math.round((completenessSignals / 4) * 100);
  const score = Math.round((correctnessScore * 0.7 + completenessScore * 0.3));

  return {
    score,
    passed: score >= 60 && earnedWeight > 0,
    correctnessScore,
    qualityScore: hasValidStructure ? 100 : 0,
    completenessScore,
    summary: score >= 60 && earnedWeight > 0
      ? "Query has valid SELECT structure."
      : "Query needs valid SELECT structure or contains blocked operations.",
    strengths: hasValidStructure ? ["Valid query structure."] : [],
    gaps: !hasValidStructure ? ["Invalid or missing SELECT statement."] : [],
    matchedPatterns: [...matchedPatterns],
    missingPatterns: [...missingPatterns],
    generatedAt: new Date().toISOString(),
  };
}

function evaluateDocumentChallenge(
  content: string,
  config?: DocumentChallengeConfig,
): ProofEvaluation {
  const normalizedContent = content.toLowerCase();
  const requiredKeywords = config?.requiredKeywords || [];
  const requiredSections = config?.requiredSections || [];
  const minLength = config?.minLength || 50;
  const maxLength = config?.maxLength || 2000;

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const matchedPatterns = new Set<string>();
  const missingPatterns = new Set<string>();

  for (const keyword of requiredKeywords) {
    if (normalizedContent.includes(keyword.toLowerCase())) {
      matchedPatterns.add(keyword);
    } else {
      missingPatterns.add(keyword);
    }
  }

  for (const section of requiredSections) {
    if (normalizedContent.includes(section.toLowerCase())) {
      matchedPatterns.add(section);
    } else {
      missingPatterns.add(section);
    }
  }

  const keywordScore = requiredKeywords.length === 0
    ? 100
    : Math.round((matchedPatterns.size / requiredKeywords.length) * 100);
  const lengthScore = wordCount < minLength
    ? 20
    : wordCount > maxLength
      ? 50
      : 100;
  const completenessScore = requiredSections.length === 0
    ? 100
    : Math.round(((matchedPatterns.size - requiredKeywords.length) / requiredSections.length) * 100);

  const score = Math.round((keywordScore * 0.5 + lengthScore * 0.25 + completenessScore * 0.25));

  return {
    score: Math.min(100, Math.max(0, score)),
    passed: score >= 60,
    correctnessScore: keywordScore,
    qualityScore: lengthScore,
    completenessScore: Math.max(0, completenessScore),
    summary: score >= 60
      ? "Document contains required structure and keywords."
      : "Document is missing required sections or keywords.",
    strengths: keywordScore >= 70 ? ["Contains key terms."] : [],
    gaps: keywordScore < 70 ? ["Missing required keywords."] : [],
    matchedPatterns: [...matchedPatterns],
    missingPatterns: [...missingPatterns],
    generatedAt: new Date().toISOString(),
  };
}

function evaluateAPIChallenge(
  request: string,
  config?: APIChallengeConfig,
): ProofEvaluation {
  const normalizedRequest = request.toLowerCase();
  const expectedMethod = config?.expectedMethod?.toUpperCase() || "GET";
  const expectedEndpoint = config?.expectedEndpoint || "/api/";

  const methodMatch = normalizedRequest.includes(expectedMethod.toLowerCase());
  const endpointMatch = normalizedRequest.includes(expectedEndpoint.toLowerCase());

  const correctnessScore = methodMatch && endpointMatch ? 100 : 50;
  const completenessScore = endpointMatch ? 100 : 50;
  const score = Math.round((correctnessScore * 0.6 + completenessScore * 0.4));

  return {
    score,
    passed: score >= 60,
    correctnessScore,
    qualityScore: 100,
    completenessScore,
    summary: score >= 60
      ? "API request meets expected format."
      : "API request needs valid method or endpoint.",
    strengths: methodMatch && endpointMatch ? ["Valid API request format."] : [],
    gaps: !methodMatch || !endpointMatch ? ["Invalid method or endpoint."] : [],
    matchedPatterns: methodMatch ? [expectedMethod] : [],
    missingPatterns: !methodMatch ? [expectedMethod] : [],
    generatedAt: new Date().toISOString(),
  };
}

function evaluateDataChallenge(
  output: string,
  config?: DataChallengeConfig,
): ProofEvaluation {
  const expectedFormat = config?.expectedFormat || "json";
  const expectedFields = config?.expectedFields || [];

  let formatValid = false;
  if (expectedFormat === "json") {
    try {
      JSON.parse(output);
      formatValid = true;
    } catch {
      formatValid = false;
    }
  } else if (expectedFormat === "csv") {
    formatValid = output.includes(",");
  } else {
    formatValid = output.trim().length > 0;
  }

  const fieldMatches = new Set<string>();
  const missingFields = new Set<string>();
  for (const field of expectedFields) {
    if (output.toLowerCase().includes(field.toLowerCase())) {
      fieldMatches.add(field);
    } else {
      missingFields.add(field);
    }
  }

  const correctnessScore = formatValid ? 100 : 0;
  const completenessScore = expectedFields.length === 0
    ? 100
    : Math.round((fieldMatches.size / expectedFields.length) * 100);
  const score = Math.round((correctnessScore * 0.5 + completenessScore * 0.5));

  return {
    score,
    passed: score >= 60,
    correctnessScore,
    qualityScore: formatValid ? 100 : 0,
    completenessScore,
    summary: score >= 60
      ? "Data output is in expected format."
      : "Data output format is invalid.",
    strengths: formatValid ? ["Valid data format."] : [],
    gaps: !formatValid ? ["Invalid data format."] : [],
    matchedPatterns: [...fieldMatches],
    missingPatterns: [...missingFields],
    generatedAt: new Date().toISOString(),
  };
}

export function deriveProofApplicantStatus(
  submission: ProofSubmission | null,
  required: boolean,
): ProofApplicantStatus {
  if (!required && !submission) {
    return "not_required";
  }
  if (!submission) {
    return "not_started";
  }
  if (submission.status === "draft") {
    return "in_progress";
  }
  if (submission.status === "submitted" && !submission.evaluation) {
    return "submitted";
  }
  if (!submission.evaluation) {
    return "submitted";
  }
  return submission.evaluation.passed ? "passed" : "failed";
}

export function getSystemHints(
  challengeType: ProofChallengeType,
): Array<{ text: string; source: "system" }> {
  const hintsByType: Record<ProofChallengeType, Array<{ text: string; source: "system" }>> = {
    coding: [
      { text: "Break down the problem into smaller functions.", source: "system" },
      { text: "Use console.log to debug intermediate values.", source: "system" },
      { text: "Test edge cases like empty arrays or null values.", source: "system" },
    ],
    sql: [
      { text: "Start with SELECT to specify which columns you need.", source: "system" },
      { text: "Use WHERE to filter results.", source: "system" },
      { text: "Use JOIN to combine tables when needed.", source: "system" },
    ],
    document: [
      { text: "Include a brief introduction about yourself.", source: "system" },
      { text: "Highlight relevant experience for the role.", source: "system" },
      { text: "End with a clear call to action.", source: "system" },
    ],
    debug: [
      { text: "Check for undefined or null values.", source: "system" },
      { text: "Look for missing semicolons or brackets.", source: "system" },
      { text: "Verify your variable names match.", source: "system" },
    ],
    api: [
      { text: "Use the correct HTTP method for the operation.", source: "system" },
      { text: "Include required headers.", source: "system" },
      { text: "Check the endpoint URL format.", source: "system" },
    ],
    data: [
      { text: "Ensure the output is valid JSON.", source: "system" },
      { text: "Check that all required fields are present.", source: "system" },
      { text: "Verify data types match expected values.", source: "system" },
    ],
  };

  return hintsByType[challengeType] || hintsByType.coding;
}

export function getSystemReferences(
  challengeType: ProofChallengeType,
): Array<{ title: string; url: string; type: "documentation" | "tutorial" | "example" }> {
  const refsByType: Record<ProofChallengeType, Array<{ title: string; url: string; type: "documentation" | "tutorial" | "example" }>> = {
    coding: [
      { title: "MDN JavaScript Guide", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide", type: "documentation" },
      { title: "freeCodeCamp JavaScript", url: "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/", type: "tutorial" },
    ],
    sql: [
      { title: "W3Schools SQL Tutorial", url: "https://www.w3schools.com/sql/", type: "tutorial" },
      { title: "PostgreSQL Documentation", url: "https://www.postgresql.org/docs/", type: "documentation" },
    ],
    document: [
      { title: "Cover Letter Writing Guide", url: "https://www.indeed.com/career-advice/cover-letter-writing", type: "tutorial" },
      { title: "Resume Guide", url: "https://www.indeed.com/career-advice/resumes", type: "tutorial" },
    ],
    debug: [
      { title: "JavaScript Debugging", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules", type: "documentation" },
      { title: "Chrome DevTools", url: "https://developer.chrome.com/docs/devtools", type: "tutorial" },
    ],
    api: [
      { title: "REST API Guide", url: "https://www.redhat.com/en/topics/api", type: "documentation" },
      { title: "JSON Syntax", url: "https://www.json.org/", type: "documentation" },
    ],
    data: [
      { title: "JSON Format Guide", url: "https://www.json.org/", type: "documentation" },
      { title: "CSV Format", url: "https://en.wikipedia.org/wiki/Comma-separated_values", type: "documentation" },
    ],
  };

  return refsByType[challengeType] || refsByType.coding;
}

function buildStrengths(
  correctnessScore: number,
  qualityScore: number,
  completenessScore: number,
  matchedPatterns: Set<string>,
): string[] {
  return [
    ...(correctnessScore >= 70 ? ["Covers the main expected solution behaviors."] : []),
    ...(qualityScore >= 70 ? ["Code structure is readable and uses recognizable implementation patterns."] : []),
    ...(completenessScore >= 70 ? ["Submission is sufficiently complete to evaluate job-relevant work quality."] : []),
    ...(matchedPatterns.size > 0 ? [`Matched proof signals: ${[...matchedPatterns].slice(0, 3).join(", ")}`] : []),
  ].slice(0, 4);
}

function buildGaps(
  correctnessScore: number,
  qualityScore: number,
  completenessScore: number,
  missingPatterns: Set<string>,
): string[] {
  return [
    ...(correctnessScore < 70 ? ["Expected solution behaviors are only partially covered."] : []),
    ...(qualityScore < 70 ? ["Code quality signals are weak or inconsistent."] : []),
    ...(completenessScore < 70 ? ["Submission looks incomplete relative to the challenge brief."] : []),
    ...(missingPatterns.size > 0 ? [`Missing proof signals: ${[...missingPatterns].slice(0, 3).join(", ")}`] : []),
  ].slice(0, 4);
}