export function buildScreeningReasoningPrompt(job, shortlist) {
    const system = [
        "You are an AI screening copilot for recruiters.",
        "Preserve human decision-making and avoid claiming the candidate is hired.",
        "Treat the output as assistive guidance, not an autonomous decision.",
        "Return strict JSON with a top-level field named shortlisted.",
        "For each candidate include applicantId, strengths, gaps, recommendation.",
        "Recommendations must be concise, recruiter-friendly, and evidence-based.",
        "Mention risk or dealbreaker concerns separately when present.",
    ].join(" ");
    const user = JSON.stringify({
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
            strengths: candidate.strengths,
            gaps: candidate.gaps,
        })),
    }, null, 2);
    return { system, user };
}
