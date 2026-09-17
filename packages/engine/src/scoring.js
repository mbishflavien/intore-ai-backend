export function scoreApplicant(applicant, job) {
    const required = normalize(job.requiredSkills);
    const preferred = normalize(job.preferredSkills);
    const applicantSkills = new Set(normalize(applicant.normalizedSkills));
    const matchedRequired = required.filter((skill) => applicantSkills.has(skill));
    const matchedPreferred = preferred.filter((skill) => applicantSkills.has(skill));
    const missingSkills = required.filter((skill) => !applicantSkills.has(skill));
    const dealbreakerHits = detectDealbreakers(applicant, job.dealbreakers ?? []);
    const weights = resolveWeights(job.screeningWeights);
    const rawSkills = Math.min(100, Math.round(ratioScore(matchedRequired.length, Math.max(required.length, 1)) * 0.75 +
        ratioScore(matchedPreferred.length, Math.max(preferred.length, 1)) * 0.25));
    const rawExperience = experienceScore(applicant.yearsExperience, job.minimumYearsExperience);
    const rawEducation = educationScore(applicant.educationLevel, job.educationLevel);
    const rawRelevance = relevanceScore(applicant, job, missingSkills.length, dealbreakerHits.length);
    const skills = weightedScore(rawSkills, weights.skills);
    const experience = weightedScore(rawExperience, weights.experience);
    const education = weightedScore(rawEducation, weights.education);
    const relevance = weightedScore(rawRelevance, weights.relevance);
    const total = clamp(skills + experience + education + relevance, 0, 100);
    const score = { skills, experience, education, relevance, total };
    const strengths = [
        `${matchedRequired.length} required skills matched`,
        ...(applicant.yearsExperience >= job.minimumYearsExperience
            ? [`Meets experience baseline with ${applicant.yearsExperience} years`]
            : []),
        ...(matchedPreferred.length > 0
            ? [`Preferred skills present: ${matchedPreferred.join(", ")}`]
            : []),
        ...(applicant.fraudRisk.level === "low" ? ["Low fraud-risk signal profile"] : []),
    ].slice(0, 3);
    const gaps = [
        ...(missingSkills.length > 0 ? [`Missing required skills: ${missingSkills.join(", ")}`] : []),
        ...(applicant.yearsExperience < job.minimumYearsExperience
            ? [
                `Below experience requirement by ${job.minimumYearsExperience - applicant.yearsExperience} years`,
            ]
            : []),
        ...(dealbreakerHits.length > 0 ? [`Dealbreaker flags: ${dealbreakerHits.join(", ")}`] : []),
    ].slice(0, 2);
    return {
        applicantId: applicant.id,
        fullName: applicant.displayName,
        score,
        matchedSkills: [...matchedRequired, ...matchedPreferred],
        missingSkills,
        strengths,
        gaps,
        source: applicant.source,
        dealbreakerHits,
        fraudRisk: applicant.fraudRisk,
    };
}
export function rankApplicants(applicants, job) {
    return applicants
        .map((applicant) => scoreApplicant(applicant, job))
        .sort((left, right) => right.score.total - left.score.total)
        .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}
function normalize(values) {
    return values.map((value) => value.trim().toLowerCase()).filter(Boolean);
}
function ratioScore(value, total) {
    return total === 0 ? 0 : (value / total) * 100;
}
function experienceScore(years, minimum) {
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
function educationScore(actual, required) {
    if (!required) {
        return 100;
    }
    if (!actual) {
        return 40;
    }
    return actual.toLowerCase() === required.toLowerCase() ? 100 : 60;
}
function relevanceScore(applicant, job, missingSkillCount, dealbreakerCount) {
    let score = 60;
    if (job.location && applicant.location?.toLowerCase() === job.location.toLowerCase()) {
        score += 10;
    }
    if (missingSkillCount === 0) {
        score += 20;
    }
    if (dealbreakerCount > 0) {
        score -= 25;
    }
    if (applicant.fraudRisk.level === "high") {
        score -= 20;
    }
    else if (applicant.fraudRisk.level === "medium") {
        score -= 8;
    }
    return clamp(score, 0, 100);
}
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function weightedScore(rawScore, weightPercent) {
    return Math.round((rawScore / 100) * weightPercent);
}
function resolveWeights(input) {
    const defaults = {
        skills: 45,
        experience: 25,
        education: 10,
        relevance: 20,
    };
    const merged = {
        skills: input?.skills ?? defaults.skills,
        experience: input?.experience ?? defaults.experience,
        education: input?.education ?? defaults.education,
        relevance: input?.relevance ?? defaults.relevance,
    };
    const total = merged.skills + merged.experience + merged.education + merged.relevance;
    if (total === 100) {
        return merged;
    }
    return {
        skills: Math.round((merged.skills / total) * 100),
        experience: Math.round((merged.experience / total) * 100),
        education: Math.round((merged.education / total) * 100),
        relevance: 100 -
            Math.round((merged.skills / total) * 100) -
            Math.round((merged.experience / total) * 100) -
            Math.round((merged.education / total) * 100),
    };
}
function detectDealbreakers(applicant, dealbreakers) {
    if (dealbreakers.length === 0) {
        return [];
    }
    const haystack = [
        applicant.summary,
        applicant.educationLevel ?? "",
        applicant.location ?? "",
        ...applicant.evidence,
        ...applicant.normalizedSkills,
    ]
        .join(" ")
        .toLowerCase();
    return dealbreakers.filter((rule) => haystack.includes(rule.toLowerCase()));
}
