import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(
        new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href,
        context,
      );
    }
    return nextResolve(specifier, context);
  },
});

const { getConsultations, patchConsultation, postConsultation } =
  await import("../../lib/clients/consultations.ts");
hooks.deregister();

const consultation = {
  id: "a1000000-0000-4000-8000-0000000000a1",
  studentId: "a0000000-0000-4000-8000-00000000000a",
  firstName: "Ann",
  lastName: "Able",
  reason: "Consultation",
  scheduledAt: "2099-01-01T10:00:00.000Z",
  status: "scheduled",
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-01T10:00:00.000Z",
};

test("refresh fetches an uncached list in the order returned by the API", async (t) => {
  const laterConsultation = {
    ...consultation,
    id: "a1000000-0000-4000-8000-0000000000a2",
    scheduledAt: "2099-02-01T10:00:00.000Z",
  };
  const consultations = [laterConsultation, consultation];
  const fetchMock = t.mock.method(globalThis, "fetch", async () =>
    Response.json({ consultations }),
  );

  assert.deepEqual(await getConsultations(), consultations);
  assert.deepEqual(fetchMock.mock.calls[0].arguments, [
    "/api/consultations",
    { method: "GET", cache: "no-store" },
  ]);
});

test("refresh accepts an empty list and rejects invalid response shapes", async (t) => {
  const responses = [
    Response.json({ consultations: [] }),
    new Response("not JSON"),
    Response.json({ consultations: "not a list" }),
    Response.json({ consultations: [{ id: consultation.id }] }),
  ];
  let index = 0;
  t.mock.method(globalThis, "fetch", async () => responses[index++]);

  assert.deepEqual(await getConsultations(), []);
  for (let attempt = 1; attempt < responses.length; attempt += 1) {
    await assert.rejects(
      getConsultations(),
      /server returned an invalid response/,
    );
  }
});

test("refresh surfaces server errors and network failures", async (t) => {
  const networkError = new Error("Network unavailable");
  const responses = [
    Response.json(
      { error: { message: "Sign in to continue." } },
      { status: 401 },
    ),
    Response.json({}, { status: 503 }),
  ];
  let index = 0;
  t.mock.method(globalThis, "fetch", async () => {
    if (index < responses.length) {
      return responses[index++];
    }
    throw networkError;
  });

  await assert.rejects(getConsultations(), { message: "Sign in to continue." });
  await assert.rejects(getConsultations(), {
    message: "The request failed (HTTP 503). Please try again.",
  });
  await assert.rejects(getConsultations(), (error) => error === networkError);
});

test("booking sends a POST and returns the validated consultation", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () =>
    Response.json({ consultation }, { status: 201 }),
  );
  const input = {
    firstName: consultation.firstName,
    lastName: consultation.lastName,
    reason: consultation.reason,
    scheduledAt: consultation.scheduledAt,
  };

  assert.deepEqual(await postConsultation(input), consultation);
  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(url, "/api/consultations");
  assert.equal(options.method, "POST");
  assert.equal(options.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(options.body), input);
});

test("each update sends its action and last-seen version in a PATCH", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () =>
    Response.json({ consultation }),
  );
  const actions = [
    {
      action: "setStatus",
      status: "completed",
      updatedAt: consultation.updatedAt,
    },
    {
      action: "reschedule",
      scheduledAt: "2099-02-01T10:00:00.000Z",
      updatedAt: consultation.updatedAt,
    },
    { action: "cancel", updatedAt: consultation.updatedAt },
  ];

  for (const [index, input] of actions.entries()) {
    assert.deepEqual(
      await patchConsultation(consultation.id, input),
      consultation,
    );
    const [url, options] = fetchMock.mock.calls[index].arguments;
    assert.equal(url, `/api/consultations/${consultation.id}`);
    assert.equal(options.method, "PATCH");
    assert.deepEqual(JSON.parse(options.body), input);
  }
});

test("conflict and rule errors remain visible to the caller", async (t) => {
  const responses = [
    {
      status: 409,
      message: "The consultation has changed. Refresh and try again.",
    },
    {
      status: 409,
      message: "A consultation is already scheduled for that time.",
    },
    { status: 422, message: "The consultation cannot be changed in this way." },
  ];
  let index = 0;
  t.mock.method(globalThis, "fetch", async () => {
    const response = responses[index++];
    return Response.json(
      { error: { message: response.message } },
      { status: response.status },
    );
  });

  for (const response of responses) {
    await assert.rejects(
      patchConsultation(consultation.id, {
        action: "cancel",
        updatedAt: consultation.updatedAt,
      }),
      { message: response.message },
    );
  }
});

test("invalid JSON or consultation payloads are rejected", async (t) => {
  const responses = [
    new Response("not JSON"),
    Response.json({ consultation: { id: consultation.id } }),
  ];
  let index = 0;
  t.mock.method(globalThis, "fetch", async () => responses[index++]);

  for (let attempt = 0; attempt < responses.length; attempt += 1) {
    await assert.rejects(
      patchConsultation(consultation.id, {
        action: "cancel",
        updatedAt: consultation.updatedAt,
      }),
      /server returned an invalid response/,
    );
  }
});
