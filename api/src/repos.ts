import type {
  ActivityLogRepository,
  ApplicationRepository,
  InterviewRepository,
  JobRepository,
  NotificationRepository,
  ProfileRepository,
  ProofChallengeRepository,
  ProofSubmissionRepository,
  ScreeningRepository,
  UserRepository,
} from "./repositories.js";
import {
  createActivityLogRepository,
  createApplicationRepository,
  createInterviewRepository,
  createJobRepository,
  createNotificationRepository,
  createProfileRepository,
  createProofChallengeRepository,
  createProofSubmissionRepository,
  createRepository,
  createUserRepository,
} from "./repositories.js";

/** Shared repository singletons, initialized once at boot. */
export const repos: {
  screening?: ScreeningRepository;
  user?: UserRepository;
  job?: JobRepository;
  application?: ApplicationRepository;
  profile?: ProfileRepository;
  proofChallenge?: ProofChallengeRepository;
  proofSubmission?: ProofSubmissionRepository;
  interview?: InterviewRepository;
  notification?: NotificationRepository;
  activityLog?: ActivityLogRepository;
} = {};

export async function initRepos(): Promise<void> {
  console.log("Initializing repositories...");
  repos.screening = await createRepository();
  repos.user = await createUserRepository();
  repos.job = await createJobRepository();
  repos.application = await createApplicationRepository();
  repos.profile = await createProfileRepository();
  repos.proofChallenge = await createProofChallengeRepository();
  repos.proofSubmission = await createProofSubmissionRepository();
  repos.interview = await createInterviewRepository();
  repos.notification = await createNotificationRepository();
  repos.activityLog = await createActivityLogRepository();
  console.log("Repositories initialized.");
}

function must<T>(value: T | undefined, name: string): T {
  if (!value) throw new Error(`Repositories not initialized (missing ${name}). Call initRepos() first.`);
  return value;
}

export const db = {
  get screening(): ScreeningRepository { return must(repos.screening, "screening"); },
  get user(): UserRepository { return must(repos.user, "user"); },
  get job(): JobRepository { return must(repos.job, "job"); },
  get application(): ApplicationRepository { return must(repos.application, "application"); },
  get profile(): ProfileRepository { return must(repos.profile, "profile"); },
  get proofChallenge(): ProofChallengeRepository { return must(repos.proofChallenge, "proofChallenge"); },
  get proofSubmission(): ProofSubmissionRepository { return must(repos.proofSubmission, "proofSubmission"); },
  get interview(): InterviewRepository { return must(repos.interview, "interview"); },
  get notification(): NotificationRepository { return must(repos.notification, "notification"); },
  get activityLog(): ActivityLogRepository { return must(repos.activityLog, "activityLog"); },
};
