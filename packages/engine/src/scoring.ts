import type {
  JobRequirementInput,
  NormalizedApplicant,
  RankedCandidate,
  ScoreBreakdown,
  ScoreWeights,
} from "../../shared/src/index.js";

export function scoreApplicant(
  applicant: NormalizedApplicant,
  job: JobRequirementInput,
): Omit<RankedCandidate, "rank" | "recommendation"> {
  const required = normalize(job.requiredSkills);
  const preferred = normalize(job.preferredSkills);
  const applicantSkills = new Set(normalize(applicant.normalizedSkills));

  const matchedRequired = required.filter((skill) => applicantSkills.has(skill));
  const matchedPreferred = preferred.filter((skill) => applicantSkills.has(skill));
  const missingSkills = required.filter((skill) => !applicantSkills.has(skill));
  const dealbreakerHits = detectDealbreakers(applicant, job.dealbreakers ?? []);
  const weights = resolveWeights(job.screeningWeights);

  const rawSkills = Math.min(
    100,
    Math.round(
      ratioScore(matchedRequired.length, Math.max(required.length, 1)) * 0.75 +
        ratioScore(matchedPreferred.length, Math.max(preferred.length, 1)) * 0.25,
    ),
  );

  const rawExperience = experienceScore(applicant.yearsExperience, job.minimumYearsExperience);
  const rawEducation = educationScore(applicant.profile.education, job.educationLevel);
  const rawRelevance = relevanceScore(applicant, job, missingSkills.length, dealbreakerHits.length);
  const rawProof = proofScore(applicant, job);

  const skills = weightedScore(rawSkills, weights.skills);
  const experience = weightedScore(rawExperience, weights.experience);
  const education = weightedScore(rawEducation, weights.education);
  const relevance = weightedScore(rawRelevance, weights.relevance);
  const proof = weightedScore(rawProof, weights.proof);

  const total = clamp(skills + experience + education + relevance + proof, 0, 100);
  const score: ScoreBreakdown = { skills, experience, education, relevance, proof, total };

  const strengths = [
    `${matchedRequired.length} required skills matched`,
    ...(applicant.yearsExperience >= job.minimumYearsExperience
      ? [`Meets experience baseline with ${applicant.yearsExperience} years`]
      : []),
    ...(matchedPreferred.length > 0
      ? [`Preferred skills present: ${matchedPreferred.join(", ")}`]
      : []),
    ...(applicant.profile.projects.length > 0
      ? [`Projects included: ${applicant.profile.projects.slice(0, 2).map((project) => project.name).join(", ")}`]
      : []),
    ...(applicant.proof.passed
      ? [`ProofHire score ${applicant.proof.score}% on verified challenge`]
      : []),
    ...(applicant.fraudRisk.level === "low" ? ["Low fraud-risk signal profile"] : []),
  ].slice(0, 3);

  const gaps = [
    ...(missingSkills.length > 0 ? [`Missing required skills: ${missingSkills.join(", ")}`] : []),
    ...(applicant.yearsExperience < job.minimumYearsExperience
      ? [
          `Below experience requirement by ${
            job.minimumYearsExperience - applicant.yearsExperience
          } years`,
        ]
      : []),
    ...(dealbreakerHits.length > 0 ? [`Dealbreaker flags: ${dealbreakerHits.join(", ")}`] : []),
    ...(job.proofHire?.enabled && job.proofHire.mode === "required" && !applicant.proof.requiredSatisfied
      ? ["Required ProofHire challenge not yet passed"] : []),
  ].slice(0, 2);

  return {
    applicantId: applicant.id,
    fullName: applicant.displayName,
    profile: applicant.profile,
    score,
    matchedSkills: [...matchedRequired, ...matchedPreferred],
    missingSkills,
    strengths,
    gaps,
    source: applicant.source,
    dealbreakerHits,
    fraudRisk: applicant.fraudRisk,
    proof: applicant.proof,
  };
}

export function rankApplicants(
  applicants: NormalizedApplicant[],
  job: JobRequirementInput,
): Omit<RankedCandidate, "recommendation">[] {
  return applicants
    .map((applicant) => scoreApplicant(applicant, job))
    .filter((candidate) => !job.proofHire?.enabled || job.proofHire.mode !== "required" || candidate.proof.requiredSatisfied)
    .sort((left, right) => right.score.total - left.score.total)
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}

function normalize(values: string[]): string[] {
  return values.map((value) => value.trim().toLowerCase()).filter(Boolean);
}

function ratioScore(value: number, total: number): number {
  return total === 0 ? 0 : (value / total) * 100;
}

function experienceScore(years: number, minimum: number): number {
  if (minimum <= 0) {
    return 80;
  }
  if (years >= minimum + 2) {
    return 100;
  }
  if (years >= minimum) {
    return 80;
  }
  if (years + 1 >= minimum) {
    return 50;
  }
  return 20;
}

function educationScore(
  education: NormalizedApplicant["profile"]["education"],
  required?: string,
): number {
  if (!required) {
    return 100;
  }
  if (education.length === 0) {
    return 40;
  }
  return education.some((entry) => entry.degree.toLowerCase() === required.toLowerCase()) ? 100 : 60;
}

function relevanceScore(
  applicant: NormalizedApplicant,
  job: JobRequirementInput,
  missingSkillCount: number,
  dealbreakerCount: number,
): number {
  let score = 60;
  if (job.location && applicant.location?.toLowerCase() === job.location.toLowerCase()) {
    score += 10;
  }
  if (missingSkillCount === 0) {
    score += 20;
  }
  if (applicant.profile.availability.status !== "Not Available") {
    score += 5;
  }
  if (applicant.profile.projects.length > 0) {
    score += 5;
  }
  if (applicant.profile.socialLinks?.linkedin || applicant.profile.socialLinks?.portfolio) {
    score += 5;
  }
  if (dealbreakerCount > 0) {
    score -= 25;
  }
  if (applicant.fraudRisk.level === "high") {
    score -= 20;
  } else if (applicant.fraudRisk.level === "medium") {
    score -= 8;
  }
  return clamp(score, 0, 100);
}

function proofScore(applicant: NormalizedApplicant, job: JobRequirementInput): number {
  if (!job.proofHire?.enabled) {
    return 50;
  }
  if (!applicant.proof.summary && applicant.proof.status === "not_started") {
    return 0;
  }
  if (job.proofHire.mode === "required" && !applicant.proof.requiredSatisfied) {
    return 0;
  }
  return clamp(applicant.proof.score, 0, 100);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function weightedScore(rawScore: number, weightPercent: number): number {
  return Math.round((rawScore / 100) * weightPercent);
}

function resolveWeights(
  input: Partial<ScoreWeights> | undefined,
): ScoreWeights {
  const defaults: ScoreWeights = {
    skills: 35,
    experience: 20,
    education: 10,
    relevance: 15,
    proof: 20,
  };

  const merged: ScoreWeights = {
    skills: input?.skills ?? defaults.skills,
    experience: input?.experience ?? defaults.experience,
    education: input?.education ?? defaults.education,
    relevance: input?.relevance ?? defaults.relevance,
    proof: input?.proof ?? defaults.proof,
  };

  const total = merged.skills + merged.experience + merged.education + merged.relevance + merged.proof;
  if (total === 100) {
    return merged;
  }

  return {
    skills: Math.round((merged.skills / total) * 100),
    experience: Math.round((merged.experience / total) * 100),
    education: Math.round((merged.education / total) * 100),
    relevance: Math.round((merged.relevance / total) * 100),
    proof: 100 -
      Math.round((merged.skills / total) * 100) -
      Math.round((merged.experience / total) * 100) -
      Math.round((merged.education / total) * 100) -
      Math.round((merged.relevance / total) * 100),
  };
}

function detectDealbreakers(applicant: NormalizedApplicant, dealbreakers: string[]): string[] {
  if (dealbreakers.length === 0) {
    return [];
  }
  const haystack = [
    applicant.summary,
    ...applicant.profile.education.map((entry) => [
      entry.degree,
      entry.fieldOfStudy,
      entry.institution,
    ].join(" ")),
    applicant.location ?? "",
    ...applicant.evidence,
    ...applicant.normalizedSkills,
    applicant.profile.availability.status,
    applicant.profile.availability.type,
  ]
    .join(" ")
    .toLowerCase();

  return dealbreakers.filter((rule) => haystack.includes(rule.toLowerCase()));
}
