// Generates 20 synthetic applicants per role (200 total) via OpenRouter.
// Run: node --env-file=.env scripts/generate.mjs
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";

const MODEL = "anthropic/claude-sonnet-5.5";
const roles = JSON.parse(readFileSync("data/roles.json", "utf8"));

// The applicant mix a NewSpace SME typically sees for one engineering posting.
// `expected` is our intended outcome; it is kept out of the judge's input.
const ARCHETYPES = [
  ["Strong fit: 4-8 years at a NewSpace or small-satellite company doing almost exactly this job, lives near the role location, right to work.", "meet"],
  ["Strong fit from an adjacent high-reliability sector (defence, avionics, automotive functional safety, medical devices), covers every required skill, no space experience, local.", "meet"],
  ["Strong technical fit with direct space experience, currently abroad and needs visa sponsorship, says so plainly.", "meet"],
  ["Senior engineer from a large prime (Airbus, Thales Alenia, OHB, SSTL, Saab) with deep relevant experience, used to bigger processes, keen on faster SME pace.", "meet"],
  ["Solid mid-level engineer who meets most required skills but is clearly missing one or two of them, honest about it.", "consider"],
  ["Recent graduate (1-2 years) from a nearby university with a CubeSat or student rocketry project relevant to the role, enthusiastic, light industry experience.", "consider"],
  ["Career switcher from oil and gas, energy or rail with transferable hands-on skills, partial match, motivated by space.", "consider"],
  ["Well-matched skills but the cover letter asks for fully remote work, which conflicts with the role's work mode.", "consider"],
  ["Returner after a 2-3 year career break with strong relevant experience before it.", "consider"],
  ["Academic: PhD or postdoc whose research is relevant to the role, little industry delivery experience.", "consider"],
  ["Overqualified: 20+ years, previously head of department, salary expectation well above the band for this level.", "consider"],
  ["Contractor with many 6-12 month stints, relevant tools, unclear depth or ownership.", "consider"],
  ["Fresh international MSc graduate in aerospace with a generic CV, no projects matching the role, needs sponsorship.", "reject"],
  ["Adjacent discipline mismatch: an engineer from a neighbouring but wrong discipline (for example web developer for embedded, mechanical for electronics) who believes skills will transfer.", "reject"],
  ["Generic AI-written application: buzzwords, vague claims, no concrete projects, numbers or tools.", "reject"],
  ["Mass applicant: the cover letter names a different company or a different job title by mistake.", "reject"],
  ["Technician-level applicant (HNC/apprenticeship, hands-on lab or production work) applying for an engineer role that needs more design depth.", "reject"],
  ["Unrelated background (sales, finance, retail, hospitality) who is passionate about space and did an online course.", "reject"],
  ["Decent experience but in an unrelated engineering domain (for example HVAC, civil, process engineering) with little overlap.", "reject"],
  ["Strong on paper but the application is sloppy: typos, inconsistent dates, a CV that contradicts the cover letter.", "reject"],
];

const SCHEMA = `{
  "name": string, "email": string (use @example.com), "location": string (city, country),
  "rightToWork": string, "noticePeriod": string, "workPreference": "On site" | "Hybrid" | "Remote",
  "salaryExpectation": string (local currency for the role location),
  "currentTitle": string, "currentEmployer": string, "yearsExperience": number,
  "education": [{ "degree": string, "institution": string, "year": number }],
  "skills": [string] (6-12 items),
  "experience": [{ "title": string, "employer": string, "start": "YYYY-MM", "end": "YYYY-MM" | "Present", "highlights": [string] (2-3) }] (1-4 entries, most recent first),
  "coverLetter": string (110-220 words, in the applicant's own voice)
}`;

function prompt(role, slots) {
  return `You are creating realistic synthetic job applications for a recruiting tool demo.

Company: AAC Clyde Space group (small satellites, subsystems, missions and Space Data as a Service; sites in Glasgow, Uppsala, Gothenburg, Delft).
Role: ${JSON.stringify(role, null, 2)}

Write one application per profile below, in the same order:
${slots.map((s, i) => `${i + 1}. ${s[0]}`).join("\n")}

Rules:
- The profile shapes the application, but never state the profile or how well the applicant fits. Fit must show only through the content, as in real applications.
- Vary nationalities, genders, ages and writing styles. Names are invented; never use real, identifiable people. Real employers and universities are fine.
- Dates must be consistent and end no later than 2026-10. Today is 2026-10-08.
- Use British English. Never use the em dash character.
- Return only JSON: {"applicants": [ ...${slots.length} objects... ]} where each object is:
${SCHEMA}`;
}

async function call(role, slots) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt(role, slots) }],
        response_format: { type: "json_object" },
        max_tokens: 16000,
      }),
    });
    const body = await res.json();
    try {
      const text = body.choices[0].message.content.replace(/^```(json)?|```$/g, "").trim();
      const list = JSON.parse(text).applicants;
      if (list.length !== slots.length) throw new Error(`got ${list.length}`);
      return list;
    } catch (err) {
      if (attempt >= 3) throw new Error(`${role.id}: ${err.message} ${JSON.stringify(body.error ?? "")}`);
    }
  }
}

// Each batch is cached in data/.gen so a failed run only redoes what is missing.
const BATCH = 5;
mkdirSync("data/.gen", { recursive: true });
const jobs = roles.flatMap((role) => [0, 5, 10, 15].map((from) => ({ role, from })));
const results = await Promise.all(
  jobs.map(async ({ role, from }) => {
    const cache = `data/.gen/${role.id}-${from}.json`;
    if (!existsSync(cache)) {
      writeFileSync(cache, JSON.stringify(await call(role, ARCHETYPES.slice(from, from + BATCH))));
      console.log(`done ${role.id} ${from}`);
    }
    return JSON.parse(readFileSync(cache, "utf8")).map((a, i) => ({ roleId: role.id, n: from + i, a }));
  }),
);

const candidates = [];
const archetypes = {};
for (const { roleId, n, a } of results.flat()) {
  const id = `${roleId}-${String(n + 1).padStart(2, "0")}`;
  candidates.push({ id, roleId, ...a });
  archetypes[id] = { archetype: ARCHETYPES[n][0], expected: ARCHETYPES[n][1] };
}
// Seeded shuffle so the list isn't grouped by role or archetype, and stays stable across rebuilds.
let seed = 42;
const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
for (let i = candidates.length - 1; i > 0; i--) {
  const j = Math.floor(random() * (i + 1));
  [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
}

writeFileSync("data/candidates.json", JSON.stringify(candidates, null, 2));
writeFileSync("data/archetypes.json", JSON.stringify(archetypes, null, 2));
console.log(`wrote ${candidates.length} candidates`);
