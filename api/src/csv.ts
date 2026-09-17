import type {
  ApplicantData,
  ApplicantInput,
  ApplicantSource,
  Availability,
  Certification,
  Education,
  Language,
  Project,
  Skill,
  SocialLinks,
  TalentProfile,
  WorkExperience,
} from "../../packages/shared/src/index.js";

export function parseApplicantsCsv(csvText: string): ApplicantData[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = splitCsvLine(lines[0]).map((value) => value.trim());
  const structuredHeaders = new Set([
    "firstName",
    "lastName",
    "headline",
    "bio",
    "languages",
    "experience",
    "education",
    "certifications",
    "projects",
    "availability",
    "socialLinks",
  ]);
  const useStructuredShape = headers.some((header) => structuredHeaders.has(header));

  return lines.slice(1).map((line, index) => {
    const values = splitCsvLine(line);
    const row = Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ""]));

    if (useStructuredShape) {
      return parseTalentProfileRow(row, index);
    }

    return {
      id: row.id || `csv-${index + 1}`,
      fullName: row.fullName || row.name || `Applicant ${index + 1}`,
      source: "spreadsheet_row",
      skills: splitList(row.skills),
      yearsExperience: parseOptionalNumber(row.yearsExperience),
      educationLevel: row.educationLevel || undefined,
      location: row.location || undefined,
      email: row.email || undefined,
      phone: row.phone || undefined,
      rawResumeText: row.rawResumeText || undefined,
      profileSummary: row.profileSummary || undefined,
      workHistory: splitList(row.workHistory),
    } satisfies ApplicantInput;
  });
}

function parseTalentProfileRow(
  row: Record<string, string>,
  index: number,
): TalentProfile {
  return {
    id: row.id || `profile-${index + 1}`,
    source: parseSource(row.source),
    firstName: row.firstName || row.fullName?.split(/\s+/)[0] || `Applicant${index + 1}`,
    lastName:
      row.lastName ||
      row.fullName?.split(/\s+/).slice(1).join(" ") ||
      "",
    email: row.email || "",
    headline: row.headline || row.profileSummary || row.fullName || `Candidate ${index + 1}`,
    bio: row.bio || row.rawResumeText || undefined,
    location: row.location || "Unknown",
    phone: row.phone || undefined,
    ipAddress: row.ipAddress || undefined,
    skills: parseJsonColumn<Skill[]>(row.skills, "skills", index) ?? [],
    languages: parseJsonColumn<Language[]>(row.languages, "languages", index),
    experience: parseJsonColumn<WorkExperience[]>(row.experience, "experience", index) ?? [],
    education: parseJsonColumn<Education[]>(row.education, "education", index) ?? [],
    certifications: parseJsonColumn<Certification[]>(row.certifications, "certifications", index),
    projects: parseJsonColumn<Project[]>(row.projects, "projects", index) ?? [],
    availability:
      parseJsonColumn<Availability>(row.availability, "availability", index) ??
      { status: "Available", type: "Full-time" },
    socialLinks: parseJsonColumn<SocialLinks>(row.socialLinks, "socialLinks", index),
  };
}

function splitList(value: string | undefined): string[] | undefined {
  if (!value) {
    return undefined;
  }
  const items = value
    .split(/[|,]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseJsonColumn<T>(
  value: string | undefined,
  column: string,
  index: number,
): T | undefined {
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Invalid JSON";
    throw new Error(
      `Invalid JSON in CSV column "${column}" on row ${index + 2}. Example format: [{"name":"Node.js","level":"Expert","yearsOfExperience":4}] (${detail})`,
    );
  }
}

function parseSource(value: string | undefined): ApplicantSource {
  if (value === "umurava_profile" || value === "resume_upload" || value === "spreadsheet_row") {
    return value;
  }
  return "spreadsheet_row";
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === "\"") {
      const next = line[i + 1];
      if (inQuotes && next === "\"") {
        current += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  values.push(current);
  return values;
}
