import assert from "node:assert/strict";
import test from "node:test";

import HttpStatusCodes from "http-status-codes";
import { z } from "zod";

import { withValidatedBody } from "../../lib/api/with-validated-body.ts";

function jsonRequest(body) {
  return new Request("http://localhost/api/example", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

test("passes transformed body and the original context, reading JSON once", async (t) => {
  const request = jsonRequest({ name: " Ann ", ignored: true });
  const readBody = t.mock.method(request, "json", request.json.bind(request));
  const context = {
    request,
    userId: "student",
    routeContext: { params: Promise.resolve({ id: "example" }) },
  };
  const expected = Response.json({ ok: true });
  const handler = t.mock.fn((receivedContext, body) => {
    assert.equal(receivedContext, context);
    assert.deepEqual(body, { name: "Ann" });
    return Promise.resolve(expected);
  });
  const wrapped = withValidatedBody(
    z.object({ name: z.string().trim() }),
    handler,
  );

  assert.equal(await wrapped(context), expected);
  assert.equal(readBody.mock.callCount(), 1);
  assert.equal(handler.mock.callCount(), 1);
});

test("returns JSON 400 for malformed or empty JSON without invoking the handler", async (t) => {
  const handler = t.mock.fn();
  const wrapped = withValidatedBody(z.object({ name: z.string() }), handler);

  for (const body of ["{", ""]) {
    const response = await wrapped({
      request: new Request("http://localhost/api/example", {
        method: "POST",
        body,
      }),
    });
    assert.equal(response.status, HttpStatusCodes.BAD_REQUEST);
    assert.deepEqual(await response.json(), {
      error: {
        code: "INVALID_JSON",
        message: "Request body must be valid JSON.",
      },
    });
  }
  assert.equal(handler.mock.callCount(), 0);
});

test("returns JSON 400 with field details for invalid input without invoking the handler", async (t) => {
  const handler = t.mock.fn();
  const wrapped = withValidatedBody(
    z.object({ student: z.object({ name: z.string() }) }),
    handler,
  );
  const response = await wrapped({
    request: jsonRequest({ student: { name: 42 } }),
  });
  assert.equal(response.status, HttpStatusCodes.BAD_REQUEST);
  const { error } = await response.json();
  assert.equal(error.code, "INVALID_INPUT");
  assert.equal(error.message, "Request body is invalid.");
  assert.equal(error.details[0].path, "student.name");
  assert.equal(typeof error.details[0].message, "string");
  assert.equal(handler.mock.callCount(), 0);
});

test("supports asynchronous Zod transforms", async () => {
  const schema = z.object({
    name: z.string().transform((name) => Promise.resolve(name.toUpperCase())),
  });
  const wrapped = withValidatedBody(schema, (_context, body) =>
    Promise.resolve(Response.json(body)),
  );
  const response = await wrapped({ request: jsonRequest({ name: "Ann" }) });
  assert.deepEqual(await response.json(), { name: "ANN" });
});

test("propagates unexpected body-read, schema and handler errors", async (t) => {
  const failure = new Error("Unexpected failure");
  const request = jsonRequest({});
  t.mock.method(request, "json", () => Promise.reject(failure));
  const wrapped = withValidatedBody(z.object({}), () =>
    Promise.resolve(Response.json({})),
  );
  await assert.rejects(wrapped({ request }), (error) => error === failure);

  const failingSchema = z.object({}).transform(() => {
    throw failure;
  });
  const schemaWrapped = withValidatedBody(failingSchema, () =>
    Promise.resolve(Response.json({})),
  );
  await assert.rejects(
    schemaWrapped({ request: jsonRequest({}) }),
    (error) => error === failure,
  );

  const failingHandler = withValidatedBody(z.object({}), () =>
    Promise.reject(failure),
  );
  await assert.rejects(
    failingHandler({ request: jsonRequest({}) }),
    (error) => error === failure,
  );
});
