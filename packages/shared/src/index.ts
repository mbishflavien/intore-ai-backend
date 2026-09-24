export type ApplicantSource = "umurava_profile" | "resume_upload" | "spreadsheet_row";
export type ProofChallengeType = "coding" | "sql" | "document" | "debug" | "api" | "data";
export type ProofHireMode = "required" | "optional";
export type ProofSubmissionStatus = "draft" | "submitted" | "evaluated";
export type ProofApplicantStatus =
  | "not_required"
  | "not_started"
  | "in_progress"
  | "submitted"
  | "passed"
  | "failed";

export interface Skill {
  name: string;
  level: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  yearsOfExperience: number;
}

export interface Language {
  name: string;
  proficiency: "Basic" | "Conversational" | "Fluent" | "Native";
}

export interface WorkExperience {
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
  technologies: string[];
  isCurrent: boolean;
}

export interface Education {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startYear: number;
  endYear: number;
}

export interface Certification {
  name: string;
  issuer: string;
  issueDate: string;
}

export interface Project {
  name: string;
  description: string;
  technologies: string[];
  role: string;
  link?: string;
  startDate: string;
  endDate: string;
}

export interface Availability {
  status: "Available" | "Open to Opportunities" | "Not Available";
  type: "Full-time" | "Part-time" | "Contract";
  startDate?: string;
}

export interface SocialLinks {
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

export interface TalentProfile {
  firstName: string;
  lastName: string;
  email: string;
  headline: string;
  bio?: string;
  location: string;
  skills: Skill[];
  languages?: Language[];
  experience: WorkExperience[];
  education: Education[];
  certifications?: Certification[];
  projects: Project[];
  availability: Availability;
  socialLinks?: SocialLinks;
  source: ApplicantSource;
  id?: string;
  phone?: string;
  ipAddress?: string;
}

export interface ProofChallengeTestCase {
  id: string;
  title: string;
  description: string;
  expectedPatterns: string[];
  weight: number;
}

export type HintSource = "recruiter" | "system";
export type ReferenceType = "documentation" | "tutorial" | "example" | "article";

export interface ProofHint {
  id: string;
  text: string;
  source: HintSource;
}

export interface ProofReference {
  id: string;
  title: string;
  url: string;
  type: ReferenceType;
}

export interface DocumentChallengeConfig {
  requiredSections: string[];
  requiredKeywords: string[];
  minLength: number;
  maxLength: number;
}

export interface SQLChallengeConfig {
  schema: {
    tables: string[];
    columns: string[];
  };
  validPatterns: string[];
  blockedKeywords: string[];
}

export interface APIChallengeConfig {
  expectedMethod: string;
  expectedEndpoint: string;
  expectedHeaders: string[];
  mockData: object;
}

export interface DataChallengeConfig {
  expectedFormat: "json" | "csv" | "table";
  expectedFields: string[];
  validationType: "structure" | "values" | "both";
}

export interface ProofChallengeRubric {
  correctnessWeight: number;
  qualityWeight: number;
  completenessWeight: number;
  minimumPassingScore: number;
}

export interface ProofChallenge {
  id: string;
  recruiterId: string;
  title: string;
  slug: string;
  type: ProofChallengeType;
  instructions: string;
  prompt: string;
  starterCode?: string;
  starterQuery?: string;
  mockData?: object;
  requiredSkills: string[];
  testCases: ProofChallengeTestCase[];
  rubric: ProofChallengeRubric;
  hints: ProofHint[];
  references: ProofReference[];
  documentConfig?: DocumentChallengeConfig;
  sqlConfig?: SQLChallengeConfig;
  apiConfig?: APIChallengeConfig;
  dataConfig?: DataChallengeConfig;
  createdAt: string;
  updatedAt: string;
}

export interface ProofChallengeTemplate {
  id: string;
  title: string;
  type: ProofChallengeType;
  prompt: string;
  starterCode?: string;
  starterQuery?: string;
  requiredSkills: string[];
  testCases: ProofChallengeTestCase[];
  rubric: ProofChallengeRubric;
  hints?: Array<{ id?: string; text: string; source: HintSource }>;
  references?: Array<{ id?: string; title: string; url: string; type: ReferenceType }>;
  documentConfig?: DocumentChallengeConfig;
  sqlConfig?: SQLChallengeConfig;
  apiConfig?: APIChallengeConfig;
  dataConfig?: DataChallengeConfig;
}

export interface ProofHireJobChallenge {
  challengeId: string;
  order: number;
}

export interface ProofHireConfig {
  enabled: boolean;
  mode: ProofHireMode;
  challengeId?: string;
  proofWeight?: number;
  challenges?: ProofHireJobChallenge[];
  showPreviousQuestions?: boolean;
}

export interface ProofEvaluation {
  score: number;
  passed: boolean;
  correctnessScore: number;
  qualityScore: number;
  completenessScore: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  matchedPatterns: string[];
  missingPatterns: string[];
  generatedAt: string;
}

export interface ProofSubmission {
  id: string;
  challengeId: string;
  jobId: string;
  applicantId: string;
  code: string;
  language: string;
  status: ProofSubmissionStatus;
  evaluation?: ProofEvaluation;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
}

export interface JobRequirementInput {
  title: string;
  summary: string;
  requiredSkills: string[];
  preferredSkills: string[];
  minimumYearsExperience: number;
  educationLevel?: string;
  location?: string;
  dealbreakers?: string[];
  screeningWeights?: Partial<ScoreWeights>;
  anonymizeCandidates?: boolean;
  proofHire?: ProofHireConfig;
}

export interface ApplicantInput {
  id: string;
  fullName: string;
  source: ApplicantSource;
  skills?: string[];
  yearsExperience?: number;
  educationLevel?: string;
  location?: string;
  workHistory?: string[];
  rawResumeText?: string;
  profileSummary?: string;
  email?: string;
  phone?: string;
  ipAddress?: string;
}

export type ApplicantData = ApplicantInput | TalentProfile;

export interface FraudRiskAssessment {
  level: "low" | "medium" | "high";
  signals: string[];
}

export interface ProofCandidateSignal {
  status: ProofApplicantStatus;
  score: number;
  summary?: string;
  passed: boolean;
  requiredSatisfied: boolean;
  submissionId?: string;
}

export interface NormalizedApplicant {
  id: string;
  fullName: string;
  displayName: string;
  source: ApplicantSource;
  profile: TalentProfile;
  normalizedSkills: string[];
  yearsExperience: number;
  educationLevel?: string;
  location?: string;
  evidence: string[];
  summary: string;
  fraudRisk: FraudRiskAssessment;
  proof: ProofCandidateSignal;
}

export interface ScoreWeights {
  skills: number;
  experience: number;
  education: number;
  relevance: number;
  proof: number;
}

export interface ScoreBreakdown {
  skills: number;
  experience: number;
  education: number;
  relevance: number;
  proof: number;
  total: number;
}

export interface RankedCandidate {
  applicantId: string;
  rank: number;
  fullName: string;
  profile?: TalentProfile;
  score: ScoreBreakdown;
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  gaps: string[];
  recommendation: string;
  source: ApplicantSource;
  dealbreakerHits: string[];
  fraudRisk: FraudRiskAssessment;
  proof: ProofCandidateSignal;
}

export interface ScreeningRequest {
  job: JobRequirementInput;
  applicants: ApplicantData[];
  shortlistSize?: number;
  proofSignals?: Record<string, ProofCandidateSignal>;
}

export interface ScreeningResult {
  jobTitle: string;
  totalApplicants: number;
  shortlisted: RankedCandidate[];
  generatedAt: string;
  reasoningMode: "gemini" | "fallback";
}

export interface ScreeningRunRecord {
  id: string;
  request: ScreeningRequest;
  result: ScreeningResult;
  createdAt: string;
  status: "completed";
}

export interface RecruiterReviewInput {
  screeningRunId: string;
  applicantId: string;
  decision: "advance" | "hold" | "reject";
  note?: string;
}

export interface RecruiterReviewRecord extends RecruiterReviewInput {
  id: string;
  createdAt: string;
}

export interface CreateProofChallengeInput {
  type: ProofChallengeType;
  title: string;
  instructions: string;
  prompt: string;
  starterCode?: string;
  starterQuery?: string;
  mockData?: object;
  requiredSkills?: string[];
  testCases: Array<{
    title: string;
    description: string;
    expectedPatterns: string[];
    weight: number;
  }>;
  rubric?: Partial<ProofChallengeRubric>;
  hints?: Array<{
    id?: string;
    text: string;
    source: HintSource;
  }>;
  references?: Array<{
    id?: string;
    title: string;
    url: string;
    type: ReferenceType;
  }>;
  documentConfig?: DocumentChallengeConfig;
  sqlConfig?: SQLChallengeConfig;
  apiConfig?: APIChallengeConfig;
  dataConfig?: DataChallengeConfig;
}

export interface CreateProofSubmissionInput {
  challengeId: string;
  jobId: string;
  code: string;
  language?: string;
}

export function isTalentProfile(input: ApplicantData): input is TalentProfile {
  return "firstName" in input && "headline" in input && Array.isArray(input.skills);
}

export function isApplicantInput(input: ApplicantData): input is ApplicantInput {
  return "fullName" in input;
}

export function mapApplicantToTalentProfile(input: ApplicantInput): TalentProfile {
  const nameParts = input.fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] ?? input.fullName;
  const lastName = nameParts.slice(1).join(" ");

  return {
    firstName,
    lastName,
    email: input.email ?? "",
    headline: input.profileSummary ?? input.fullName,
    bio: input.rawResumeText ?? input.profileSummary,
    location: input.location ?? "Unknown",
    skills: (input.skills ?? []).map((skill) => ({
      name: skill,
      level: "Intermediate",
      yearsOfExperience: input.yearsExperience ?? 0,
    })),
    experience: (input.workHistory ?? []).map((entry) => ({
      company: "Not specified",
      role: "Not specified",
      startDate: "",
      endDate: "",
      description: entry,
      technologies: [],
      isCurrent: false,
    })),
    education: input.educationLevel
      ? [{
          institution: "Not specified",
          degree: input.educationLevel,
          fieldOfStudy: "",
          startYear: 0,
          endYear: 0,
        }]
      : [],
    projects: [],
    availability: {
      status: "Available",
      type: "Full-time",
    },
    source: input.source,
    id: input.id,
    phone: input.phone,
    ipAddress: input.ipAddress,
  };
}

export function getTalentProfileFullName(profile: TalentProfile): string {
  return `${profile.firstName} ${profile.lastName}`.trim();
}

export type UserRole = "applicant" | "recruiter";

export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface PublicUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export type JobStatus = "draft" | "published" | "closed";

export interface Job {
  id: string;
  recruiterId: string;
  title: string;
  summary: string;
  requiredSkills: string[];
  preferredSkills: string[];
  minimumYearsExperience: number;
  educationLevel?: string;
  location?: string;
  dealbreakers?: string[];
  screeningWeights: ScoreWeights;
  proofHire: ProofHireConfig;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobInput {
  title: string;
  summary: string;
  requiredSkills: string[];
  preferredSkills?: string[];
  minimumYearsExperience?: number;
  educationLevel?: string;
  location?: string;
  dealbreakers?: string[];
  proofHire?: ProofHireConfig;
  screeningWeights?: ScoreWeights;
  status?: "draft" | "published";
}

export type ApplicationStatus = "submitted" | "under_review" | "shortlisted" | "rejected" | "accepted";

export interface Application {
  id: string;
  jobId: string;
  applicantId: string;
  profile: TalentProfile;
  status: ApplicationStatus;
  screeningResult?: ScreeningResult;
  proofHireStatus: ProofApplicantStatus;
  proofSubmissionId?: string;
  proofScore?: number;
  proofCompletedAt?: string;
  appliedAt: string;
  updatedAt: string;
  createdAt: string;
  isRead?: boolean;
}

export interface CreateApplicationInput {
  jobId: string;
  profile: TalentProfile;
}

export interface AuthInput {
  email: string;
  password: string;
}

export interface RegisterInput extends AuthInput {
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface AuthResponse {
  user: PublicUser;
  token: string;
}

export interface ProofJobQuestion {
  challengeId: string;
  title: string;
  type: ProofChallengeType;
  hintCount: number;
  referenceCount: number;
  applicantPosition?: string;
  submissionCount: number;
}

export interface ProofJobPreviousQuestions {
  jobId: string;
  roleTitle: string;
  questions: ProofJobQuestion[];
  totalChallenges: number;
}

export interface ProofAnalytics {
  jobId: string;
  challengeId: string;
  viewedCount: number;
  hintAccessCount: number;
  submissionCount: number;
  averageScore: number;
}

export type InterviewType = 'video' | 'phone' | 'onsite';
export type InterviewStatus = 'scheduled' | 'completed' | 'cancelled';

export interface Interview {
  id: string;
  applicationId: string;
  jobId: string;
  candidateId: string;
  recruiterId: string;
  scheduledAt: string;
  duration: number;
  type: InterviewType;
  meetingLink?: string;
  notes?: string;
  status: InterviewStatus;
  createdAt: string;
  updatedAt: string;
}

export type TrainingLevel = "beginner" | "intermediate" | "advanced";
export type TrainingQuizOption = string;

export interface TrainingQuizQuestion {
  question: string;
  options: TrainingQuizOption[];
  answerIndex: number;
  explanation: string;
}

export interface TrainingUnit {
  id: string;
  title: string;
  minutes: number;
  content: string;
  checklist: string[];
  quiz?: TrainingQuizQuestion;
}

export interface TrainingModule {
  id: string;
  slug: string;
  skill: string;
  title: string;
  subtitle: string;
  description: string;
  level: TrainingLevel;
  estimatedMinutes: number;
  relatedSkills: string[];
  tags: string[];
  units: TrainingUnit[];
  externalResources: ProofReference[];
  createdAt: string;
  updatedAt: string;
}

export interface TrainingProgress {
  id: string;
  applicantId: string;
  moduleId: string;
  completedUnitIds: string[];
  startedAt: string;
  lastActivityAt: string;
  completedAt?: string;
}

export interface TrainingRecommendation {
  skill: string;
  module?: Pick<TrainingModule, "id" | "slug" | "title" | "level" | "estimatedMinutes">;
  jobTitles: string[];
  jobCount: number;
  reason: string;
}

export interface PracticeChallengeLite {
  challengeId: string;
  jobId: string;
  jobTitle: string;
  title: string;
  type: ProofChallengeType;
  requiredSkills: string[];
}

export type MentorTurnRole = "user" | "mentor";

export interface MentorTurn {
  id: string;
  role: MentorTurnRole;
  content: string;
  createdAt: string;
}

export interface MentorQuizState {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  topic: string;
  questionIndex: number;
}

export interface MentorSession {
  id: string;
  applicantId: string;
  skill: string;
  turns: MentorTurn[];
  pendingQuiz: MentorQuizState | null;
  correctCount: number;
  questionIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface MentorChatRequest {
  skill?: string;
  message: string;
  sessionId?: string;
}

export interface MentorChatResponse {
  sessionId: string;
  skill: string;
  reply: string;
  quiz: Pick<MentorQuizState, "question" | "options" | "questionIndex"> | null;
  correctCount: number;
}

export type NotificationType = 'interview_scheduled' | 'status_update' | 'application_received' | 'job_published';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

export type ActivityEvent = 'job_created' | 'job_closed' | 'interview_scheduled' | 'application_submitted' | 'recruiter_registered';

export interface ActivityLog {
  id: string;
  recruiterId: string;
  event: ActivityEvent;
  jobId?: string;
  jobTitle?: string;
  candidateName?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface SystemStats {
  totalApplicants: number;
  totalJobs: number;
  publishedJobs: number;
  closedJobs: number;
  systemUptime: number;
}

export interface SystemHealth {
  api: 'connected' | 'disconnected';
  database: 'connected' | 'disconnected';
  lastBackup?: string;
}
