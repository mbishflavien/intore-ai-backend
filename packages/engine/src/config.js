export function loadEngineConfig(env = process.env) {
    return {
        geminiApiKey: env.GEMINI_API_KEY,
        geminiModel: env.GEMINI_MODEL ?? "gemini-1.5-flash",
        shortlistDefault: parseInteger(env.SCREENING_TOP_N, 10),
        minimumScore: parseInteger(env.SCREENING_MIN_SCORE, 35),
    };
}
function parseInteger(value, fallback) {
    const parsed = Number.parseInt(value ?? "", 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}
