/**
 * Smali-патч PairIP LicenseCheck (идемпотентный).
 * Нейтрализует проверку лицензии: checkLicense и initializeLicenseCheck -> return-void.
 * Привязка к стабильным сигнатурам методов, а не к телу — переживает обновления.
 */
const fs = require("fs");
const path = require("path");

const MARKER = "# deepseek_patch_neutralized";

const TARGETS = [
  {
    fileHint: path.join("com", "pairip", "licensecheck", "LicenseClient.smali"),
    methods: [
      ".method public static checkLicense(Landroid/content/Context;)V",
      ".method public initializeLicenseCheck()V",
    ],
  },
];

function neutralizeMethodBody(text, methodSig) {
  const startIdx = text.indexOf(methodSig);
  if (startIdx === -1) return { text, changed: false, reason: "method not found: " + methodSig };
  const endIdx = text.indexOf(".end method", startIdx);
  if (endIdx === -1) return { text, changed: false, reason: "end method not found for: " + methodSig };

  const header = text.slice(startIdx, startIdx + methodSig.length);
  const body = text.slice(startIdx + methodSig.length, endIdx);

  if (body.includes(MARKER)) return { text, changed: false, reason: "already patched: " + methodSig };

  // Сохраняем .locals (нужен валидный) — берём из старого тела, иначе 0
  const localsMatch = body.match(/\.locals\s+(\d+)/);
  const locals = localsMatch ? localsMatch[1] : "0";

  const newBody = "\n    " + MARKER + "\n    .locals " + locals + "\n\n    return-void\n";
  const newText = text.slice(0, startIdx + methodSig.length) + newBody + text.slice(endIdx);
  return { text: newText, changed: true, reason: "patched: " + methodSig };
}

function applySmaliPatch(decodedDir) {
  const results = [];
  for (const target of TARGETS) {
    let found = null;
    for (const dexDir of fs.readdirSync(decodedDir)) {
      if (!dexDir.startsWith("smali")) continue;
      const cand = path.join(decodedDir, dexDir, target.fileHint);
      if (fs.existsSync(cand)) { found = cand; break; }
    }
    if (!found) { results.push("smali: file not found for " + target.fileHint); continue; }

    let text = fs.readFileSync(found, "utf8");
    let changedAny = false;
    for (const sig of target.methods) {
      const r = neutralizeMethodBody(text, sig);
      text = r.text;
      if (r.changed) changedAny = true;
      results.push("smali: " + r.reason);
    }
    if (changedAny) fs.writeFileSync(found, text, "utf8");
  }
  return results;
}

module.exports = { applySmaliPatch, MARKER };
