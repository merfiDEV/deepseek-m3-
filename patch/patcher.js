#!/usr/bin/env node
/**
 * Патчер DeepSeek: встраивает модуль patch (dex + записи в AndroidManifest.xml).
 * Идемпотентный: повторный запуск не дублирует вставки (ищет MARKER).
 *
 * Использование:
 *   node patch/patcher.js build --apk-in apk/base.apk --apk-out apk/patched.apk --workdir patch/work --src patch/src
 *
 * Шаги:
 *   1. apktool d -s   -> work/decoded (ресурсы + smali, без dex)
 *   2. javac (JDK21)  -> work/classes (.class)
 *   3. d8             -> work/patch.dex
 *   4. inject: манифест (provider+activity) + patch.dex как classesN.dex
 *   5. apktool b      -> patched-unsigned.apk
 *   6. zipalign + apksigner
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { applySmaliPatch, applyStringPatch } = require("./smali_patch.js");

const CONFIG = {
  javac: String.raw`C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot\bin\javac.exe`,
  java: String.raw`D:\code\reversandroid\01_tools\jre\bin\java.exe`,
  apktool: String.raw`D:\code\reversandroid\01_tools\apktool_3.0.3.jar`,
  d8: String.raw`D:\code\mobile\build-tools\36.0.0\d8.bat`,
  zipalign: String.raw`D:\code\mobile\build-tools\36.0.0\zipalign.exe`,
  apksigner: String.raw`D:\code\mobile\build-tools\36.0.0\apksigner.bat`,
  androidJar: String.raw`D:\code\mobile\platforms\android-36\android.jar`,
  keytool: String.raw`C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot\bin\keytool.exe`,
  keystore: String.raw`D:\code\reverssdeepsek\patch\release.keystore`,
  ksAlias: "deepseekpatch",
  ksPass: "patchpass",
};

const MARKER = "deepseek_patch_marker";
const PROVIDER_AUTHORITY = "com.deepseek.chat.patchinit";

const MANIFEST_SNIPPET = [
  '        <!-- ' + MARKER + ' begin -->',
  '        <provider',
  '            android:name="com.deepseek.chat.patch.PatchInit"',
  '            android:authorities="' + PROVIDER_AUTHORITY + '"',
  '            android:exported="false"',
  '            android:initOrder="1000" />',
  '        <activity',
  '            android:name="com.deepseek.chat.patch.PatchSettingsActivity"',
  '            android:exported="true"',
  '            android:theme="@android:style/Theme.Material.Light.NoActionBar" />',
  '        <!-- ' + MARKER + ' end -->',
  '',
].join("\n");

function run(cmd, args, opts = {}) {
  console.log(">>", cmd, args.join(" "));
  const isBat = /\.bat$/i.test(cmd);
  try {
    const out = execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], shell: isBat, ...opts });
    if (out && out.trim()) console.log(out.trim().slice(-3000));
    return out;
  } catch (e) {
    const so = (e.stdout || "").toString();
    const se = (e.stderr || "").toString();
    if (so.trim()) console.log(so.trim().slice(-3000));
    if (se.trim()) console.log(se.trim().slice(-3000));
    if (opts.allowFail) return "";
    throw new Error("command failed: " + cmd + " " + args.join(" "));
  }
}

function walk(dir, ext, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, ext, acc);
    else if (ent.name.endsWith(ext)) acc.push(p);
  }
  return acc;
}

function decode(apk, out) {
  if (fs.existsSync(out)) fs.rmSync(out, { recursive: true, force: true });
  run(CONFIG.java, ["-jar", CONFIG.apktool, "d", "-f", "-o", out, apk]);
}

function injectManifest(decoded) {
  const p = path.join(decoded, "AndroidManifest.xml");
  let xml = fs.readFileSync(p, "utf8");
  if (xml.includes(MARKER)) {
    console.log("manifest: marker already present, skip");
    return;
  }
  const m = xml.match(/<application\b[^>]*>/);
  if (!m) throw new Error("manifest: <application> not found");
  const at = m.index + m[0].length;
  xml = xml.slice(0, at) + "\n" + MANIFEST_SNIPPET + xml.slice(at);
  fs.writeFileSync(p, xml, "utf8");
  console.log("manifest: injected provider + activity");
}

function injectDex(decoded, dexPath) {
  if (!fs.existsSync(dexPath)) throw new Error("dex not found: " + dexPath);
  // apktool раскладывает dex по smali/ + smali_classesN/. Наш dex должен идти
  // ПОСЛЕ максимального smali_classesN, иначе apktool b перезапишет чужой smali.
  let maxN = 1; // smali/ == classes.dex == N=1
  for (const ent of fs.readdirSync(decoded, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const m = ent.name.match(/^smali_classes(\d+)$/);
    if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
  }
  const target = path.join(decoded, "classes" + (maxN + 1) + ".dex");
  if (fs.existsSync(target)) throw new Error("dex target already exists: " + target);
  fs.copyFileSync(dexPath, target);
  console.log("dex: added", target);
}

function compileJava(src, workdir) {
  const classesDir = path.join(workdir, "classes");
  if (fs.existsSync(classesDir)) fs.rmSync(classesDir, { recursive: true, force: true });
  fs.mkdirSync(classesDir, { recursive: true });
  const srcs = walk(src, ".java");
  if (!srcs.length) throw new Error("no .java sources");
  run(CONFIG.javac, ["-source", "8", "-target", "8", "-classpath", CONFIG.androidJar, "-d", classesDir, ...srcs]);
  return classesDir;
}

function makeDex(classesDir, workdir) {
  const classFiles = walk(classesDir, ".class");
  if (!classFiles.length) throw new Error("no .class files");
  const produced = path.join(workdir, "classes.dex");
  if (fs.existsSync(produced)) fs.rmSync(produced, { force: true });
  run(CONFIG.d8, ["--min-api", "32", "--output", workdir, ...classFiles]);
  const dexOut = path.join(workdir, "patch.dex");
  if (!fs.existsSync(produced)) throw new Error("d8 did not produce classes.dex");
  fs.renameSync(produced, dexOut);
  return dexOut;
}

function ensureKeystore() {
  if (fs.existsSync(CONFIG.keystore)) return;
  fs.mkdirSync(path.dirname(CONFIG.keystore), { recursive: true });
  run(CONFIG.keytool, ["-genkeypair", "-noprompt", "-keystore", CONFIG.keystore,
    "-alias", CONFIG.ksAlias, "-keyalg", "RSA", "-keysize", "2048",
    "-validity", "10000", "-storepass", CONFIG.ksPass, "-keypass", CONFIG.ksPass,
    "-dname", "CN=DeepSeekPatch, OU=Patch, O=Patch, L=NA, S=NA, C=NA"]);
}

function sign(apkUnsigned, apkSigned) {
  const aligned = apkUnsigned + ".aligned.apk";
  run(CONFIG.zipalign, ["-f", "4", apkUnsigned, aligned]);
  run(CONFIG.apksigner, ["sign", "--ks", CONFIG.keystore, "--ks-key-alias", CONFIG.ksAlias,
    "--ks-pass", "pass:" + CONFIG.ksPass, "--key-pass", "pass:" + CONFIG.ksPass,
    "--out", apkSigned, aligned]);
  run(CONFIG.apksigner, ["verify", "--print-certs", apkSigned]);
}

function parseArgs(argv) {
  const a = {};
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (k.startsWith("--")) {
      a[k.slice(2)] = argv[i + 1];
      i++;
    } else if (!a.cmd) {
      a.cmd = k;
    }
  }
  return a;
}

function buildSplit(a) {
  for (const k of ["apk-in", "apk-out", "workdir"]) {
    if (!a[k]) { console.error("missing --" + k); process.exit(2); }
  }
  fs.mkdirSync(a.workdir, { recursive: true });
  const decoded = path.join(a.workdir, "decoded");
  console.log("== split: decode ==");
  decode(a["apk-in"], decoded);
  console.log("== split: string patch ==");
  const stringResults = applyStringPatch(decoded);
  for (const s of stringResults) console.log(s);
  console.log("== split: rebuild ==");
  const unsigned = path.join(a.workdir, "split-unsigned.apk");
  run(CONFIG.java, ["-jar", CONFIG.apktool, "b", decoded, "-o", unsigned]);
  console.log("== split: sign ==");
  ensureKeystore();
  sign(unsigned, a["apk-out"]);
  console.log("DONE:", a["apk-out"]);
}

function main() {
  const a = parseArgs(process.argv);
  if (a.cmd === "split") {
    buildSplit(a);
    return;
  }
  if (a.cmd !== "build") {
    console.error("usage: node patch/patcher.js build  --apk-in ... --apk-out ... --workdir ... --src ...");
    console.error("       node patch/patcher.js split  --apk-in ... --apk-out ... --workdir ...");
    process.exit(2);
  }
  for (const k of ["apk-in", "apk-out", "workdir", "src"]) {
    if (!a[k]) { console.error("missing --" + k); process.exit(2); }
  }
  fs.mkdirSync(a.workdir, { recursive: true });
  const decoded = path.join(a.workdir, "decoded");

  console.log("== 1. decode ==");
  decode(a["apk-in"], decoded);
  console.log("== 1b. smali patch (PairIP) ==");
  const smaliResults = applySmaliPatch(decoded);
  for (const s of smaliResults) console.log(s);
  const stringResults = applyStringPatch(decoded);
  for (const s of stringResults) console.log(s);
  console.log("== 2. compile java ==");
  const classesDir = compileJava(a.src, a.workdir);
  console.log("== 3. d8 ==");
  const dex = makeDex(classesDir, a.workdir);
  console.log("== 4. inject ==");
  injectManifest(decoded);
  injectDex(decoded, dex);
  console.log("== 5. rebuild ==");
  const unsigned = path.join(a.workdir, "patched-unsigned.apk");
  run(CONFIG.java, ["-jar", CONFIG.apktool, "b", decoded, "-o", unsigned]);
  console.log("== 6. sign ==");
  ensureKeystore();
  sign(unsigned, a["apk-out"]);
  console.log("DONE:", a["apk-out"]);
}

main();
