import { loadEngineConfig } from "./config";
import { generateReasoningWithGemini } from "./gemini";
import { buildScreeningReasoningPrompt } from "./promptBuilder";
import { rankApplicants } from "./scoring";
import { DefaultApplicantToolbox } from "./tools";
export class ScreeningOrchestrator {
    toolbox;
    constructor(toolbox = new DefaultApplicantToolbox()) {
        this.toolbox = toolbox;
    }
    async run(request) {
        const config = loadEngineConfig();
        const normalizedApplicants = await Promise.all(request.applicants.map((applicant) => this.toolbox.normalizeApplicant(applicant, request.job)));
        const ranked = rankApplicants(normalizedApplicants, request.job);
        const shortlistSize = request.shortlistSize ?? config.shortlistDefault;
        const shortlistedBase = ranked
            .filter((candidate) => candidate.score.total >= config.minimumScore)
            .slice(0, shortlistSize)
            .map((candidate) => ({ ...candidate, recommendation: "" }));
        const prompt = buildScreeningReasoningPrompt(request.job, shortlistedBase);
        const enriched = await generateReasoningWithGemini(config, prompt, shortlistedBase);
        return {
            jobTitle: request.job.title,
            totalApplicants: request.applicants.length,
            shortlisted: enriched.candidates,
            generatedAt: new Date().toISOString(),
            reasoningMode: enriched.mode,
        };
    }
}
