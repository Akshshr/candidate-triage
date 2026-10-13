const CONCURRENCY = 8;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

let roles = [], candidates = [], results = {};
const judging = new Set();
const failed = new Set();
const roleOf = (c) => roles.find((r) => r.id === c.roleId);

async function load() {
  ({ roles, candidates } = await (await fetch("/api/data")).json());
  $("sub").textContent = `${candidates.length} synthetic applications across ${roles.length} engineering roles`;
  for (const r of roles) $("role").add(new Option(`${r.title} · ${r.location}`, r.id));
  render();
}

function visible() {
  const role = $("role").value;
  return candidates.filter((c) => !role || c.roleId === role);
}

function card(c) {
  const v = results[c.id];
  const cls = ["card", judging.has(c.id) && "judging", failed.has(c.id) && "failed"].filter(Boolean).join(" ");
  return `<button class="${cls}" data-id="${c.id}">
    <div class="name"><span>${esc(c.name)}</span>${v ? `<span class="score">${v.score}</span>` : ""}</div>
    <div class="meta">${esc(c.currentTitle)} · ${esc(c.currentEmployer)}</div>
    ${v ? `<div class="headline">${esc(v.headline)}</div>` : ""}
    <span class="chip">${esc(roleOf(c).title)}</span>
  </button>`;
}

function render() {
  const list = visible();
  const pending = list.filter((c) => !results[c.id]);
  $("pending").innerHTML = pending.map(card).join("");
  $("count-pending").textContent = pending.length;
  for (const d of ["meet", "consider", "reject"]) {
    const items = list.filter((c) => results[c.id]?.decision === d).sort((a, b) => results[b.id].score - results[a.id].score);
    $(d).innerHTML = items.map(card).join("");
    $(`count-${d}`).textContent = items.length;
  }
  const role = roles.find((r) => r.id === $("role").value);
  $("role-info").hidden = !role;
  if (role) {
    $("role-info").innerHTML = `<b>${esc(role.title)}</b> · ${esc(role.entity)} · ${esc(role.workMode)} · ${esc(role.seniority)}. ${esc(role.summary)} ` +
      (role.source === "live" ? `<a href="${role.url}" target="_blank" rel="noopener">Live listing</a>` : `<i>Inferred role.</i>`);
  }
}

async function sortAll() {
  const queue = visible().filter((c) => !results[c.id]);
  if (!queue.length) return;
  $("sort").disabled = $("reset").disabled = true;
  failed.clear();
  let done = 0;
  const total = queue.length;
  const status = () => ($("status").textContent = `Jev is sorting… ${done} / ${total}${failed.size ? `, ${failed.size} failed` : ""}`);
  status();
  feed = { start: Date.now(), total, running: true, rows: [] };
  $("feed-list").innerHTML = "";
  $("feed").hidden = false;
  setFeedOpen(true);
  renderFeedStats();
  const tick = setInterval(renderFeedStats, 1000);
  const worker = async () => {
    for (let c; (c = queue.shift()); ) {
      const row = { c, t: Date.now() - feed.start, state: "judging" };
      feed.rows.push(row);
      row.el = document.createElement("li");
      row.el.className = "feed-row";
      row.el.innerHTML = feedRow(row);
      $("feed-list").prepend(row.el);
      judging.add(c.id);
      render();
      renderFeedStats();
      const res = await fetch(`/api/judge/${c.id}`, { method: "POST" });
      judging.delete(c.id);
      if (res.ok) {
        results[c.id] = row.v = await res.json();
        row.state = row.v.decision;
      } else {
        failed.add(c.id);
        row.state = "failed";
      }
      row.el.innerHTML = feedRow(row);
      done++;
      status();
      render();
      renderFeedStats();
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  clearInterval(tick);
  feed.running = false;
  renderFeedStats();
  $("status").textContent = failed.size ? `${failed.size} of ${total} failed. Click Sort again to retry them.` : `Sorted ${total} applicant${total === 1 ? "" : "s"}.`;
  $("sort").disabled = $("reset").disabled = false;
}

// Live feed of Jev calls for the current sort run, newest first.
let feed = null;
const clock = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;

function renderFeedStats() {
  const rows = feed.rows;
  const judged = rows.filter((r) => r.v);
  const tally = (d) => judged.filter((r) => r.state === d).length;
  const avg = judged.length ? judged.reduce((s, r) => s + r.v.ms, 0) / judged.length / 1000 : 0;
  const cost = judged.reduce((s, r) => s + r.v.cost, 0);
  $("feed-live").className = feed.running ? "live on" : "live";
  $("feed-stats").innerHTML = `<b>${judged.length + rows.filter((r) => r.state === "failed").length} / ${feed.total}</b> judged · ${rows.filter((r) => r.state === "judging").length} in flight · ` +
    `${tally("meet")} meet, ${tally("consider")} consider, ${tally("reject")} reject · avg ${avg.toFixed(1)}s · $${cost.toFixed(3)} · ${clock(Date.now() - feed.start)}`;
}

// Rows are created once and updated in place, so only new rows animate.
function feedRow(r) {
  return `<span class="t">${clock(r.t)}</span>
    <span class="who">${esc(r.c.name)} <span>· ${esc(roleOf(r.c).title)}</span></span>
    <span class="tag ${r.state}">${r.state === "judging" ? "Judging…" : r.state}</span>
    <span>${r.v ? r.v.score : ""}</span>
    <span class="model">${r.v ? esc(r.v.model.split("/").pop()) : ""}</span>
    <span class="ms">${r.v ? `${(r.v.ms / 1000).toFixed(1)}s` : ""}</span>
    <span class="cost">${r.v ? `$${r.v.cost.toFixed(4)}` : ""}</span>`;
}

function setFeedOpen(open) {
  $("feed").classList.toggle("collapsed", !open);
  $("feed-toggle").textContent = open ? "Hide" : "Show";
  $("feed-toggle").setAttribute("aria-expanded", open);
}
$("feed-toggle").addEventListener("click", () => setFeedOpen($("feed").classList.contains("collapsed")));
$("feed-close").addEventListener("click", () => ($("feed").hidden = true));

function showDetail(id) {
  const c = candidates.find((x) => x.id === id);
  const v = results[id];
  const role = roleOf(c);
  $("detail").innerHTML = `<div class="detail">
    <header>
      <div><h3>${esc(c.name)}</h3><div class="meta">${esc(c.currentTitle)} at ${esc(c.currentEmployer)} · ${esc(c.location)}</div>
      <span class="chip">${esc(role.title)} · ${esc(role.location)}</span></div>
      <button class="close" aria-label="Close" onclick="this.closest('dialog').close()">×</button>
    </header>
    ${v ? `<div class="verdict ${v.decision}">
      <p><b>${v.decision[0].toUpperCase() + v.decision.slice(1)}</b> · score ${v.score} · ${esc(v.headline)}</p>
      <div class="cols">
        <div><h4>Strengths</h4><ul>${v.strengths.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>
        <div><h4>Concerns</h4><ul>${v.concerns.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>
      </div>
      <p class="meta" style="margin-top:8px">Judged by Jev (routed to ${esc(v.model)})</p>
    </div>` : ""}
    <div class="facts">
      <div><span>Experience</span> ${c.yearsExperience} years</div>
      <div><span>Work preference</span> ${esc(c.workPreference)}</div>
      <div><span>Right to work</span> ${esc(c.rightToWork)}</div>
      <div><span>Notice</span> ${esc(c.noticePeriod)}</div>
      <div><span>Salary expectation</span> ${esc(c.salaryExpectation)}</div>
      <div><span>Email</span> ${esc(c.email)}</div>
    </div>
    <h4>Cover letter</h4><p class="letter">${esc(c.coverLetter)}</p>
    <h4>Experience</h4>${c.experience.map((j) => `<div class="job"><b>${esc(j.title)}</b>, ${esc(j.employer)} <span class="when">${esc(j.start)} to ${esc(j.end)}</span>
      <ul>${j.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul></div>`).join("")}
    <h4>Education</h4><ul>${c.education.map((e) => `<li>${esc(e.degree)}, ${esc(e.institution)} (${e.year})</li>`).join("")}</ul>
    <h4>Skills</h4><p>${c.skills.map((s) => `<span class="chip">${esc(s)}</span>`).join(" ")}</p>
  </div>`;
  $("detail").showModal();
}

$("role").addEventListener("change", render);
$("sort").addEventListener("click", sortAll);
$("reset").addEventListener("click", () => {
  results = {};
  failed.clear();
  $("status").textContent = "";
  $("feed").hidden = true;
  render();
});
document.addEventListener("click", (e) => {
  const el = e.target.closest(".card");
  if (el) showDetail(el.dataset.id);
});
$("detail").addEventListener("click", (e) => { if (e.target === $("detail")) $("detail").close(); });
load();
