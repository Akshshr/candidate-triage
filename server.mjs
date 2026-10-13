// Candidate triage: static UI plus a Jev judge endpoint.
// Run: node --env-file=.env server.mjs
import { createServer } from "node:http";
import { readFileSync } from "node:fs";

const PORT = 3400;
const MODEL = "typesafe/jev-router";

const roles = JSON.parse(readFileSync("data/roles.json", "utf8"));
const candidates = JSON.parse(readFileSync("data/candidates.json", "utf8"));

const COMPANY = `AAC Clyde Space is a NewSpace SME (listed in Stockholm) building small satellites, subsystems (power, ADCS, radios, onboard computers), complete missions and Space Data as a Service (Sedna maritime constellation, VIREON-1 Earth observation). Group sites: Glasgow (UK), Uppsala and Gothenburg (Sweden, AAC Omnisys microwave instruments), Delft (Netherlands, AAC Hyperion). Values: Excellence, Innovation, Team, Customer Focus, Integrity. Space experience is not required if skills transfer and the applicant is passionate about space. They hire worldwide and will try to sponsor visas for the right candidate, but some roles have on-site and security check constraints.`;

const INSTRUCTIONS = `You are the hiring manager's screening partner. Interview slots are scarce. In a typical pool for one engineering role, only about 1 in 7 applicants earns "meet", about 1 in 4 is "consider", and most are "reject". Apply the bar below literally.

"meet" only if ALL of these hold:
- Every required skill for the role is evidenced by concrete work (projects, tools, results), not just listed.
- Years and seniority match the role's level.
- Nothing conflicts with the role: work mode, location, notice and salary fit.
- The application is careful: addressed to this company and role, consistent dates, no contradictions.

"consider" if the applicant is credible and most required skills are evidenced, but there is one material gap or open question: one required skill missing or thin, seniority above or below the level, a career break, salary well above the level, a work-mode conflict, or evidence that is mostly academic or from short contracts.

"reject" if ANY of these hold: two or more required skills missing or unevidenced; wrong discipline or level; generic or buzzword text without specifics; addressed to another company or role; typos, contradictions or inconsistent dates; an unrelated background.

When torn between two decisions, choose the lower one. The score must match the decision: meet 80-100, consider 55-79, reject 0-54.
Judge only on evidence in the application against the role. Do not reward polish over substance. Ignore name, gender, age and nationality. Visa sponsorship is not a gap on its own.
Return JSON only: {"decision": "meet"|"consider"|"reject", "score": 0-100, "headline": "one sentence under 20 words", "strengths": [up to 3 short strings], "concerns": [up to 3 short strings]}. Never use the em dash character.`;

// Jev's routed model occasionally answers in prose instead of JSON; one retry covers it.
async function judge(candidate) {
  try {
    return await judgeOnce(candidate);
  } catch (err) {
    console.error(`${candidate.id}: ${err.message}, retrying`);
    return judgeOnce(candidate);
  }
}

async function judgeOnce(candidate) {
  const role = roles.find((r) => r.id === candidate.roleId);
  const { id, roleId, ...application } = candidate;
  const started = Date.now();
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: `${INSTRUCTIONS}\n\nCompany: ${COMPANY}` },
        { role: "user", content: `ROLE\n${JSON.stringify(role)}\n\nAPPLICATION\n${JSON.stringify(application)}` },
      ],
      response_format: { type: "json_object" },
      max_tokens: 4000,
    }),
  });
  const body = await res.json();
  if (!body.choices) throw new Error(body.error?.message ?? `OpenRouter ${res.status}`);
  const json = body.choices[0].message.content.match(/\{[\s\S]*\}/);
  if (!json) throw new Error(`no JSON in reply: ${body.choices[0].message.content.slice(0, 60)}`);
  const verdict = JSON.parse(json[0]);
  if (!["meet", "consider", "reject"].includes(verdict.decision)) throw new Error(`bad decision: ${verdict.decision}`);
  return { ...verdict, model: body.model, ms: Date.now() - started, cost: body.usage?.cost ?? 0 };
}

function send(res, status, data, type = "application/json") {
  res.writeHead(status, { "Content-Type": type });
  res.end(type === "application/json" ? JSON.stringify(data) : data);
}

const STATIC = { "/": ["index.html", "text/html"], "/app.js": ["app.js", "text/javascript"], "/styles.css": ["styles.css", "text/css"] };

createServer(async (req, res) => {
  try {
    if (req.method === "GET" && STATIC[req.url]) {
      const [file, type] = STATIC[req.url];
      return send(res, 200, readFileSync(`public/${file}`), type);
    }
    if (req.method === "GET" && req.url === "/api/data") return send(res, 200, { roles, candidates });
    if (req.method === "POST" && req.url.startsWith("/api/judge/")) {
      const candidate = candidates.find((c) => c.id === req.url.slice("/api/judge/".length));
      if (!candidate) return send(res, 404, { error: "unknown candidate" });
      return send(res, 200, await judge(candidate));
    }
    send(res, 404, { error: "not found" });
  } catch (err) {
    console.error(`${req.url}: ${err.message}`);
    send(res, 502, { error: err.message });
  }
}).listen(PORT, () => console.log(`candidate-triage on http://localhost:${PORT}`));
