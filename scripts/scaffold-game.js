#!/usr/bin/env node
/**
 * scripts/scaffold-game.js
 *
 * Scaffolds a new game file in _games/<game_id>.md from a JSON payload,
 * optionally downloads a cover image into assets/img/games/<letter>/<game_id>.<ext>,
 * optionally appends missing tags/platforms/challenges to _data/*.yml (preserving section headers),
 * and (by default) runs scripts/generate-codeowners.js to keep CODEOWNERS in sync.
 *
 * Usage:
 *   node scripts/scaffold-game.js path/to/game.json
 *
 * Options:
 *   --dry-run           Print planned actions, write nothing
 *   --force             Overwrite existing _games/<game_id>.md if it exists
 *   --no-download        Do not download cover image even if cover_url is provided
 *   --no-data            Do not modify _data/tags.yml, _data/platforms.yml, or _data/challenges.yml
 *   --no-codeowners      Do not run scripts/generate-codeowners.js
 *
 * JSON format (example - full Hades II style game):
 * {
 *   "game_id": "hades-2",
 *   "name": "Hades II",
 *   "name_aliases": ["Hades 2", "Hades2"],
 *   "status": "Tracking challenge categories, rules, and notable runs.",
 *   "tags": ["action","roguelike","roguelite","hack-and-slash","mythology"],
 *   "platforms": ["steam","epic","nintendo-switch","nintendo-switch-2"],
 *   "timing_method": "IGT",
 *   "tabs": {
 *     "overview": true,
 *     "runs": true,
 *     "history": true,
 *     "resources": true,
 *     "forum": true,
 *     "challenges": false,
 *     "extra_1": false,
 *     "extra_2": false
 *   },
 *   "character_column": {"enabled": true, "label": "Weapon / Aspect"},
 *   "challenges": ["hitless","damageless","no-hit-no-damage"],
 *   "categories_data": [
 *     {
 *       "slug": "chaos-trials",
 *       "label": "Chaos Trials",
 *       "children": [
 *         {"slug": "trial-of-origin", "label": "Trial of Origin"},
 *         {"slug": "trial-of-salt", "label": "Trial of Salt"}
 *       ]
 *     },
 *     {"slug": "underworld-any", "label": "Underworld Any%"}
 *   ],
 *   "subcategories": ["God Only","Boonless","Arcanaless"],
 *   "glitches_data": [
 *     {"slug": "unrestricted", "label": "Unrestricted"},
 *     {"slug": "nmg", "label": "No Major Glitches"},
 *     {"slug": "glitchless", "label": "Glitchless"}
 *   ],
 *   "cover_url": "https://example.com/hades-2.jpg",
 *   "cover_ext": "jpg",
 *   "cover_position": "center"
 * }
 *
 * Default values applied if not specified:
 *   - status: "Tracking challenge categories, rules, and notable runs."
 *   - timing_method: "IGT"
 *   - tabs: overview, runs, history, resources, forum enabled; extra_1, extra_2 disabled
 *   - cover_position: "center"
 */

const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const { spawnSync } = require("child_process");

const ROOT = process.cwd();

const GAMES_DIR = path.join(ROOT, "_games");
const DATA_DIR = path.join(ROOT, "_data");
const TAGS_YML = path.join(DATA_DIR, "tags.yml");
const CHALLENGES_YML = path.join(DATA_DIR, "challenges.yml");
const COVER_BASE_DIR = path.join(ROOT, "assets", "img", "games");

function die(msg) {
  console.error(msg);
  process.exit(1);
}

function readText(p) {
  return fs.readFileSync(p, "utf8");
}

function writeText(p, s) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s, "utf8");
}

function exists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function isSlug(s) {
  return typeof s === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
}

function normalizeArray(x) {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  return [x];
}

function padYamlIndent(level) {
  return "  ".repeat(level);
}

function yamlEscapeScalar(s) {
  const t = String(s);
  if (/[:#\n]/.test(t) || /^\s|\s$/.test(t)) return JSON.stringify(t);
  return t;
}

function yamlInlineArray(arr) {
  const items = arr.map((x) => JSON.stringify(String(x)));
  return `[${items.join(", ")}]`;
}

function buildGameFrontMatter(payload, coverRelPathMaybe) {
  const gameId = payload.game_id;
  const name = payload.name || gameId;
  const status = payload.status || "Tracking challenge categories, rules, and notable runs.";

  const reviewers = Array.isArray(payload.reviewers) ? payload.reviewers : [];
  const nameAliases = normalizeArray(payload.name_aliases).filter(Boolean);
  const tags = normalizeArray(payload.tags).filter(Boolean);
  const platforms = normalizeArray(payload.platforms).filter(Boolean);
  
  // Default tabs - enable common ones by default
  const defaultTabs = {
    overview: true,
    runs: true,
    history: true,
    resources: true,
    forum: true,
    extra_1: false,
    extra_2: false
  };
  const tabs = payload.tabs && typeof payload.tabs === "object" 
    ? { ...defaultTabs, ...payload.tabs } 
    : defaultTabs;
  
  const challenges = normalizeArray(payload.challenges).filter(Boolean);

  const categoriesData = Array.isArray(payload.categories_data) ? payload.categories_data : [];
  const subcategories = normalizeArray(payload.subcategories).filter(Boolean);
  const glitchesData = Array.isArray(payload.glitches_data) ? payload.glitches_data : [];

  // Timing method (IGT, RTA, LRT, etc.)
  const timingMethod = payload.timing_method || "IGT";

  // Character column config
  const characterColumn = payload.character_column && typeof payload.character_column === "object" 
    ? payload.character_column 
    : null;

  const coverPosition = payload.cover_position || "center";

  const lines = [];
  lines.push("---");
  lines.push("layout: game");
  lines.push(`game_id: ${yamlEscapeScalar(gameId)}`);
  lines.push(`reviewers: ${yamlInlineArray(reviewers)}`);
  lines.push(`name: ${yamlEscapeScalar(name)}`);

  if (nameAliases.length) {
    lines.push("name_aliases:");
    for (const a of nameAliases) lines.push(`${padYamlIndent(1)}- ${yamlEscapeScalar(a)}`);
  }

  if (status) lines.push(`status: ${yamlEscapeScalar(status)}`);

  if (tags.length) {
    lines.push("tags:");
    for (const t of tags) lines.push(`${padYamlIndent(1)}- ${yamlEscapeScalar(t)}`);
  } else {
    lines.push("tags: []");
  }

  if (platforms.length) {
    lines.push("platforms:");
    for (const p of platforms) lines.push(`${padYamlIndent(1)}- ${yamlEscapeScalar(p)}`);
  }

  if (coverRelPathMaybe) {
    lines.push(`cover: ${yamlEscapeScalar(coverRelPathMaybe)}`);
    lines.push(`cover_position: ${yamlEscapeScalar(coverPosition)}`);
  }

  // Timing method
  lines.push("");
  lines.push("# Timing method displayed in Time column header (e.g., IGT, RTA, LRT)");
  lines.push(`timing_method: ${yamlEscapeScalar(timingMethod)}`);

  // Tabs - always include with sensible defaults
  lines.push("");
  lines.push("tabs:");
  const tabOrder = ["overview", "runs", "history", "resources", "forum", "challenges", "extra_1", "extra_2"];
  for (const k of tabOrder) {
    if (tabs.hasOwnProperty(k)) {
      const v = !!tabs[k];
      lines.push(`${padYamlIndent(1)}${k}: ${v ? "true" : "false"}`);
    }
  }

  // Character column
  if (characterColumn) {
    lines.push("");
    lines.push("# Character/Weapon/Class column configuration (optional)");
    lines.push("# Set to false or omit to hide the column");
    lines.push("character_column:");
    lines.push(`${padYamlIndent(1)}enabled: ${characterColumn.enabled ? "true" : "false"}`);
    if (characterColumn.label) {
      lines.push(`${padYamlIndent(1)}label: ${yamlEscapeScalar(characterColumn.label)}  # Column header text`);
    }
  }

  if (challenges.length) {
    lines.push("");
    lines.push("challenges:");
    for (const c of challenges) lines.push(`${padYamlIndent(1)}- ${yamlEscapeScalar(c)}`);
  }

  if (categoriesData.length) {
    lines.push("");
    lines.push("categories_data:");
    for (const item of categoriesData) {
      if (!item || typeof item !== "object") continue;
      if (!item.slug || !item.label) continue;
      lines.push(`${padYamlIndent(1)}- slug: ${yamlEscapeScalar(item.slug)}`);
      lines.push(`${padYamlIndent(2)}label: ${yamlEscapeScalar(item.label)}`);
      // Handle children (subcategories)
      if (item.children && Array.isArray(item.children) && item.children.length > 0) {
        lines.push(`${padYamlIndent(2)}children:`);
        for (const child of item.children) {
          if (!child || !child.slug || !child.label) continue;
          lines.push(`${padYamlIndent(3)}- slug: ${yamlEscapeScalar(child.slug)}`);
          lines.push(`${padYamlIndent(4)}label: ${yamlEscapeScalar(child.label)}`);
        }
      }
    }
  }

  if (subcategories.length) {
    lines.push("");
    lines.push("subcategories:");
    for (const s of subcategories) lines.push(`${padYamlIndent(1)}- ${yamlEscapeScalar(s)}`);
  }

  // Glitches data
  if (glitchesData.length) {
    lines.push("");
    lines.push("# Glitch categories - what glitches are allowed");
    lines.push("glitches_data:");
    for (const item of glitchesData) {
      if (!item || typeof item !== "object") continue;
      if (!item.slug || !item.label) continue;
      lines.push(`${padYamlIndent(1)}- slug: ${yamlEscapeScalar(item.slug)}`);
      lines.push(`${padYamlIndent(2)}label: ${yamlEscapeScalar(item.label)}`);
    }
  }

  lines.push("---");
  return lines.join("\n") + "\n";
}

function downloadToFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith("https:") ? https : url.startsWith("http:") ? http : null;
    if (!proto) return reject(new Error(`Unsupported URL protocol: ${url}`));

    fs.mkdirSync(path.dirname(destPath), { recursive: true });

    const request = proto.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(downloadToFile(res.headers.location, destPath));
      }

      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`Failed to download (${res.statusCode}) ${url}`));
      }

      const out = fs.createWriteStream(destPath);
      res.pipe(out);
      out.on("finish", () => out.close(() => resolve()));
      out.on("error", (err) => reject(err));
    });

    request.on("error", reject);
  });
}

function hasKeyInSimpleMapYaml(ymlText, key) {
  const re = new RegExp(`^${escapeRegExp(key)}:\\s*$`, "m");
  return re.test(ymlText);
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/*==================================================================
Inserts a YAML entry into a file organized with section headers like:
 *   # A
 *   alpha:
 *     label: Alpha
 ==================================================================*/
function insertIntoSectionedYaml(original, sectionLetter, entryText) {
  const lines = original.split(/\r?\n/);

  const targetHeader =
    sectionLetter === "0-9" ? /^#\s*0-9\s*$/ : new RegExp(`^#\\s*${escapeRegExp(sectionLetter)}\\s*$`);

  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (targetHeader.test(lines[i].trim())) {
      idx = i;
      break;
    }
  }

  if (idx === -1) {
    const trimmed = original.replace(/\s+$/, "");
    return trimmed + "\n\n" + entryText.replace(/\s+$/, "") + "\n";
  }

  let insertAt = idx + 1;
  while (insertAt < lines.length && lines[insertAt].trim() === "") insertAt++;

  const entryLines = entryText.replace(/\s+$/, "").split(/\r?\n/);
  const out = [
    ...lines.slice(0, insertAt),
    ...entryLines,
    "",
    ...lines.slice(insertAt),
  ];

  return out.join("\n").replace(/\n{4,}/g, "\n\n\n");
}

function ensureTagExists(tagKey, dryRun) {
  if (!exists(TAGS_YML)) return;

  const original = readText(TAGS_YML);
  if (hasKeyInSimpleMapYaml(original, tagKey)) return;

  const first = tagKey[0];
  const section = /[0-9]/.test(first) ? "0-9" : first.toUpperCase();

  const label = tagKey
    .split("-")
    .map((w) => w ? w[0].toUpperCase() + w.slice(1) : w)
    .join(" ");

  const entry = `${tagKey}:\n  label: ${yamlEscapeScalar(label)}\n`;

  const updated = insertIntoSectionedYaml(original, section, entry);

  if (dryRun) {
    console.log(`[dry-run] would add tag '${tagKey}' to ${path.relative(ROOT, TAGS_YML)}`);
  } else {
    writeText(TAGS_YML, updated);
    console.log(`Added tag '${tagKey}' to ${path.relative(ROOT, TAGS_YML)}`);
  }
}

function ensureChallengeExists(chKey, dryRun) {
  if (!exists(CHALLENGES_YML)) return;

  const original = readText(CHALLENGES_YML);
  if (hasKeyInSimpleMapYaml(original, chKey)) return;

  const first = chKey[0];
  const section = /[0-9]/.test(first) ? "0-9" : first.toUpperCase();

  const label = chKey
    .split("-")
    .map((w) => w ? w[0].toUpperCase() + w.slice(1) : w)
    .join(" ");

  const entry = `${chKey}:\n  label: ${yamlEscapeScalar(label)}\n`;

  const updated = insertIntoSectionedYaml(original, section, entry);

  if (dryRun) {
    console.log(`[dry-run] would add challenge '${chKey}' to ${path.relative(ROOT, CHALLENGES_YML)}`);
  } else {
    writeText(CHALLENGES_YML, updated);
    console.log(`Added challenge '${chKey}' to ${path.relative(ROOT, CHALLENGES_YML)}`);
  }
}

const PLATFORMS_YML = path.join(DATA_DIR, "platforms.yml");

function ensurePlatformExists(platformKey, dryRun) {
  if (!exists(PLATFORMS_YML)) return;

  const original = readText(PLATFORMS_YML);
  if (hasKeyInSimpleMapYaml(original, platformKey)) return;

  const label = platformKey
    .split("-")
    .map((w) => w ? w[0].toUpperCase() + w.slice(1) : w)
    .join(" ");

  // Platforms file doesn't have section headers, just append
  const entry = `\n${platformKey}:\n  label: ${yamlEscapeScalar(label)}\n`;

  if (dryRun) {
    console.log(`[dry-run] would add platform '${platformKey}' to ${path.relative(ROOT, PLATFORMS_YML)}`);
  } else {
    const updated = original.replace(/\s+$/, "") + entry;
    writeText(PLATFORMS_YML, updated);
    console.log(`Added platform '${platformKey}' to ${path.relative(ROOT, PLATFORMS_YML)}`);
  }
}

function runGenerateCodeowners(dryRun) {
  const scriptPath = path.join(ROOT, "scripts", "generate-codeowners.js");
  if (!exists(scriptPath)) {
    console.warn(`Warning: ${path.relative(ROOT, scriptPath)} not found, skipping CODEOWNERS generation.`);
    return;
  }
  if (dryRun) {
    console.log("[dry-run] would run: node scripts/generate-codeowners.js");
    return;
  }

  const res = spawnSync("node", [scriptPath], { stdio: "inherit" });
  if (res.status !== 0) {
    process.exit(res.status || 1);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const flags = new Set(argv.filter((a) => a.startsWith("--")));
  const args = argv.filter((a) => !a.startsWith("--"));

  const dryRun = flags.has("--dry-run");
  const force = flags.has("--force");
  const noDownload = flags.has("--no-download");
  const noData = flags.has("--no-data");
  const noCodeowners = flags.has("--no-codeowners");

  const inputPath = args[0];
  if (!inputPath) {
    die(
      "Missing input JSON.\n\nUsage:\n  node scripts/scaffold-game.js path/to/game.json\n"
    );
  }

  const fullInputPath = path.isAbsolute(inputPath) ? inputPath : path.join(ROOT, inputPath);
  if (!exists(fullInputPath)) die(`Input JSON not found: ${fullInputPath}`);

  let payload;
  try {
    payload = JSON.parse(readText(fullInputPath));
  } catch (e) {
    die(`Failed to parse JSON: ${fullInputPath}\n${e.message}`);
  }

  if (!payload || typeof payload !== "object") die("Input JSON must be an object.");
  if (!payload.game_id) die("Input JSON must include game_id.");
  if (!isSlug(payload.game_id)) die(`Invalid game_id '${payload.game_id}'. Use lowercase slug format like 'hades-2'.`);

  const gameId = payload.game_id;
  const gameFilePath = path.join(GAMES_DIR, `${gameId}.md`);
  const gameBody = typeof payload.body === "string" ? payload.body.trim() : "";

  // Cover handling
  let coverRel = null;
  let coverDest = null;

  const coverUrl = payload.cover_url ? String(payload.cover_url).trim() : "";
  const coverExt = payload.cover_ext ? String(payload.cover_ext).trim().replace(/^\./, "") : "jpg";

  if (coverUrl && !noDownload) {
    const firstLetter = gameId[0].toLowerCase();
    coverRel = `/assets/img/games/${firstLetter}/${gameId}.${coverExt}`;
    coverDest = path.join(COVER_BASE_DIR, firstLetter, `${gameId}.${coverExt}`);
  } else if (payload.cover) {
    coverRel = String(payload.cover).trim();
  }

  console.log(`Scaffolding game: ${gameId}`);
  console.log(`- Game file: ${path.relative(ROOT, gameFilePath)}`);
  if (coverRel) console.log(`- Cover: ${coverRel}${coverDest ? " (download)" : ""}`);
  if (!noData) console.log(`- Data updates: tags.yml, platforms.yml, challenges.yml`);
  if (!noCodeowners) console.log(`- Will run: scripts/generate-codeowners.js`);
  if (dryRun) console.log("- Mode: dry-run (no files will be written)");

  // Write _games/<id>.md
  if (exists(gameFilePath) && !force) {
    die(`Game file already exists: ${path.relative(ROOT, gameFilePath)}\nUse --force to overwrite.`);
  }

  const fm = buildGameFrontMatter(payload, coverRel);
  const fullGameText = fm + "\n" + (gameBody ? gameBody + "\n" : "");
  if (dryRun) {
    console.log(`[dry-run] would write ${path.relative(ROOT, gameFilePath)}`);
  } else {
    writeText(gameFilePath, fullGameText);
    console.log(`Wrote ${path.relative(ROOT, gameFilePath)}`);
  }

  // Download cover if requested
  if (coverUrl && coverDest && !noDownload) {
    if (dryRun) {
      console.log(`[dry-run] would download cover from ${coverUrl} -> ${path.relative(ROOT, coverDest)}`);
    } else {
      console.log(`Downloading cover: ${coverUrl}`);
      await downloadToFile(coverUrl, coverDest);
      console.log(`Saved cover to ${path.relative(ROOT, coverDest)}`);
    }
  }

  // Update _data/tags.yml, _data/platforms.yml, and _data/challenges.yml
  if (!noData) {
    const tags = normalizeArray(payload.tags).filter(Boolean);
    for (const t of tags) ensureTagExists(String(t).trim(), dryRun);

    const platforms = normalizeArray(payload.platforms).filter(Boolean);
    for (const p of platforms) ensurePlatformExists(String(p).trim(), dryRun);

    const challenges = normalizeArray(payload.challenges).filter(Boolean);
    for (const c of challenges) ensureChallengeExists(String(c).trim(), dryRun);
  }

  // Regenerate CODEOWNERS
  if (!noCodeowners) {
    runGenerateCodeowners(dryRun);
  }

  // Generate game subpages (history, forum, resources, etc.)
  runGenerateGamePages(gameId, dryRun);

  // Generate run category pages
  runGenerateRunCategories(gameId, dryRun);

  console.log("Done.");
}

function runGenerateGamePages(gameId, dryRun) {
  const scriptPath = path.join(ROOT, "scripts", "generate-game-pages.js");
  if (!exists(scriptPath)) {
    console.warn(`Warning: ${path.relative(ROOT, scriptPath)} not found, skipping game page generation.`);
    return;
  }
  if (dryRun) {
    console.log(`[dry-run] would run: node scripts/generate-game-pages.js --game ${gameId}`);
    return;
  }

  console.log(`Generating game pages for ${gameId}...`);
  const res = spawnSync("node", [scriptPath, "--game", gameId], { stdio: "inherit" });
  if (res.status !== 0) {
    console.warn(`Warning: generate-game-pages.js exited with status ${res.status}`);
  }
}

function runGenerateRunCategories(gameId, dryRun) {
  const scriptPath = path.join(ROOT, "scripts", "generate-run-category-pages.js");
  if (!exists(scriptPath)) {
    console.warn(`Warning: ${path.relative(ROOT, scriptPath)} not found, skipping run category generation.`);
    return;
  }
  if (dryRun) {
    console.log(`[dry-run] would run: node scripts/generate-run-category-pages.js --game ${gameId}`);
    return;
  }

  console.log(`Generating run category pages for ${gameId}...`);
  const res = spawnSync("node", [scriptPath, "--game", gameId], { stdio: "inherit" });
  if (res.status !== 0) {
    console.warn(`Warning: generate-run-category-pages.js exited with status ${res.status}`);
  }
}

main().catch((err) => die(err.stack || err.message || String(err)));
