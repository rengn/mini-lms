import assert from "node:assert/strict";
import test, { mock } from "node:test";

import HttpStatusCodes from "http-status-codes";

import { withSameOrigin } from "../../lib/api/with-same-origin.ts";

function requestWithOrigin(origin) {
  const headers = origin === undefined ? {} : { origin };
  return new Request("https://lms.example/api/resource", { headers });
}

test("allows a matching origin and preserves the request context", async () => {
  const context = {
    request: requestWithOrigin("https://lms.example"),
    userId: "student",
  };
  const expected = Response.json({ ok: true });
  const handler = mock.fn((receivedContext) => {
    assert.equal(receivedContext, context);
    return Promise.resolve(expected);
  });

  assert.equal(await withSameOrigin(handler)(context), expected);
  assert.equal(handler.mock.callCount(), 1);
});

test("rejects a missing, opaque, or cross-site origin without invoking the handler", async () => {
  const handler = mock.fn(() => Promise.resolve(Response.json({ ok: true })));
  const wrapped = withSameOrigin(handler);

  for (const origin of [undefined, "null", "https://attacker.example"]) {
    const response = await wrapped({ request: requestWithOrigin(origin) });
    assert.equal(response.status, HttpStatusCodes.FORBIDDEN);
    assert.deepEqual(await response.json(), {
      error: {
        code: "ORIGIN_NOT_ALLOWED",
        message: "Request origin is not allowed.",
      },
    });
  }
  assert.equal(handler.mock.callCount(), 0);
});
