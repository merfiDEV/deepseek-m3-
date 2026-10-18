/**
 * Patch_Strings: движок замены строковых ресурсов (идемпотентно).
 * Правила передаются снаружи (см. Patch_Developer.js и др.).
 */
const fs = require("fs");
const path = require("path");

/**
 * @param {string} decodedDir
 * @param {Array<{fileHint:string, name:string, value:string}>} rules
 * @param {string} tag — префикс в логе
 */
function applyRules(decodedDir, rules, tag) {
  const results = [];
  for (const rule of rules) {
    const file = path.join(decodedDir, rule.fileHint);
    if (!fs.existsSync(file)) { results.push(tag + ": file not found " + rule.fileHint); continue; }
    let text = fs.readFileSync(file, "utf8");
    const re = new RegExp('(<string name="' + rule.name + '">)([\\s\\S]*?)(</string>)');
    if (!re.test(text)) { results.push(tag + ": not found " + rule.name); continue; }
    if (text.includes('name="' + rule.name + '">' + rule.value + "<")) {
      results.push(tag + ": already patched " + rule.name); continue;
    }
    text = text.replace(re, "$1" + rule.value + "$3");
    fs.writeFileSync(file, text, "utf8");
    results.push(tag + ": patched " + rule.name);
  }
  return results;
}

module.exports = { applyRules };
