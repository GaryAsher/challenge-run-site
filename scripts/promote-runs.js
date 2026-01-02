#!/usr/bin/env node
/* =========================================================
   promote-runs.js (no dependencies)
   - Moves:
       status: approved  -> _runs/
       status: rejected  -> _runs/rejected/
       status: pending   -> stays in _queue_runs/
   - Keeps files for audit purposes
   ========================================================= */

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const QUEUE_DIR = path.join(ROOT, "_queue_runs");
const RUNS_DIR = path.join(ROOT, "_runs");
const REJECTED_DIR = path.join(RUNS_DIR, "rejected");

function parseFrontMatter(md) {
  const trimmed = md.replace(/^\uFEFF/, "");
  if (!trimmed.startsWith("---")) return { data: {}, body: md, errors: ["Missing front matter."] };

  const parts = trimmed.split("\n");
  let endIdx = -1;
  for (let i = 1; i < parts.length; i++) {
    if (parts[i].trim() === "---") {
      endIdx = i;
      break;
    }
  }
  if (endIdx === -1) return { data: {}, body: md, errors: ["Front matter not closed."] };

  const fmLines = parts.slice(1, endIdx);
  const body = parts.slice(endIdx + 1).join("\n");

  const data = {};
  const errors = [];

  function unquote(s) {
    const v = String(s);
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      return v.slice(1, -1);
    }
    return v;
  }

  for (let i = 0; i < fmLines.length; i++) {
    const raw = fmLines[i];
    const line = raw.replace(/\t/g, "  ");
    const t = line.trim();

    if (!t || t.startsWith("#")) continue;

    if (t.startsWith("- ")) {
      errors.push(`Unexpected list item without a key on line ${i + 1}: "${t}"`);
      continue;
    }

    const m = /^([A-Za-z0-9_]+)\s*:\s*(.*)$/.exec(line);
    if (!m) {
      errors.push(`Invalid front matter line ${i + 1}: "${t}"`);
      continue;
    }

    const key = m[1];
    let rest = (m[2] ?? "").trim();

    if (rest === "") {
      // list block?
      const list = [];
      let j = i + 1;
      while (j < fmLines.length) {
        const nxt = fmLines[j].trim();
        if (!nxt) {
          j++;
          continue;
        }
        if (/^[A-Za-z0-9_]+\s*:/.test(nxt)) break;

        const li = /^\-\s+(.*)$/.exec(nxt);
        if (!li) break;
        list.push(unquote(li[1].trim()));
        j++;
      }
      if (j > i + 1) {
        data[key] = list;
        i = j - 1;
      } else {
        data[key] = null;
      }
      continue;
    }

    if (rest.startsWith("[") && rest.endsWith("]")) {
      const inner = rest.slice(1, -1).trim();
      data[key] = inner ? inner.split(",").map((x) => unquote(x.trim())).filter(Boolean) : [];
      continue;
    }

    if (rest === "true" || rest === "false") {
      data[key] = rest === "true";
      continue;
    }

    data[key] = unquote(rest);
  }

  return { data, body, errors };
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function listMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".md"))
    .map((f) => path.join(dir, f));
}

function safeDestPath(destDir, filename) {
  const base = filename.replace(/\.md$/i, "");
  const ext = ".md";
  let out = path.join(destDir, filename);

  if (!fs.existsSync(out)) return out;

  for (let i = 2; i < 9999; i++) {
    const candidate = path.join(destDir, `${base}__DUP${i}${ext}`);
    if (!fs.existsSync(candidate)) return candidate;
  }

  // last resort
  return path.join(destDir, `${base}__DUP${Date.now()}${ext}`);
}

function moveFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.renameSync(src, dest);
}

function main() {
  const files = listMarkdownFiles(QUEUE_DIR);

  if (!files.length) {
    console.log("No queued runs to promote.");
    return;
  }

  ensureDir(RUNS_DIR);
  ensureDir(REJECTED_DIR);

  let movedApproved = 0;
  let movedRejected = 0;

  for (const fp of files) {
    const raw = fs.readFileSync(fp, "utf8");
    const { data } = parseFrontMatter(raw);

    const status = String(data.status ?? "").trim().toLowerCase();

    if (status !== "approved" && status !== "rejected") continue;

    const filename = path.basename(fp);

    if (status === "approved") {
      const dest = safeDestPath(RUNS_DIR, filename);
      moveFile(fp, dest);
      movedApproved++;
      console.log(`✅ Approved -> ${path.relative(ROOT, dest)}`);
      continue;
    }

    if (status === "rejected") {
      const dest = safeDestPath(REJECTED_DIR, filename);
      moveFile(fp, dest);
      movedRejected++;
      console.log(`🗃️ Rejected -> ${path.relative(ROOT, dest)}`);
      continue;
    }
  }

  if (movedApproved === 0 && movedRejected === 0) {
    console.log("No approved or rejected runs found in _queue_runs/. Nothing to promote.");
    return;
  }

  console.log(`\nDone. Moved approved: ${movedApproved}, rejected: ${movedRejected}`);
}

main();
