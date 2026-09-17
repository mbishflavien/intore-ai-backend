import type {
  RankedCandidate,
  ScreeningRequest,
  ScreeningResult,
} from "../../shared/src/index.js";

import { loadEngineConfig } from "./config.js";
import { generateReasoningWithGemini } from "./gemini.js";
import { buildScreeningReasoningPrompt } from "./promptBuilder.js";
import { rankApplicants } from "./scoring.js";
import { DefaultApplicantToolbox, type ApplicantToolbox } from "./tools.js";

export class ScreeningOrchestrator {
  constructor(
    private readonly toolbox: ApplicantToolbox = new DefaultApplicantToolbox(),
  ) {}

  async run(request: ScreeningRequest): Promise<ScreeningResult> {
    const config = loadEngineConfig();
    const normalizedApplicants = await Promise.all(
      request.applicants.map((applicant) =>
        this.toolbox.normalizeApplicant(
          applicant,
          request.job,
          request.proofSignals?.[applicant.id ?? ""],
        ),
      ),
    );

    const ranked = rankApplicants(normalizedApplicants, request.job);
    const shortlistSize = request.shortlistSize ?? config.shortlistDefault;
    const shortlistedBase: RankedCandidate[] = ranked
      .filter((candidate) => candidate.score.total >= config.minimumScore)
      .slice(0, shortlistSize)
      .map((candidate) => ({ ...candidate, recommendation: "" }));

    const prompt = buildScreeningReasoningPrompt(request.job, shortlistedBase);
    const enriched = await generateReasoningWithGemini(
      config,
      prompt,
      shortlistedBase,
    );

    return {
      jobTitle: request.job.title,
      totalApplicants: request.applicants.length,
      shortlisted: enriched.candidates,
      generatedAt: new Date().toISOString(),
      reasoningMode: enriched.mode,
    };
  }
}
