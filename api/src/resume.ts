import pdf from "pdf-parse";
import type { TalentProfile } from "../../packages/shared/src/index.js";

export async function parseResumeUpload(input: {
  mimeType: string;
  base64: string;
}): Promise<Omit<TalentProfile, "source">> {
  const buffer = Buffer.from(input.base64, "base64");
  let resumeText: string;

  if (input.mimeType === "application/pdf") {
    const parsed = await pdf(buffer);
    resumeText = parsed.text.trim();
  } else if (input.mimeType === "text/plain") {
    resumeText = buffer.toString("utf8");
  } else {
    throw new Error(`Unsupported resume mime type: ${input.mimeType}`);
  }

  return await parseWithLocalParser(resumeText);
}

async function parseWithLocalParser(
  resumeText: string
): Promise<Omit<TalentProfile, "source">> {
  console.log("[resume] 📤 Calling Qwen parser via subprocess...");
  console.log("[resume] 📝 Resume text length:", resumeText.length, "chars");

  const { spawn } = await import("child_process");
  const path = await import("path");
  const fs = await import("fs");

  let parserPath = "";
  const possiblePaths = [
    process.env.PARSER_DIR,
    path.resolve(process.cwd(), "parser-llm"),
    path.resolve(process.cwd(), "../parser-llm"),
    path.resolve(import.meta.dirname, "../../parser-llm"),
  ].filter((p): p is string => Boolean(p));

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      parserPath = p;
      break;
    }
  }

  if (!parserPath) {
    throw new Error("Could not locate parser-llm directory");
  }

  const pythonBin = path.resolve(parserPath, "venv/bin/python");

  return new Promise((resolve, reject) => {
    const python = spawn(pythonBin, [
      "-c",
      `
import sys
import json
sys.path.insert(0, ${JSON.stringify(parserPath)})
from parser.qwen_parser import get_parser

text = ${JSON.stringify(resumeText)}

try:
    parser = get_parser()
    profile = parser.parse(text)
    print(json.dumps(profile))
except Exception as e:
    import traceback
    print(json.dumps({"error": str(e), "traceback": traceback.format_exc()}), file=sys.stderr)
    sys.exit(1)
`,
    ], { cwd: parserPath });

    let output = "";
    let error = "";

    python.stdout.on("data", (data) => {
      output += data.toString();
    });

    python.stderr.on("data", (data) => {
      error += data.toString();
    });

    python.on("close", (code) => {
      if (code !== 0) {
        console.error("[resume] ❌ Python error:", error);
        reject(new Error(`Python parser failed: ${error}`));
      } else {
        try {
          const profile = JSON.parse(output);
          resolve(mapLocalParserResultToTalentProfile(profile));
        } catch (e) {
          console.error("[resume] ❌ Parse error:", e, "Output:", output);
          reject(new Error(`Failed to parse JSON: ${output}`));
        }
      }
    });
  });
}

function mapLocalParserResultToTalentProfile(
  profile: Record<string, unknown>
): Omit<TalentProfile, "source"> {
  const data = profile as Record<string, any>;
  return {
    id: data.id || crypto.randomUUID(),
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    email: data.email || "",
    phone: data.phone || "",
    headline: data.headline || "",
    bio: data.bio || "",
    location: data.location || "",
    skills:
      data.skills?.map((s: { name: string; level?: string; yearsOfExperience?: number }) => ({
        name: s.name,
        level: s.level || "Intermediate",
        yearsOfExperience: s.yearsOfExperience || 0,
      })) || [],
    languages:
      data.languages?.map((l: { name: string; proficiency?: string }) => ({
        name: l.name,
        proficiency: l.proficiency || "Fluent",
      })) || [],
    experience:
      data.experience?.map((e: {
        company: string;
        role: string;
        startDate?: string;
        endDate?: string;
        description?: string;
        technologies?: string[];
        isCurrent?: boolean;
      }) => ({
        company: e.company,
        role: e.role,
        startDate: e.startDate,
        endDate: e.endDate,
        description: e.description,
        technologies: e.technologies || [],
        isCurrent: e.isCurrent || e.endDate?.toLowerCase() === "present",
      })) || [],
    education:
      data.education?.map((ed: {
        institution: string;
        degree: string;
        fieldOfStudy?: string;
        startYear?: number;
        endYear?: number;
      }) => ({
        institution: ed.institution,
        degree: ed.degree,
        fieldOfStudy: ed.fieldOfStudy || "",
        startYear: ed.startYear,
        endYear: ed.endYear,
      })) || [],
    certifications:
      data.certifications?.map((c: { name: string; issuer?: string; issueDate?: string }) => ({
        name: c.name,
        issuer: c.issuer || "",
        issueDate: c.issueDate,
      })) || [],
    projects:
      data.projects?.map((p: {
        name: string;
        description?: string;
        technologies?: string[];
        role?: string;
        link?: string;
        startDate?: string;
        endDate?: string;
      }) => ({
        name: p.name,
        description: p.description || "",
        technologies: p.technologies || [],
        role: p.role || "",
        link: p.link,
        startDate: p.startDate,
        endDate: p.endDate,
      })) || [],
    availability: data.availability || {
      status: "Available",
      type: "Full-time",
      startDate: new Date().toISOString().split("T")[0],
    },
  };
}