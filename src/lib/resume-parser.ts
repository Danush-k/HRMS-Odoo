export type ParsedResumeData = {
  about: string;
  loveAboutJob: string;
  interests: string;
  skills: string;
  certifications: string;
};

// Comprehensive canonical skill dictionary with proper casing
const CANONICAL_SKILLS_MAP: Record<string, string> = {
  // Languages
  python: "Python",
  javascript: "JavaScript",
  js: "JavaScript",
  typescript: "TypeScript",
  ts: "TypeScript",
  java: "Java",
  "c++": "C++",
  cpp: "C++",
  "c#": "C#",
  csharp: "C#",
  "c programming": "C",
  "c language": "C",
  golang: "Go",
  "go language": "Go",
  "go programming": "Go",
  rust: "Rust",
  php: "PHP",
  ruby: "Ruby",
  swift: "Swift",
  kotlin: "Kotlin",
  dart: "Dart",
  scala: "Scala",
  "r programming": "R",
  "r language": "R",
  "r studio": "R",
  sql: "SQL",
  plsql: "PL/SQL",
  "pl/sql": "PL/SQL",
  html: "HTML5",
  html5: "HTML5",
  css: "CSS3",
  css3: "CSS3",
  sass: "Sass",
  scss: "SCSS",
  bash: "Bash",
  shell: "Shell Scripting",
  powershell: "PowerShell",

  // Frontend
  react: "React",
  reactjs: "React",
  "react.js": "React",
  nextjs: "Next.js",
  "next.js": "Next.js",
  vue: "Vue.js",
  vuejs: "Vue.js",
  "vue.js": "Vue.js",
  nuxt: "Nuxt.js",
  nuxtjs: "Nuxt.js",
  "nuxt.js": "Nuxt.js",
  angular: "Angular",
  angularjs: "AngularJS",
  svelte: "Svelte",
  sveltekit: "SvelteKit",
  redux: "Redux",
  zustand: "Zustand",
  tailwind: "Tailwind CSS",
  tailwindcss: "Tailwind CSS",
  "tailwind css": "Tailwind CSS",
  bootstrap: "Bootstrap",
  "material ui": "Material UI",
  mui: "Material UI",
  "chakra ui": "Chakra UI",
  vite: "Vite",
  webpack: "Webpack",
  jquery: "jQuery",

  // Backend & APIs
  nodejs: "Node.js",
  "node.js": "Node.js",
  node: "Node.js",
  express: "Express.js",
  expressjs: "Express.js",
  "express.js": "Express.js",
  nestjs: "NestJS",
  "nest.js": "NestJS",
  fastify: "Fastify",
  django: "Django",
  flask: "Flask",
  fastapi: "FastAPI",
  "spring boot": "Spring Boot",
  springboot: "Spring Boot",
  spring: "Spring Framework",
  laravel: "Laravel",
  "ruby on rails": "Ruby on Rails",
  rails: "Ruby on Rails",
  aspnet: "ASP.NET Core",
  "asp.net": "ASP.NET Core",
  ".net": ".NET Core",
  graphql: "GraphQL",
  "rest api": "REST APIs",
  "rest apis": "REST APIs",
  "restful api": "REST APIs",
  "restful apis": "REST APIs",
  grpc: "gRPC",
  websockets: "WebSockets",
  socketio: "Socket.io",
  "socket.io": "Socket.io",
  microservices: "Microservices",

  // Databases & ORMs
  postgresql: "PostgreSQL",
  postgres: "PostgreSQL",
  mysql: "MySQL",
  sqlite: "SQLite",
  mongodb: "MongoDB",
  mongo: "MongoDB",
  redis: "Redis",
  prisma: "Prisma ORM",
  drizzle: "Drizzle ORM",
  typeorm: "TypeORM",
  mongoose: "Mongoose",
  sqlalchemy: "SQLAlchemy",
  cassandra: "Cassandra",
  dynamodb: "DynamoDB",
  oracle: "Oracle Database",
  supabase: "Supabase",
  firebase: "Firebase",

  // Cloud & DevOps
  aws: "AWS (Amazon Web Services)",
  "amazon web services": "AWS",
  azure: "Microsoft Azure",
  gcp: "Google Cloud (GCP)",
  "google cloud": "Google Cloud (GCP)",
  docker: "Docker",
  kubernetes: "Kubernetes",
  k8s: "Kubernetes",
  terraform: "Terraform",
  ansible: "Ansible",
  jenkins: "Jenkins",
  "github actions": "GitHub Actions",
  "gitlab ci": "GitLab CI/CD",
  "ci/cd": "CI/CD",
  cicd: "CI/CD",
  linux: "Linux",
  ubuntu: "Ubuntu",
  nginx: "Nginx",
  apache: "Apache",
  vercel: "Vercel",
  netlify: "Netlify",
  cloudflare: "Cloudflare",

  // ERP & Enterprise
  odoo: "Odoo ERP",
  "odoo erp": "Odoo ERP",
  sap: "SAP",
  salesforce: "Salesforce",
  erpnext: "ERPNext",
  zoho: "Zoho CRM",

  // Tools & Testing
  git: "Git",
  github: "GitHub",
  gitlab: "GitLab",
  bitbucket: "Bitbucket",
  "vs code": "VS Code",
  vscode: "VS Code",
  postman: "Postman",
  swagger: "Swagger / OpenAPI",
  jira: "Jira",
  confluence: "Confluence",
  trello: "Trello",
  figma: "Figma",
  jest: "Jest",
  vitest: "Vitest",
  cypress: "Cypress",
  playwright: "Playwright",
  selenium: "Selenium",
  pytest: "PyTest",

  // Concepts & Methodologies
  agile: "Agile Methodology",
  scrum: "Scrum",
  kanban: "Kanban",
  tdd: "Test-Driven Development (TDD)",
  oop: "Object-Oriented Programming (OOP)",
  "data structures": "Data Structures & Algorithms",
  algorithms: "Algorithms",
  "system design": "System Design",
  "clean architecture": "Clean Architecture",
  "machine learning": "Machine Learning",
  "deep learning": "Deep Learning",
  "artificial intelligence": "Artificial Intelligence",
  "ai/ml": "AI/ML",
  "generative ai": "Generative AI",
  nlp: "Natural Language Processing (NLP)",
  opencv: "OpenCV",
  pandas: "Pandas",
  numpy: "NumPy",
  scikit: "Scikit-Learn",
  tensorflow: "TensorFlow",
  pytorch: "PyTorch",
};

/**
 * Extracts plain text from raw buffer based on file extension and mime type.
 */
export async function extractTextFromBuffer(buffer: Buffer, fileName: string): Promise<string> {
  const ext = fileName.toLowerCase().split(".").pop() || "";

  if (ext === "pdf") {
    // 1. Try unpdf
    try {
      const { extractText } = await import("unpdf");
      const uint8 = new Uint8Array(buffer);
      const result = await extractText(uint8);
      const text = Array.isArray(result.text) ? result.text.join("\n\n") : result.text;
      if (text && text.trim().length > 10) {
        return text;
      }
    } catch (err) {
      console.warn("unpdf extraction notice:", err);
    }

    // 2. Fallback to pdf-parse
    try {
      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(buffer);
      if (data && data.text && data.text.trim().length > 10) {
        return data.text;
      }
    } catch (err) {
      console.warn("pdf-parse fallback notice:", err);
    }
  }

  // Handle DOCX (extract XML text nodes without zip binary header noise)
  if (ext === "docx" || ext === "doc") {
    const raw = buffer.toString("utf-8");
    const matches = Array.from(raw.matchAll(/<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/g), (m) => m[1]);
    if (matches.length > 0) {
      return matches
        .join(" ")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"');
    }
  }

  // Fallback / Text / Markdown / RTF
  const raw = buffer.toString("utf-8");
  return raw
    .replace(/<<[\s\S]*?>>/g, "")
    .replace(/\b\d+\s+\d+\s+obj\b/g, "")
    .replace(/\bendobj\b/g, "")
    .replace(/\bstream[\s\S]*?endstream\b/g, "")
    .replace(/\b(xref|trailer|startxref)\b[\s\S]*/g, "")
    .replace(/[^\x20-\x7E\n\r\t]/g, " ");
}

/**
 * Normalizes a raw skill string or token into its standard canonical representation.
 */
function normalizeSkillToken(token: string): string | null {
  const cleaned = token
    .replace(/^[-*•·▪▫⁃‣#>\d.\s]+/, "")
    .replace(/[()[\]{}]/g, " ")
    .replace(/[,;.:]+$/, "")
    .trim();

  if (cleaned.length < 2 || cleaned.length > 50) return null;
  if (/^(and|or|the|with|in|of|for|using|etc|to|a|an|experience|knowledge|proficient|familiar)$/i.test(cleaned)) return null;

  const lower = cleaned.toLowerCase();
  if (CANONICAL_SKILLS_MAP[lower]) {
    return CANONICAL_SKILLS_MAP[lower];
  }

  // Preserve good title/acronym casing
  if (/^[A-Z0-9+#.-]+$/.test(cleaned) || /^[A-Z][a-zA-Z0-9+#.-]*$/.test(cleaned)) {
    return cleaned;
  }

  // Capitalize words
  return cleaned
    .split(/\s+/)
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ");
}

/**
 * Parses sections from extracted resume text into structured profile fields.
 */
export function parseResumeText(rawText: string): ParsedResumeData {
  const text = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rawLines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  // Filter out stray PDF control/meta lines
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

  // Expanded section header patterns
  const headerPatterns: { key: string; regex: RegExp }[] = [
    {
      key: "SUMMARY",
      regex: /^(professional\s+summary|executive\s+summary|career\s+summary|summary|profile|about\s+me|about|biography|objective|career\s+objective)\b/i,
    },
    {
      key: "SKILLS",
      regex: /^(technical\s+skills|core\s+skills|key\s+skills|skills\s*(&|\/|\+)\s*(abilities|competencies|technologies|tools|expertise|proficiencies)|skills|technologies|tech\s+stack|core\s+competencies|competencies|areas\s+of\s+expertise|expertise|tools\s*(&|\/|\+)\s*technologies|programming\s+languages|languages\s*(&|\/|\+)\s*frameworks|frameworks\s*(&|\/|\+)\s*libraries|development\s+skills|technical\s+proficiencies|technical\s+expertise|technical\s+knowledge|technical\s+strengths|hard\s+skills|professional\s+skills|skill\s*set)\b/i,
    },
    {
      key: "EXPERIENCE",
      regex: /^(work\s+experience|professional\s+experience|employment\s+history|experience|career\s+history|work\s+history)\b/i,
    },
    {
      key: "EDUCATION",
      regex: /^(education|academic\s+background|academic\s+qualifications|academics|educational\s+qualifications)\b/i,
    },
    {
      key: "CERTIFICATIONS",
      regex: /^(certifications|licenses\s*(&|\/|\+)\s*certifications|certifications\s*(&|\/|\+)\s*courses|certificates|credentials|licenses|courses\s*(&|\/|\+)\s*certifications)\b/i,
    },
    {
      key: "PROJECTS",
      regex: /^(key\s+projects|projects|personal\s+projects|academic\s+projects)\b/i,
    },
    {
      key: "INTERESTS",
      regex: /^(interests\s*(&|\/|\+)\s*hobbies|interests|hobbies|activities|extracurricular\s+activities|personal\s+interests)\b/i,
    },
    {
      key: "PASSION",
      regex: /^(what\s+i\s+love\s+about\s+my\s+job|passion|motivation|career\s+goals|philosophy)\b/i,
    },
  ];

  for (const line of lines) {
    const cleanedLine = line.replace(/^[-*•·▪▫⁃‣#>\d.\s]+/, "").trim();

    // Check if line looks like a section header
    if (cleanedLine.length > 0) {
      // Handle lines like "Technical Skills: Python, React, SQL" or "SKILLS"
      const match = headerPatterns.find((pattern) => pattern.regex.test(cleanedLine));
      if (match) {
        // Ensure this is truly a header (short title, or title followed by colon)
        const headerParts = cleanedLine.split(/:\s*(.*)/s);
        const headerTitlePart = headerParts[0].trim();
        const headerContentPart = (headerParts[1] || "").trim();

        if (headerTitlePart.length < 50) {
          if (currentLines.length > 0) {
            sections.push({ title: currentTitle, lines: currentLines });
          }
          currentTitle = match.key;
          currentLines = [];

          // If header line itself contained inline content (e.g. "Skills: Python, TypeScript, SQL")
          if (headerContentPart.length > 0) {
            currentLines.push(headerContentPart);
          }
          continue;
        }
      }
    }

    currentLines.push(line);
  }

  if (currentLines.length > 0) {
    sections.push({ title: currentTitle, lines: currentLines });
  }

  const getSectionLines = (key: string): string[] => {
    return sections.filter((s) => s.title === key).flatMap((s) => s.lines);
  };

  // 1. About / Summary
  let aboutLines = getSectionLines("SUMMARY");
  if (aboutLines.length === 0) {
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
      loveAboutJob = passionMatch.replace(/^[-*•·▪▫⁃‣\s]+/, "").trim();
    }
  }

  // 3. Interests and hobbies
  const interestsLines = getSectionLines("INTERESTS");
  const interests = interestsLines
    .map((l) => l.replace(/^[-*•·▪▫⁃‣\s]+/, "").trim())
    .filter(Boolean)
    .join(", ");

  // 4. Skills extraction
  const skillItems: string[] = [];
  const skillsLines = getSectionLines("SKILLS");

  // Regex to strip category labels like "Languages:", "Frameworks & Libraries -", "Tools/DevOps:"
  const categoryPrefixRegex = /^(languages|programming\s+languages|frameworks|libraries|frameworks\s*(&|\/|\+)\s*libraries|databases|database|databases\s*(&|\/|\+)\s*cloud|cloud\s*(&|\/|\+)\s*devops|cloud|devops|tools|tools\s*(&|\/|\+)\s*technologies|developer\s+tools|web\s+technologies|technologies|backend|frontend|full\s*stack|platforms|methodologies|core\s+competencies|soft\s+skills|technical\s+skills|skills|other|others)\s*[:\-|–—]\s*/i;

  for (const line of skillsLines) {
    // Strip leading bullets and category labels
    let cleaned = line.replace(/^[-*•·▪▫⁃‣#>\d.\s]+/, "").trim();
    cleaned = cleaned.replace(categoryPrefixRegex, "");

    // Also strip generic "Word:" labels if preceding a colon (e.g. "Databases: PostgreSQL, MySQL")
    cleaned = cleaned.replace(/^[A-Za-z0-9\s&/\\+_\-–—]{1,35}[:\-|–—]\s*/, "");

    // Extract items inside parentheses (e.g. "Python (Django, FastAPI)")
    const parenMatches = Array.from(cleaned.matchAll(/\(([^)]+)\)/g), (m) => m[1]);
    for (const parenContent of parenMatches) {
      const parenTokens = parenContent.split(/[,|•·▪▫⁃‣;/]|\s{2,}/);
      for (const tok of parenTokens) {
        const norm = normalizeSkillToken(tok);
        if (norm) skillItems.push(norm);
      }
    }

    // Strip parentheses content to process base skills
    const baseText = cleaned.replace(/\([^)]*\)/g, " ");

    // Split on commas, pipes, bullets, semicolons, or multi-spaces
    const tokens = baseText
      .split(/[,|•·▪▫⁃‣;]|\s{2,}|\s\/\s/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const tok of tokens) {
      const norm = normalizeSkillToken(tok);
      if (norm) skillItems.push(norm);
    }
  }

  // 5. Full-text Fallback Scan (ONLY when NO skills section was found at all)
  if (skillsLines.length === 0 || skillItems.length === 0) {
    const lowerFullText = text.toLowerCase();
    for (const [skillKey, canonicalName] of Object.entries(CANONICAL_SKILLS_MAP)) {
      // Require multi-character search keys to prevent single-character false positives
      if (skillKey.length < 3 && !/^(js|ts|c\+\+|c#|go)$/i.test(skillKey)) continue;

      const escapedKey = skillKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const wordRegex = new RegExp(`(?:^|[^a-zA-Z0-9_#+-])${escapedKey}(?:$|[^a-zA-Z0-9_#+-])`, "i");

      if (wordRegex.test(lowerFullText)) {
        if (!skillItems.includes(canonicalName)) {
          skillItems.push(canonicalName);
        }
      }
    }
  }

  // Deduplicate skills while preserving order
  const uniqueSkills: string[] = [];
  const seenSkills = new Set<string>();

  for (const item of skillItems) {
    const key = item.toLowerCase();
    if (!seenSkills.has(key)) {
      seenSkills.add(key);
      uniqueSkills.push(item);
    }
  }

  const skills = uniqueSkills.slice(0, 30).join("\n");

  // 6. Certifications
  const certLines = getSectionLines("CERTIFICATIONS");
  const certItems = certLines
    .map((l) => l.replace(/^[-*•·▪▫⁃‣\s]+/, "").trim())
    .filter((l) => l.length > 2 && l.length < 120 && !/^(certifications|licenses)\b/i.test(l));
  const certifications = Array.from(new Set(certItems)).slice(0, 10).join("\n");

  return {
    about: about.slice(0, 800),
    loveAboutJob: loveAboutJob.slice(0, 400),
    interests: interests.slice(0, 400),
    skills: skills.slice(0, 1500),
    certifications: certifications.slice(0, 800),
  };
}

