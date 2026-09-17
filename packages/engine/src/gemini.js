export async function generateReasoningWithGemini(config, prompt, shortlist) {
    if (!config.geminiApiKey) {
        return {
            mode: "fallback",
            candidates: shortlist.map(applyFallbackRecommendation),
        };
    }
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${config.geminiApiKey}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            text: `${prompt.system}\n\n${prompt.user}`,
                        },
                    ],
                },
            ],
            generationConfig: {
                responseMimeType: "application/json",
            },
        }),
    });
    if (!response.ok) {
        return {
            mode: "fallback",
            candidates: shortlist.map(applyFallbackRecommendation),
        };
    }
    const payload = (await response.json());
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        return {
            mode: "fallback",
            candidates: shortlist.map(applyFallbackRecommendation),
        };
    }
    try {
        const parsed = JSON.parse(text);
        const byId = new Map(parsed.shortlisted.map((item) => [item.applicantId, item]));
        return {
            mode: "gemini",
            candidates: shortlist.map((candidate) => {
                const enriched = byId.get(candidate.applicantId);
                if (!enriched) {
                    return applyFallbackRecommendation(candidate);
                }
                return {
                    ...candidate,
                    strengths: enriched.strengths?.length ? enriched.strengths : candidate.strengths,
                    gaps: enriched.gaps?.length ? enriched.gaps : candidate.gaps,
                    recommendation: enriched.recommendation ?? fallbackRecommendation(candidate),
                };
            }),
        };
    }
    catch {
        return {
            mode: "fallback",
            candidates: shortlist.map(applyFallbackRecommendation),
        };
    }
}
function applyFallbackRecommendation(candidate) {
    return {
        ...candidate,
        recommendation: fallbackRecommendation(candidate),
    };
}
function fallbackRecommendation(candidate) {
    if (candidate.dealbreakerHits.length > 0 || candidate.fraudRisk.level === "high") {
        return "Needs manual recruiter review before progression because of risk or dealbreaker signals.";
    }
    if (candidate.score.total >= 80) {
        return "Strong shortlist candidate. Prioritize for recruiter review and first-round interview.";
    }
    if (candidate.score.total >= 65) {
        return "Viable shortlist candidate. Review missing skills during recruiter screening.";
    }
    return "Borderline shortlist candidate. Keep as backup and validate fit manually.";
}
