import type {
  MentorChatResponse,
  MentorQuizState,
  MentorSession,
  PracticeChallengeLite,
  TrainingModule,
  TrainingProgress,
  TrainingRecommendation,
} from "../../packages/shared/src/index.js";
import { findTrainingModuleForSkill, TRAINING_MODULES } from "./trainingContent.js";

const progressStore = new Map<string, TrainingProgress[]>();
const sessionStore = new Map<string, MentorSession>();

export function listTrainingModules(): TrainingModule[] {
  return TRAINING_MODULES;
}

export function getTrainingModuleById(id: string): TrainingModule | null {
  return TRAINING_MODULES.find((module) => module.id === id || module.slug === id) ?? null;
}

export async function getTrainingProgress(applicantId: string): Promise<TrainingProgress[]> {
  return progressStore.get(applicantId) ?? [];
}

export async function markTrainingUnitComplete(
  applicantId: string,
  moduleId: string,
  unitId: string,
): Promise<TrainingProgress[]> {
  const module = getTrainingModuleById(moduleId);
  if (!module) {
    throw new Error("Training module not found");
  }

  const unit = module.units.find((u) => u.id === unitId);
  if (!unit) {
    throw new Error("Unit not found in training module");
  }

  const applicantProgress = progressStore.get(applicantId) ?? [];
  let progress = applicantProgress.find((p) => p.moduleId === module.id);
  const now = new Date().toISOString();

  if (!progress) {
    progress = {
      id: crypto.randomUUID(),
      applicantId,
      moduleId: module.id,
      completedUnitIds: [],
      startedAt: now,
      lastActivityAt: now,
    };
    applicantProgress.push(progress);
  }

  if (!progress.completedUnitIds.includes(unitId)) {
    progress.completedUnitIds.push(unitId);
  }

  progress.lastActivityAt = now;
  if (module.units.every((u) => progress!.completedUnitIds.includes(u.id))) {
    progress.completedAt = now;
  } else {
    progress.completedAt = undefined;
  }

  progressStore.set(applicantId, applicantProgress);
  return applicantProgress;
}

export function buildSkillGapRecommendations(options: {
  profileSkills: string[];
  jobs: Array<{ requiredSkills: string[]; title: string }>;
}): TrainingRecommendation[] {
  const { profileSkills, jobs } = options;
  const owned = new Set(profileSkills.map((skill) => skill.trim().toLowerCase()));

  const demand = new Map<string, { jobTitles: string[]; count: number }>();
  const modulesBySkill = new Map<string, TrainingModule>();

  for (const job of jobs) {
    for (const skill of job.requiredSkills) {
      const normalized = skill.trim().toLowerCase();
      if (owned.has(normalized)) {
        continue;
      }

      const entry = demand.get(normalized) ?? { jobTitles: [], count: 0 };
      if (!entry.jobTitles.includes(job.title)) {
        entry.jobTitles.push(job.title);
      }
      entry.count += 1;
      demand.set(normalized, entry);

      if (!modulesBySkill.has(normalized)) {
        const module = findTrainingModuleForSkill(skill);
        if (module) {
          modulesBySkill.set(normalized, module);
        }
      }
    }
  }

  return [...demand.entries()]
    .map(([skill, entry]) => {
      const module = modulesBySkill.get(skill) ?? null;
      return {
        skill: entry.jobTitles.length === 0 ? "" : skill,
        module: module
          ? {
              id: module.id,
              slug: module.slug,
              title: module.title,
              level: module.level,
              estimatedMinutes: module.estimatedMinutes,
            }
          : undefined,
        jobTitles: entry.jobTitles,
        jobCount: entry.count,
        reason: skill,
      };
    })
    .filter((recommendation) => recommendation.skill !== "")
    .sort((a, b) => b.jobCount - a.jobCount);
}

export function normalizeRecommendationReason(recommendation: {
  reason: string;
  module?: { title: string } | undefined;
}): string {
  const displaySkill = recommendation.reason.split(" ").map(capitalize).join(" ");
  if (recommendation.module) {
    return `Jobs in your market expect ${displaySkill}. Start with "${recommendation.module.title}".`;
  }
  return `Jobs in your market expect ${displaySkill}. We are still adding a lesson for it — try practice challenges meanwhile.`;
}

export function isCommonTrainingWord(word: string): boolean {
  return [
    "the", "a", "an", "and", "or", "in", "on", "of", "for", "to", "with", "at",
    "what", "how", "why", "can", "you", "tell", "me", "about", "i", "want", "learn",
    "is", "are", "do", "does", "help", "teach", "explain", "show", "please", "thanks",
    "thank", "ok", "okay", "hello", "hi", "hey", "bye", "good", "practice", "quiz",
  ].includes(word);
}

export function guessSkillFromMessage(message: string, fallbackSkill: string): string {
  const words = message.toLowerCase().replace(/[^a-z0-9+#.-]+/g, " ").split(/\s+/).filter(Boolean);
  for (const word of words) {
    if (isCommonTrainingWord(word)) {
      continue;
    }
    const module = findTrainingModuleForSkill(word);
    if (module) {
      return module.skill;
    }
  }

  for (const token of words) {
    if (fallbackSkill && token.includes(fallbackSkill.toLowerCase())) {
      return fallbackSkill;
    }
  }

  return fallbackSkill || "";
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export async function getOrCreateMentorSession(options: {
  applicantId: string;
  sessionId?: string;
  skill?: string;
}): Promise<{ session: MentorSession; created: boolean }> {
  if (options.sessionId) {
    const existing = sessionStore.get(options.sessionId);
    if (existing && existing.applicantId === options.applicantId) {
      return { session: existing, created: false };
    }
  }

  const now = new Date().toISOString();
  const session: MentorSession = {
    id: crypto.randomUUID(),
    applicantId: options.applicantId,
    skill: options.skill ?? "",
    turns: [
      {
        id: crypto.randomUUID(),
        role: "mentor",
        content:
          "Muraho! I'm your IntoreAI career coach. Pick a skill below — or just ask about one — and I'll quiz you topic by topic. Type an answer (A, B, C or D) and I'll give you instant feedback.",
        createdAt: now,
      },
    ],
    pendingQuiz: null,
    correctCount: 0,
    questionIndex: 0,
    createdAt: now,
    updatedAt: now,
  };

  sessionStore.set(session.id, session);
  return { session, created: true };
}

export async function respond(session: MentorSession, message: string): Promise<{
  reply: string;
  quiz: Pick<MentorQuizState, "question" | "options" | "questionIndex"> | null;
  correctCount: number;
}> {
  const module = findTrainingModuleForSkill(session.skill);
  const now = new Date().toISOString();
  const lower = message.trim().toLowerCase();

  session.turns.push({ id: crypto.randomUUID(), role: "user", content: message, createdAt: now });

  if (/^(hi|hello|hey|muraho|muraho neza|thank|thanks|sawa|ok|okay)\b/.test(lower) && !session.pendingQuiz) {
    session.pendingQuiz = null;
    const firstQuiz = module ? nextQuiz(module, 0) : null;
    if (firstQuiz) {
      session.pendingQuiz = firstQuiz;
      session.questionIndex = 1;
      session.turns.push({
        id: crypto.randomUUID(),
        role: "mentor",
        content: buildExplainIntro(module),
        createdAt: now,
      });
      return {
        reply: buildExplainIntro(module),
        quiz: toQuizView(firstQuiz),
        correctCount: session.correctCount,
      };
    }
  }

  if (session.pendingQuiz) {
    const answer = parseAnswer(message, session.pendingQuiz);
    if (answer !== null) {
      const current = session.pendingQuiz;
      const correct = answer === current.answerIndex;
      if (correct) {
        session.correctCount += 1;
      }

      const feedback = correct
        ? `✅ Correct! ${current.explanation}`
        : `Not quite — the right answer was ${String.fromCharCode(65 + current.answerIndex)}. ${current.explanation}`;

      session.pendingQuiz = null;
      const next = module ? nextQuiz(module, session.questionIndex) : null;

      let reply = `${feedback}`;
      if (next) {
        session.pendingQuiz = next;
        session.questionIndex += 1;
        reply += `\n\n${next.topic}\n${module?.units.find((u) => u.id === current.topic)?.content.split("\n")[0] ?? ""}\n`;
        reply += `\nLet's keep going — question ${session.questionIndex}:`;
      } else {
        reply += `\n\n🎉 You finished "${session.skill}". You answered ${session.correctCount} correctly. Revisit the module lessons anytime, or pick your next skill.`;
      }

      session.turns.push({ id: crypto.randomUUID(), role: "mentor", content: reply, createdAt: now });
      return { reply, quiz: next ? toQuizView(next) : null, correctCount: session.correctCount };
    }
  }

  const quiz = module ? nextQuizForTopic(module, session.pendingQuiz, message) : null;
  const topic = quiz?.topic ?? findTopicForMessage(module, lower);
  const lesson = topic
    ? module?.units.find((u) => u.title.toLowerCase() === topic.toLowerCase())
    : module?.units[0];

  const intro = lesson
    ? `Great question. Let's cover **${lesson.title}**.\n\n${lesson.content.split("\n").slice(0, 4).join("\n")}`
    : module
      ? buildExplainIntro(module)
      : `I coach best on ${session.skill || "a skill you pick"}. Tell me which skill you want to work on, or ask me to quiz you.`;

  const question = quiz ?? (module ? nextQuiz(module, session.questionIndex) : null);

  let reply = intro;
  if (question && !session.pendingQuiz) {
    session.pendingQuiz = question;
    session.questionIndex += 1;
    reply += `\n\nQuestion ${session.questionIndex}:`;
  }

  session.turns.push({ id: crypto.randomUUID(), role: "mentor", content: reply, createdAt: now });
  return { reply, quiz: question ? toQuizView(question) : null, correctCount: session.correctCount };
}

function buildExplainIntro(module: TrainingModule | null): string {
  if (!module) {
    return "Pick a skill to start coaching. I have lessons and quizzes for React, TypeScript, Node.js, Python, SQL, Data Analysis, Machine Learning, DevOps, UI/UX, Product, React Native, QA, and Digital Marketing.";
  }
  return (
    `Let's train **${module.skill}**.\n\n${module.description}\n\n` +
    `There are ${module.units.length} units (about ${module.estimatedMinutes} minutes). I'll coach you through each topic with a short lesson and a question. First up:`
  );
}

function toQuizView(quiz: MentorQuizState): { question: string; options: string[]; questionIndex: number } {
  return {
    question: quiz.question,
    options: quiz.options,
    questionIndex: quiz.questionIndex,
  };
}

function nextQuizForTopic(module: TrainingModule | null, pending: MentorQuizState | null, message: string): MentorQuizState | null {
  if (!module) {
    return null;
  }
  const unit = findUnitForMessage(module, message.toLowerCase());
  if (!unit?.quiz) {
    return null;
  }
  const topic = unit.title;
  return { ...unit.quiz, topic, questionIndex: 0 };
}

function nextQuiz(module: TrainingModule, indexFrom: number): MentorQuizState | null {
  const units = module.units.filter((u) => u.quiz);
  if (units.length === 0) {
    return null;
  }
  const unit = units[indexFrom % units.length];
  if (!unit?.quiz) {
    return null;
  }
  return { ...unit.quiz, topic: unit.title, questionIndex: indexFrom + 1 };
}

function findTopicForMessage(module: TrainingModule | null, lower: string): string | null {
  if (!module) {
    return null;
  }
  return findUnitForMessage(module, lower)?.title ?? null;
}

function findUnitForMessage(module: TrainingModule, lower: string) {
  if (!module) {
    return null;
  }

  const keywords = lower.replace(/[^a-z0-9+#.-]+/g, " ").split(/\s+/).filter((word) => word.length > 2 && !isCommonTrainingWord(word));
  if (keywords.length === 0) {
    return module.units[0] ?? null;
  }

  let bestMatch: { unit: TrainingModule["units"][number]; score: number } | null = null;
  for (const unit of module.units) {
    const haystack = `${unit.title} ${unit.content}`.toLowerCase();
    let score = 0;
    for (const keyword of keywords) {
      if (haystack.includes(keyword)) {
        score += 1;
      }
    }
    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { unit, score };
    }
  }

  if (!bestMatch || bestMatch.score <= 0) {
    return module.units[0] ?? null;
  }
  return bestMatch.unit;
}

function parseAnswer(message: string, quiz: MentorQuizState): number | null {
  const trimmed = message.trim();
  const letter = /^([a-dA-D])([.)\s]|$)/.exec(trimmed);
  if (letter) {
    const index = letter[1].toUpperCase().charCodeAt(0) - 65;
    if (index >= 0 && index < quiz.options.length) {
      return index;
    }
  }

  const number = /^([1-4])([.)\s]|$)/.exec(trimmed);
  if (number) {
    const index = Number.parseInt(number[1], 10) - 1;
    if (index >= 0 && index < quiz.options.length) {
      return index;
    }
  }

  const exact = quiz.options.findIndex((option) => option.toLowerCase() === trimmed.toLowerCase());
  if (exact >= 0) {
    return exact;
  }

  return null;
}

export function persistSession(session: MentorSession): void {
  session.updatedAt = new Date().toISOString();
  sessionStore.set(session.id, session);
}

export function buildMentorResponse(session: MentorSession, result: Awaited<ReturnType<typeof respond>>): MentorChatResponse {
  return {
    sessionId: session.id,
    skill: session.skill,
    reply: result.reply,
    quiz: result.quiz,
    correctCount: result.correctCount,
  };
}