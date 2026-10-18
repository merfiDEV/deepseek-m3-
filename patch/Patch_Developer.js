/**
 * Patch_Developer: строки интерфейса для "разработческого" режима.
 *  - "Свяжитесь с нами" -> "Разработчик мода"
 *  - плейсхолдер email/телефона на экране входа
 */
const path = require("path");
const { applyRules } = require("./Patch_Strings.js");

const RU = path.join("res", "values-ru", "strings.xml");

const RULES = [
  { fileHint: RU, name: "email_phone_placeholder", value: "Введи свой эмэйл / или номер 380\u2764\ufe0f" },
  { fileHint: RU, name: "profile_contact", value: "Разработчик мода" },
  { fileHint: RU, name: "intercom_entry", value: "Разработчик мода" },
];

function apply(decodedDir) {
  return applyRules(decodedDir, RULES, "Developer");
}

module.exports = { apply };
