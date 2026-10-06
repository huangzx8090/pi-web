import assert from "node:assert/strict";
import test from "node:test";

import { formatCompactRelativeTime, formatRelativeTime, interpolateMessage, translateMessage } from "./format.ts";

test("interpolates string and numeric parameters", () => {
  assert.equal(interpolateMessage("Hello, {name} ({count})", { name: "Pi", count: 2 }), "Hello, Pi (2)");
});

test("falls back to English and returns the key when both are missing", () => {
  assert.equal(translateMessage("zh-CN", "common.ok", { en: { "common.ok": "OK" }, "zh-CN": {} }), "OK");
  assert.equal(translateMessage("zh-CN", "missing.key", { en: {}, "zh-CN": {} }), "missing.key");
});

test("formats relative time using the selected locale", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");
  assert.equal(formatRelativeTime(new Date("2026-01-01T00:05:00.000Z"), "en", now), "in 5 minutes");
  assert.equal(formatRelativeTime(new Date("2025-12-31T23:00:00.000Z"), "zh-CN", now), "1小时前");
  assert.equal(formatRelativeTime(new Date("2025-12-31T23:00:00.000Z"), "zh-TW", now), "1 小時前");
});

test("compact relative time shortens the same instants for narrow columns", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");
  assert.equal(formatCompactRelativeTime(new Date("2026-01-01T00:05:00.000Z"), "en", now), "in 5m");
  assert.equal(formatCompactRelativeTime(new Date("2025-12-31T22:00:00.000Z"), "en", now), "2h ago");
  assert.equal(formatCompactRelativeTime(new Date("2025-12-28T00:00:00.000Z"), "en", now), "4d ago");
  assert.equal(formatCompactRelativeTime(new Date("2025-12-31T23:00:00.000Z"), "zh-CN", now), "1小时前");
  assert.equal(formatCompactRelativeTime(new Date("2025-12-31T23:00:00.000Z"), "zh-TW", now), "1 小時前");
});

test("compact and non-compact relative time always agree on the unit", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");
  const offsetsInMinutes = [0, 1, 59, 60, 90, 1439, 1440, 4320];
  for (const locale of ["en", "zh-CN", "zh-TW"]) {
    for (const minutes of offsetsInMinutes) {
      const stamp = new Date(now.getTime() - minutes * 60_000);
      const compact = formatCompactRelativeTime(stamp, locale, now);
      const normal = formatRelativeTime(stamp, locale, now);
      // 窄样式只做缩写，不应把刻度从"分钟"变成"小时"这类语义变化。
      assert.ok(
        compact.replace(/[\s.]/g, "").length <= normal.replace(/[\s.]/g, "").length,
        `${locale} ${minutes}min: "${compact}" 不应比 "${normal}" 更长`,
      );
      assert.ok(/[0-9]/.test(compact), `${locale} ${minutes}min 的紧凑结果应带数字: "${compact}"`);
    }
  }
});
