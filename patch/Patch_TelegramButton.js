/**
 * Patch_TelegramButton: кнопка "Свяжитесь с нами" -> Telegram.
 *
 * Точка: конструктор WebViewRoute (класс Llrb) <init>(Ljava/lang/String;I)V.
 * Если у route isFeedbackPage (поле f) == true -> вызываем PatchTelegram.open()
 * и подставляем URL "about:blank", чтобы WebView не грузил страницу.
 *
 * Хрупкая привязка (обфусцированный класс Llrb) -> при несовпадении громко падаем.
 */
const fs = require("fs");
const path = require("path");

const MARKER = "# deepseek_patch_telegram_button";
const TARGET_FILE_HINT = path.join("lrb.smali");
const CTOR_SIG = ".method public constructor <init>(Ljava/lang/String;I)V";
const F_FIELD = "Llrb;->f:Z";
const A_FIELD = "Llrb;->a:Ljava/lang/String;";

const INJECT = [
  "    " + MARKER,
  "    iget-boolean v1, p0, Llrb;->f:Z",
  "    if-eqz v1, :patch_tg_skip",
  "    invoke-static {}, Lcom/deepseek/chat/patch/PatchTelegram;->open()V",
  '    const-string v1, "about:blank"',
  "    iput-object v1, p0, Llrb;->a:Ljava/lang/String;",
  "    :patch_tg_skip",
];

function findLrb(decodedDir) {
  for (const dexDir of fs.readdirSync(decodedDir)) {
    if (!dexDir.startsWith("smali")) continue;
    const cand = path.join(decodedDir, dexDir, TARGET_FILE_HINT);
    if (!fs.existsSync(cand)) continue;
    const text = fs.readFileSync(cand, "utf8");
    // Убедимся, что это нужный класс (а не случайный lrb.smali иного назначения).
    if (text.includes(F_FIELD) && text.includes(CTOR_SIG)) return cand;
  }
  return null;
}

function apply(decodedDir) {
  const results = [];
  const file = findLrb(decodedDir);
  if (!file) {
    // громкий фейл: структура изменилась, патч не применим
    throw new Error(
      "Patch_TelegramButton: не найден Llrb.smali с полем f и конструктором " + CTOR_SIG
    );
  }

  const lines = fs.readFileSync(file, "utf8").split("\n");

  // найти начало конструктора
  let ctorStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === CTOR_SIG.trim()) { ctorStart = i; break; }
  }
  if (ctorStart === -1) {
    throw new Error("Patch_TelegramButton: конструктор не найден в " + file);
  }

  // границы метода: .end method
  let ctorEnd = -1;
  for (let i = ctorStart; i < lines.length; i++) {
    if (lines[i].trim() === ".end method") { ctorEnd = i; break; }
  }
  if (ctorEnd === -1) throw new Error("Patch_TelegramButton: .end method не найден");

  // уже пропатчен?
  for (let i = ctorStart; i < ctorEnd; i++) {
    if (lines[i].includes(MARKER)) {
      results.push("TelegramButton: already patched");
      return results;
    }
  }

  // найти строку iput-boolean ... Llrb;->f:Z внутри конструктора (после неё ставим блок)
  let insertAt = -1;
  for (let i = ctorStart; i < ctorEnd; i++) {
    if (lines[i].includes("iput-boolean") && lines[i].includes(F_FIELD)) { insertAt = i + 1; break; }
  }
  if (insertAt === -1) {
    throw new Error("Patch_TelegramButton: не найдено присваивание Llrb;->f в конструкторе");
  }

  // нужен .locals >= 2 (используем v1). Проверим и поднимем при необходимости.
  const localsIdx = (() => {
    for (let i = ctorStart; i < insertAt; i++) if (lines[i].trim().startsWith(".locals")) return i;
    return -1;
  })();
  if (localsIdx === -1) throw new Error("Patch_TelegramButton: .locals не найден");
  const cur = parseInt(lines[localsIdx].trim().split(/\s+/)[1] || "0", 10);
  if (cur < 2) lines[localsIdx] = "    .locals 2";

  const newLines = lines.slice(0, insertAt).concat(INJECT, lines.slice(insertAt));
  fs.writeFileSync(file, newLines.join("\n"), "utf8");
  results.push("TelegramButton: patched " + path.basename(file));
  return results;
}

module.exports = { apply, MARKER };
