export interface EngineConfig {
  geminiApiKey?: string;
  geminiModel: string;
  shortlistDefault: number;
  minimumScore: number;
}

export function loadEngineConfig(
  env: Record<string, string | undefined> = process.env,
): EngineConfig {
  return {
    geminiApiKey: env.GEMINI_API_KEY,
    geminiModel: env.GEMINI_MODEL ?? "gemini-1.5-flash",
    shortlistDefault: parseInteger(env.SCREENING_TOP_N, 10),
    minimumScore: parseInteger(env.SCREENING_MIN_SCORE, 35),
  };
}

function parseInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}
