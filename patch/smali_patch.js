/**
 * Агрегатор патчей. Подключает модули Patch_* и применяет их по порядку.
 * Совместимый API: applySmaliPatch(decoded) и applyStringPatch(decoded).
 *
 * Порядок применения:
 *   1. Patch_PairIP        — нейтрализация LicenseCheck
 *   2. Patch_TelegramButton — кнопка "Свяжитесь с нами" -> Telegram
 *   3. Patch_Developer     — строки (Разработчик мода, email placeholder)
 */
const PairIP = require("./Patch_PairIP.js");
const TelegramButton = require("./Patch_TelegramButton.js");
const Developer = require("./Patch_Developer.js");

const MARKER = PairIP.MARKER;

function applySmaliPatch(decodedDir) {
  const results = [];
  results.push(...PairIP.apply(decodedDir));
  results.push(...TelegramButton.apply(decodedDir));
  return results;
}

function applyStringPatch(decodedDir) {
  const results = [];
  results.push(...Developer.apply(decodedDir));
  return results;
}

module.exports = { applySmaliPatch, applyStringPatch, MARKER };
