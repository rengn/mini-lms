import assert from "node:assert/strict";
import test from "node:test";

import {
  formatScheduledAt,
  getLocalDateTimeMinimum,
  toFutureISOString,
} from "../../lib/utils.ts";

test("the minimum is the next whole local minute", () => {
  const minute = new Date(2099, 0, 1, 12, 34, 0).getTime();
  const laterInMinute = new Date(2099, 0, 1, 12, 34, 59, 999).getTime();
  const beforeMidnight = new Date(2099, 0, 1, 23, 59, 30).getTime();

  assert.equal(getLocalDateTimeMinimum(minute), "2099-01-01T12:35");
  assert.equal(getLocalDateTimeMinimum(laterInMinute), "2099-01-01T12:35");
  assert.equal(getLocalDateTimeMinimum(beforeMidnight), "2099-01-02T00:00");
});

test("local input is converted to the corresponding absolute instant", () => {
  const expected = new Date(2099, 6, 1, 9, 30).toISOString();
  assert.equal(toFutureISOString("2099-07-01T09:30"), expected);
});

test("invalid and past local times are rejected", () => {
  assert.throws(() => toFutureISOString("not a date"), /valid local date/);
  assert.throws(() => toFutureISOString("2000-01-01T12:00"), /in the future/);
});

test("daylight-saving gaps are rejected and repeated times use the earlier occurrence", () => {
  const previousTimezone = process.env.TZ;
  process.env.TZ = "America/New_York";

  try {
    assert.throws(
      () => toFutureISOString("2024-03-10T02:30"),
      /valid local date/,
    );
    assert.equal(
      toFutureISOString("2099-11-01T01:30"),
      "2099-11-01T05:30:00.000Z",
    );
  } finally {
    if (previousTimezone === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = previousTimezone;
    }
  }
});

test("server-side date formatting is deterministic", () => {
  const value = "2030-01-01T00:00:00.000Z";
  assert.equal(formatScheduledAt(value, false), new Date(value).toUTCString());
});
