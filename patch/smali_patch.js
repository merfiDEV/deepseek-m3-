/**
 * Агрегатор патчей. Подключает модули Patch_* и применяет их по порядку.
 * Совместимый API: applySmaliPatch(decoded) и applyStringPatch(decoded).
 */
const PairIP = require("./Patch_PairIP.js");
const Developer = require("./Patch_Developer.js");

const MARKER = PairIP.MARKER;

function applySmaliPatch(decodedDir) {
  return PairIP.apply(decodedDir);
}

function applyStringPatch(decodedDir) {
  const results = [];
  results.push(...Developer.apply(decodedDir));
  return results;
}

module.exports = { applySmaliPatch, applyStringPatch, MARKER };
