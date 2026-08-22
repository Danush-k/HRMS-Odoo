export type ParsedResumeData = {
  about: string;
  loveAboutJob: string;
  interests: string;
  skills: string;
  certifications: string;
};

/**
 * Extracts plain text from raw buffer based on file extension and mime type.
 */
export async function extractTextFromBuffer(buffer: Buffer, fileName: string): Promise<string> {
  const ext = fileName.toLowerCase().split(".").pop() || "";

  if (ext === "pdf") {
    try {
      const { extractText } = await import("unpdf");
      const uint8 = new Uint8Array(buffer);
      const result = await extractText(uint8);
      const text = Array.isArray(result.text) ? result.text.join("\n\n") : result.text;
      if (text && text.trim().length > 0) {
        return text;
      }
    } catch (err) {
      console.error("PDF parse error with unpdf:", err);
    }
  }

  // Fallback / Text / Markdown / RTF / DOC
  const raw = buffer.toString("utf-8");
  // Clean raw control chars and PDF dictionary objects if text was encoded in postscript/raw format
  const sanitized = raw
    .replace(/<<[\s\S]*?>>/g, "")
    .replace(/\b\d+\s+\d+\s+obj\b/g, "")
    .replace(/\bendobj\b/g, "")
    .replace(/\bstream[\s\S]*?endstream\b/g, "")
    .replace(/\b(xref|trailer|startxref)\b[\s\S]*/g, "")
    .replace(/[^\x20-\x7E\n\r\t]/g, " ");

  return sanitized;
}

/**
 * Parses sections from the extracted resume text into structured profile fields.
 */
export function parseResumeText(rawText: string): ParsedResumeData {
  const text = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rawLines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  // Filter out any stray PDF control/meta lines (e.g. /Author, /CreationDate, obj)
  const lines = rawLines.filter(
    (l) =>
      !/^\/?(Author|Comments|Company|CreationDate|Creator|Keywords|ModDate|Producer|SourceModified|Subject|Title|Trapped|Root|Pages|Count|MediaBox|Font|Type|Subtype)\b/i.test(l) &&
      !/^\d+\s+\d+\s+obj/i.test(l) &&
      !/^endobj/i.test(l) &&
      !/^<<.*>>$/i.test(l)
  );

  const sections: { title: string; lines: string[] }[] = [];
  let currentTitle = "HEADER";
  let currentLines: string[] = [];

  // Common section header patterns
  const headerPatterns: { key: string; regex: RegExp }[] = [
    { key: "SUMMARY", regex: /^(professional\s+summary|executive\s+summary|summary|profile|about\s+me|about|biography|objective|career\s+objective)/i },
    { key: "SKILLS", regex: /^(technical\s+skills|core\s+skills|skills\s*&\s*abilities|skills\s*&\s*competencies|skills|technologies|core\s+competencies|expertise|tools\s*&\s*technologies)/i },
    { key: "EXPERIENCE", regex: /^(work\s+experience|professional\s+experience|employment\s+history|experience|career\s+history)/i },
    { key: "EDUCATION", regex: /^(education|academic\s+background|academic\s+qualifications|academics)/i },
    { key: "CERTIFICATIONS", regex: /^(certifications|licenses\s*&\s*certifications|certifications\s*&\s*courses|certificates|credentials|licenses)/i },
    { key: "PROJECTS", regex: /^(key\s+projects|projects|personal\s+projects)/i },
    { key: "INTERESTS", regex: /^(interests\s*&\s*hobbies|interests|hobbies|activities|extracurricular\s+activities|personal\s+interests)/i },
    { key: "PASSION", regex: /^(what\s+i\s+love\s+about\s+my\s+job|passion|motivation|career\s+goals|philosophy)/i },
  ];

  for (const line of lines) {
    // Check if line looks like a section header (short line, matches keywords)
    const cleanedLine = line.replace(/^[-*•#\d.\s]+/, "").trim();
    if (cleanedLine.length > 0 && cleanedLine.length < 45) {
      const match = headerPatterns.find((pattern) => pattern.regex.test(cleanedLine));
      if (match) {
        if (currentLines.length > 0) {
          sections.push({ title: currentTitle, lines: currentLines });
        }
        currentTitle = match.key;
        currentLines = [];
        continue;
      }
    }
    currentLines.push(line);
  }

  if (currentLines.length > 0) {
    sections.push({ title: currentTitle, lines: currentLines });
  }

  const getSectionLines = (key: string): string[] => {
    const sec = sections.find((s) => s.title === key);
    return sec ? sec.lines : [];
  };

  // 1. About / Summary
  let aboutLines = getSectionLines("SUMMARY");
  if (aboutLines.length === 0) {
    // If no explicit summary header, check top header lines excluding names/contact
    const headerLines = getSectionLines("HEADER");
    if (headerLines.length > 2) {
      aboutLines = headerLines.filter((l) => l.length > 30 && !/@|github\.com|linkedin\.com|\+\d{2}/i.test(l)).slice(0, 4);
    }
  }
  const about = aboutLines.join(" ").replace(/\s+/g, " ").trim();

  // 2. What I love about my job
  let loveLines = getSectionLines("PASSION");
  let loveAboutJob = loveLines.join(" ").replace(/\s+/g, " ").trim();
  if (!loveAboutJob && aboutLines.length > 0) {
    const passionMatch = aboutLines.find((l) => /passionate|love|driven|enthusiastic|dedicated to|enjoy/i.test(l));
    if (passionMatch) {
      loveAboutJob = passionMatch.replace(/^[-*•\s]+/, "").trim();
    }
  }

  // 3. Interests and hobbies
  const interestsLines = getSectionLines("INTERESTS");
  const interests = interestsLines
    .map((l) => l.replace(/^[-*•\s]+/, "").trim())
    .filter(Boolean)
    .join(", ");

  // 4. Skills (formatted cleanly, one per line or parsed from comma lists)
  const skillsLines = getSectionLines("SKILLS");
  const skillItems: string[] = [];
  for (const line of skillsLines) {
    const cleaned = line.replace(/^[-*•\s]+/, "").replace(/^[a-zA-Z\s]+:\s*/, "");
    const tokens = cleaned.split(/[,|•·;]|\s{3,}/).map((s) => s.trim()).filter((s) => s.length > 1 && s.length < 40);
    if (tokens.length > 1) {
      skillItems.push(...tokens);
    } else if (cleaned.length > 1 && cleaned.length < 50) {
      skillItems.push(cleaned);
    }
  }
  const uniqueSkills = Array.from(new Set(skillItems)).slice(0, 20);
  const skills = uniqueSkills.join("\n");

  // 5. Certifications
  const certLines = getSectionLines("CERTIFICATIONS");
  const certItems = certLines
    .map((l) => l.replace(/^[-*•\s]+/, "").trim())
    .filter((l) => l.length > 2 && l.length < 120);
  const certifications = Array.from(new Set(certItems)).slice(0, 10).join("\n");

  return {
    about: about.slice(0, 800),
    loveAboutJob: loveAboutJob.slice(0, 400),
    interests: interests.slice(0, 400),
    skills: skills.slice(0, 1000),
    certifications: certifications.slice(0, 800),
  };
}
