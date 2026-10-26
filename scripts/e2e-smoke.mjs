// End-to-end smoke + security test against RUNNING servers.
//   node scripts/e2e-smoke.mjs
// Env overrides: FRONTEND_URL (default http://localhost:3000), BACKEND_URL (default http://localhost:8000)
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FRONTEND = process.env.FRONTEND_URL || "http://localhost:3000";
const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";

// Cleanup needs the DB. Load DATABASE_URL from frontend/.env without printing it.
if (!process.env.DATABASE_URL) {
  const envFile = path.join(root, "frontend", ".env");
  if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*"?([^"]*)"?\s*$/);
      if (m) process.env.DATABASE_URL = m[1];
    }
  }
}

let passed = 0;
let failed = 0;
const warnings = [];

function check(name, ok, extra = "") {
  if (ok) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${extra ? "  -> " + extra : ""}`);
  }
}

async function call(base, method, url, { token, json, form, raw } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  } else if (form) {
    body = form;
  }
  let res;
  try {
    res = await fetch(base + url, { method, headers, body });
  } catch (e) {
    // Server unreachable: report as status 0 so the check fails with a readable message.
    return { status: 0, data: `network error: ${e.cause?.code || e.message}`, buf: Buffer.alloc(0), res: { headers: new Headers() } };
  }
  if (raw) return { status: res.status, res, buf: Buffer.from(await res.arrayBuffer()) };
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

const web = (m, u, o) => call(FRONTEND, m, u, o);
const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const users = {
  A: { email: `e2e.a.${suffix}@example.com`, password: "Passw0rd!A1", fullName: "E2E Alice", barCouncilNo: `E2E-A-${suffix}` },
  B: { email: `e2e.b.${suffix}@example.com`, password: "Passw0rd!B1", fullName: "E2E Bob", barCouncilNo: `E2E-B-${suffix}` },
};
const tokens = {};
const ids = {};

async function main() {
  console.log(`Frontend: ${FRONTEND}\nBackend:  ${BACKEND}\n`);

  console.log("[1] Registration validation + register + login");
  let r = await web("POST", "/api/auth/register", { json: { ...users.A, password: "short" } });
  check("register rejects password < 8 chars (400)", r.status === 400, JSON.stringify(r.data));
  r = await web("POST", "/api/auth/register", { json: { ...users.A, email: "not-an-email" } });
  check("register rejects bad email (400)", r.status === 400, JSON.stringify(r.data));
  for (const k of ["A", "B"]) {
    r = await web("POST", "/api/auth/register", { json: users[k] });
    check(`register user ${k}`, r.status === 201, JSON.stringify(r.data));
    r = await web("POST", "/api/auth/login", { json: { email: users[k].email, password: users[k].password } });
    check(`login user ${k} returns token`, r.status === 200 && !!r.data?.token, JSON.stringify(r.data));
    tokens[k] = r.data?.token;
    ids[k] = r.data?.lawyer?.id;
  }
  r = await web("POST", "/api/auth/login", { json: { email: users.A.email, password: "wrong-password" } });
  check("login with wrong password -> 401", r.status === 401);

  console.log("\n[2] No token -> 401");
  for (const [m, u] of [["GET", "/api/cases"], ["POST", "/api/cases"], ["GET", "/api/hearings"], ["POST", "/api/hearings"],
    ["GET", "/api/evidence"], ["POST", "/api/evidence"], ["GET", "/api/dashboard/stats"]]) {
    r = await web(m, u, m === "POST" ? { json: {} } : {});
    check(`${m} ${u} without token`, r.status === 401, String(r.status));
  }
  r = await web("POST", "/api/backend/chat", { json: { question: "test" } });
  check("POST /api/backend/chat (via Next proxy) without token", r.status === 401, String(r.status));
  r = await call(BACKEND, "POST", "/api/chat", { json: { question: "test" } });
  check("POST backend /api/chat directly without token", r.status === 401, String(r.status));
  r = await call(BACKEND, "GET", "/health");
  check("backend /health is public (200)", r.status === 200);

  console.log("\n[3] Cases (user A)");
  r = await web("POST", "/api/cases", { token: tokens.A, json: { title: "x" } });
  check("create case with missing fields -> 400", r.status === 400, JSON.stringify(r.data));
  r = await web("POST", "/api/cases", {
    token: tokens.A,
    json: { caseNumber: `E2E/${suffix}`, title: "E2E Case", clientName: "Client One", courtName: "Delhi High Court", courtType: "HIGH_COURT", clientEmail: "" },
  });
  check("create case", r.status === 201 && r.data?.lawyerId === ids.A, JSON.stringify(r.data));
  ids.case = r.data?.id;
  r = await web("PUT", `/api/cases/${ids.case}`, { token: tokens.A, json: { title: "E2E Case (edited)", lawyerId: ids.B, id: "hijack", createdAt: "2000-01-01", stage: "TRIAL" } });
  check("PUT case with extra fields succeeds (extras ignored)", r.status === 200, JSON.stringify(r.data));
  r = await web("GET", `/api/cases/${ids.case}`, { token: tokens.A });
  check("PUT cannot change lawyerId/id (still owned by A)", r.status === 200 && r.data?.lawyerId === ids.A && r.data?.id === ids.case, JSON.stringify(r.data?.lawyerId));
  check("PUT applied whitelisted fields (title, stage)", r.data?.title === "E2E Case (edited)" && r.data?.stage === "TRIAL");
  r = await web("PUT", `/api/cases/${ids.case}`, { token: tokens.A, json: { stage: "NOT_A_STAGE" } });
  check("PUT rejects invalid enum (400)", r.status === 400, JSON.stringify(r.data));

  console.log("\n[4] Hearings (user A)");
  r = await web("POST", "/api/hearings", { token: tokens.A, json: { title: "No case", date: "2030-01-01", courtName: "C" } });
  check("hearing without caseId -> 400", r.status === 400, JSON.stringify(r.data));
  r = await web("POST", "/api/hearings", { token: tokens.A, json: { title: "Bad date", date: "not-a-date", courtName: "C", caseId: ids.case } });
  check("hearing with invalid date -> 400", r.status === 400, JSON.stringify(r.data));
  const later = "2031-06-20", earlier = "2031-03-10";
  r = await web("POST", "/api/hearings", { token: tokens.A, json: { title: "Later hearing", date: later, courtName: "Delhi High Court", caseId: ids.case } });
  check("create later hearing", r.status === 201, JSON.stringify(r.data));
  r = await web("POST", "/api/hearings", { token: tokens.A, json: { title: "Earlier hearing", date: earlier, courtName: "Delhi High Court", caseId: ids.case } });
  check("create earlier hearing", r.status === 201, JSON.stringify(r.data));
  r = await web("GET", `/api/cases/${ids.case}`, { token: tokens.A });
  check("case.nextHearingDate = EARLIEST upcoming scheduled hearing",
    r.data?.nextHearingDate?.startsWith(earlier), String(r.data?.nextHearingDate));

  console.log("\n[5] Evidence (user A)");
  const pdfBytes = Buffer.from("%PDF-1.4\n% e2e test file\n" + "x".repeat(2048));
  const mkForm = (extra = {}, name = "exhibit-a.pdf", bytes = pdfBytes, type = "application/pdf") => {
    const f = new FormData();
    f.append("file", new Blob([bytes], { type }), name);
    for (const [k, v] of Object.entries(extra)) f.append(k, v);
    return f;
  };
  r = await web("POST", "/api/evidence", { token: tokens.A, form: mkForm({}) });
  check("upload without caseId -> 400", r.status === 400, JSON.stringify(r.data));
  r = await web("POST", "/api/evidence", { token: tokens.A, form: mkForm({ caseId: ids.case }, "malware.exe", Buffer.from("MZ"), "application/x-msdownload") });
  check("upload disallowed type (.exe) -> 415", r.status === 415, String(r.status));
  r = await web("POST", "/api/evidence", { token: tokens.A, form: mkForm({ caseId: ids.case, tag: "Exhibit A" }) });
  check("upload evidence", r.status === 201 && !r.data?.fileUrl, JSON.stringify(r.data));
  ids.evidence = r.data?.id;
  r = await web("GET", "/api/evidence", { token: tokens.A });
  const item = Array.isArray(r.data) ? r.data.find((e) => e.id === ids.evidence) : null;
  check("list evidence includes the item", !!item);
  check("list evidence has NO file contents / path", !!item && !("fileUrl" in item) && JSON.stringify(r.data).length < 5000);
  const dl = await web("GET", `/api/evidence/${ids.evidence}/file?download=1`, { token: tokens.A, raw: true });
  check("download file returns identical bytes", dl.status === 200 && Buffer.compare(dl.buf, pdfBytes) === 0, String(dl.status));
  check("download sets Content-Type application/pdf", (dl.res.headers.get("content-type") || "").includes("application/pdf"));
  r = await web("GET", `/api/evidence/${ids.evidence}/file`, {});
  check("download file without token -> 401", r.status === 401);

  console.log("\n[6] AI chat (user A)");
  r = await web("POST", "/api/backend/chat", { token: tokens.A, json: { question: "   " } });
  check("chat with empty question -> 400", r.status === 400, JSON.stringify(r.data));
  r = await web("GET", "/api/backend/chat/sources?question=" + encodeURIComponent("anticipatory bail Section 438"), { token: tokens.A });
  if (r.status === 200) {
    check("retrieval returns sources from the vector index", Array.isArray(r.data?.sources) && r.data.sources.length > 0, JSON.stringify(r.data).slice(0, 200));
  } else {
    check("retrieval (sources) works", false, `${r.status} ${JSON.stringify(r.data)}`);
  }
  r = await web("POST", "/api/backend/chat", { token: tokens.A, json: { question: "What is anticipatory bail under Section 438 CrPC?" } });
  if (r.status === 200) {
    check("chat returns an answer + sources", typeof r.data?.answer === "string" && r.data.answer.length > 0 && Array.isArray(r.data.sources) && r.data.sources.length > 0);
    check("chat answer includes the disclaimer", /not legal advice/i.test(r.data.answer));
  } else if (r.status === 503) {
    warnings.push(`AI chat answered 503 ("${r.data?.detail}"). The LLM step was NOT exercised - set OPENAI_API_KEY in backend/.env and re-run to verify it.`);
    console.log(`  WARN  chat returned 503 (clear message): ${r.data?.detail}`);
  } else {
    check("chat returns 200 or a clear 503", false, `${r.status} ${JSON.stringify(r.data)}`);
  }

  console.log("\n[7] SECURITY: user B vs user A's data");
  r = await web("GET", `/api/cases/${ids.case}`, { token: tokens.B });
  check("B cannot read A's case (404)", r.status === 404, String(r.status));
  r = await web("PUT", `/api/cases/${ids.case}`, { token: tokens.B, json: { title: "pwned", lawyerId: ids.B } });
  check("B cannot edit A's case (404)", r.status === 404, String(r.status));
  r = await web("GET", `/api/cases/${ids.case}`, { token: tokens.A });
  check("A's case unchanged after B's attempts", r.data?.title === "E2E Case (edited)" && r.data?.lawyerId === ids.A);
  r = await web("DELETE", `/api/cases/${ids.case}`, { token: tokens.B });
  check("B cannot delete A's case (404)", r.status === 404, String(r.status));
  r = await web("GET", "/api/cases", { token: tokens.B });
  check("B's case list does not contain A's case", Array.isArray(r.data) && !r.data.some((c) => c.id === ids.case));
  r = await web("POST", "/api/hearings", { token: tokens.B, json: { title: "Sneaky", date: "2032-01-01", courtName: "C", caseId: ids.case } });
  check("B cannot attach a hearing to A's case (404)", r.status === 404, String(r.status));
  r = await web("POST", "/api/evidence", { token: tokens.B, form: mkForm({ caseId: ids.case }) });
  check("B cannot attach evidence to A's case (404)", r.status === 404, String(r.status));
  r = await web("GET", `/api/evidence/${ids.evidence}/file`, { token: tokens.B });
  check("B cannot download A's evidence file (404)", r.status === 404, String(r.status));
  r = await web("DELETE", `/api/evidence/${ids.evidence}`, { token: tokens.B });
  check("B cannot delete A's evidence (404)", r.status === 404, String(r.status));
  r = await web("GET", "/api/evidence", { token: tokens.B });
  check("B's evidence list does not contain A's evidence", Array.isArray(r.data) && !r.data.some((e) => e.id === ids.evidence));
  r = await web("GET", "/api/hearings", { token: tokens.B });
  check("B's hearing list is empty of A's hearings", Array.isArray(r.data) && r.data.every((h) => h.caseId !== ids.case));
  r = await web("GET", "/api/cases", { token: "forged.token.value" });
  check("forged token -> 401", r.status === 401);

  console.log("\n[8] Evidence delete removes the file");
  const uploadsDir = path.join(root, "frontend", "uploads", ids.A || "");
  const before = fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir).length : 0;
  r = await web("DELETE", `/api/evidence/${ids.evidence}`, { token: tokens.A });
  check("A deletes own evidence", r.status === 200, String(r.status));
  const after = fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir).length : 0;
  check("file removed from disk", before === 1 && after === 0, `before=${before} after=${after}`);
}

async function cleanup() {
  console.log("\n[cleanup]");
  try {
    if (ids.case && tokens.A) await web("DELETE", `/api/cases/${ids.case}`, { token: tokens.A });
    const require = createRequire(path.join(root, "frontend", "package.json"));
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();
    const del = await prisma.lawyer.deleteMany({ where: { email: { in: [users.A.email, users.B.email] } } });
    await prisma.$disconnect();
    for (const k of ["A", "B"]) {
      if (ids[k]) fs.rmSync(path.join(root, "frontend", "uploads", ids[k]), { recursive: true, force: true });
    }
    console.log(`  removed ${del.count} test users, their cases/hearings/evidence and upload folders`);
  } catch (e) {
    console.log("  cleanup problem:", e.message);
  }
}

try {
  await main();
} catch (e) {
  failed++;
  console.log("\nUNEXPECTED ERROR:", e);
} finally {
  await cleanup();
}

console.log(`\n==== ${passed} passed, ${failed} failed ====`);
for (const w of warnings) console.log("WARNING:", w);
process.exit(failed ? 1 : 0);
