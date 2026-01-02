const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const QUEUE_DIR = path.join(process.cwd(), "_queue_runs");
const RUNS_DIR = path.join(process.cwd(), "_runs");

function readFrontMatter(raw) {
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!m) return { data: null, body: raw, error: "Missing YAML front matter." };
  try {
    const data = yaml.load(m[1]) || {};
    const body = raw.slice(m[0].length);
    return { data, body, error: null };
  } catch (e) {
    return { data: null, body: raw, error: `YAML parse error: ${e.message}` };
  }
}

function writeFrontMatter(data, body) {
  const fm = yaml.dump(data, { lineWidth: 120 }).trimEnd();
  return `---\n${fm}\n---\n${body || ""}`;
}

function main() {
  if (!fs.existsSync(QUEUE_DIR)) {
    console.log("No _queue_runs folder found. Nothing to promote.");
    return;
  }
  if (!fs.existsSync(RUNS_DIR)) fs.mkdirSync(RUNS_DIR, { recursive: true });

  const files = fs
    .readdirSync(QUEUE_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => path.join(QUEUE_DIR, f));

  if (!files.length) {
    console.log("No queued .md files to promote.");
    return;
  }

  let moved = 0;

  for (const fp of files) {
    const raw = fs.readFileSync(fp, "utf8");
    const { data, body, error } = readFrontMatter(raw);

    if (error) {
      console.log(`Skipping ${path.basename(fp)}: ${error}`);
      continue;
    }

    const status = String(data.status || "").trim().toLowerCase();
    if (status !== "approved") continue;

    // Optional: stamp verified fields if you want
    data.verified = true;

    const outName = path.basename(fp);
    const dest = path.join(RUNS_DIR, outName);

    // Avoid overwrite
    if (fs.existsSync(dest)) {
      console.log(`Skipping ${outName}: file already exists in _runs/`);
      continue;
    }

    fs.writeFileSync(dest, writeFrontMatter(data, body), "utf8");
    fs.unlinkSync(fp);
    moved++;
    console.log(`Promoted: ${outName}`);
  }

  if (!moved) {
    console.log("No approved runs found to promote.");
  } else {
    console.log(`Done. Promoted ${moved} run(s).`);
  }
}

main();
