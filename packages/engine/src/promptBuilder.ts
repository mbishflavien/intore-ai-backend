import type { JobRequirementInput, RankedCandidate } from "../../shared/src/index.js";

export interface ScreeningPrompt {
  system: string;
  user: string;
}

export function buildScreeningReasoningPrompt(
  job: JobRequirementInput,
  shortlist: RankedCandidate[],
): ScreeningPrompt {
  const system = [
    "You are an AI screening copilot for recruiters.",
    "Preserve human decision-making and avoid claiming the candidate is hired.",
    "Treat the output as assistive guidance, not an autonomous decision.",
    "Return strict JSON with a top-level field named shortlisted.",
    "For each candidate include applicantId, strengths, gaps, recommendation.",
    "Recommendations must be concise, recruiter-friendly, and evidence-based.",
    "Mention risk or dealbreaker concerns separately when present.",
  ].join(" ");

  const user = JSON.stringify(
    {
      job,
      shortlist: shortlist.map((candidate) => ({
        applicantId: candidate.applicantId,
        fullName: candidate.fullName,
        rank: candidate.rank,
        score: candidate.score,
        matchedSkills: candidate.matchedSkills,
        missingSkills: candidate.missingSkills,
        dealbreakerHits: candidate.dealbreakerHits,
        fraudRisk: candidate.fraudRisk,
        proof: candidate.proof,
        strengths: candidate.strengths,
        gaps: candidate.gaps,
        profile: candidate.profile
          ? {
              headline: candidate.profile.headline,
              location: candidate.profile.location,
              availability: candidate.profile.availability,
              skills: candidate.profile.skills,
              experience: candidate.profile.experience,
              education: candidate.profile.education,
              projects: candidate.profile.projects,
              socialLinks: candidate.profile.socialLinks,
            }
          : undefined,
      })),
    },
    null,
    2,
  );

  return { system, user };
}
