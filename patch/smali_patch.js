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

// Замена строковых ресурсов в values-ru (идемпотентно).
// Правило привязано к имени string, а не к значению — переживает смену текста в новых версиях.
const STRING_REPLACEMENTS = [
  {
    fileHint: path.join("res", "values-ru", "strings.xml"),
    name: "email_phone_placeholder",
    value: "Введи свой эмэйл / или номер 380\u2764\ufe0f",
  },
];

function applyStringPatch(decodedDir) {
  const results = [];
  for (const rule of STRING_REPLACEMENTS) {
    const file = path.join(decodedDir, rule.fileHint);
    if (!fs.existsSync(file)) { results.push("string: file not found " + rule.fileHint); continue; }
    let text = fs.readFileSync(file, "utf8");
    const re = new RegExp('(<string name="' + rule.name + '">)([\\s\\S]*?)(</string>)');
    if (!re.test(text)) { results.push("string: not found " + rule.name); continue; }
    if (text.includes('name="' + rule.name + '">' + rule.value + "<")) {
      results.push("string: already patched " + rule.name); continue;
    }
    text = text.replace(re, "$1" + rule.value + "$3");
    fs.writeFileSync(file, text, "utf8");
    results.push("string: patched " + rule.name);
  }
  return results;
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

module.exports = { applySmaliPatch, applyStringPatch, MARKER };
