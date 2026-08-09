const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
const game = fs.readFileSync(path.join(root, "public", "game.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "public", "styles.css"), "utf8");

test("клиент подключает все обязательные файлы без встроенных patch-скриптов", () => {
  for (const asset of ["styles.css", "core.js", "game.js"]) {
    assert.ok(fs.existsSync(path.join(root, "public", asset)), `${asset} должен существовать`);
    assert.match(html, new RegExp(`(?:href|src)=["']${asset.replace(".", "\\.")}`));
  }
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/i);
});

test("идентификаторы основных экранов уникальны", () => {
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const requiredId of ["bootScreen", "mainMenu", "loadScreen", "createScreen", "gameScreen", "gameNav", "page"]) {
    assert.ok(ids.includes(requiredId), `нет экрана или узла ${requiredId}`);
  }
});

test("все обработчики кнопок существуют в игровом runtime", () => {
  const handlers = new Set(
    [...`${html}\n${game}`.matchAll(/onclick=["']([A-Za-z_$][\w$]*)\s*\(/g)].map((match) => match[1])
  );
  for (const handler of handlers) {
    assert.match(game, new RegExp(`(?:async\\s+)?function\\s+${handler}\\s*\\(`), `не найден обработчик ${handler}`);
  }
});

test("интерфейс содержит телефонную и reduced-motion раскладки", () => {
  assert.match(styles, /@media\s*\(max-width:\s*900px\)/);
  assert.match(styles, /@media\s*\(max-width:\s*620px\)/);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(styles, /env\(safe-area-inset-bottom\)/);
});
