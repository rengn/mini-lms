import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test, { mock } from "node:test";

import HttpStatusCodes from "http-status-codes";

import { withHttpErrorHandling } from "../../lib/api/with-http-error-handling.ts";
import { createClient } from "./fixtures/supabase-server.mjs";

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { url: "data:text/javascript,export {};", shortCircuit: true };
    }
    if (specifier === "@/lib/supabase/server") {
      return {
        url: new URL("./fixtures/supabase-server.mjs", import.meta.url).href,
        shortCircuit: true,
      };
    }
    if (specifier.startsWith("@/")) {
      return nextResolve(
        new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href,
        context,
      );
    }
    return nextResolve(specifier, context);
  },
});

const { GET, POST } = await import("../../app/api/consultations/route.ts");
const { PATCH } = await import("../../app/api/consultations/[id]/route.ts");
const { withAuth } = await import("../../lib/api/with-auth.ts");
hooks.deregister();

const studentId = "a0000000-0000-4000-8000-00000000000a";
const adminId = "a0000000-0000-4000-8000-00000000000b";
const row = {
  id: "a1000000-0000-4000-8000-0000000000a1",
  student_id: studentId,
  first_name: "Ann",
  last_name: "Able",
  reason: "Consultation",
  scheduled_at: "2099-01-01T10:00:00+00:00",
  status: "scheduled",
  created_at: "2026-01-01T10:00:00+00:00",
  updated_at: "2026-01-01T10:00:00+00:00",
};
const request = new Request("http://localhost/api/consultations");
const internalErrorBody = {
  error: {
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred.",
  },
};
const bookingBody = () => ({
  firstName: " Ann ",
  lastName: " Able ",
  reason: " Consultation ",
  scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
});

function bookingRequest(body) {
  return new Request("http://localhost/api/consultations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost",
    },
    body: JSON.stringify(body),
  });
}

function updateRequest(id, body, origin = "http://localhost") {
  return new Request(`http://localhost/api/consultations/${id}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      ...(origin ? { origin } : {}),
    },
    body: JSON.stringify(body),
  });
}

function setClient({
  userId = studentId,
  rows = [],
  databaseError = null,
  insertedRow = row,
  insertError = null,
  currentRow = { id: row.id, updated_at: row.updated_at },
  lookupError = null,
  updatedRow = row,
  latestRow = currentRow,
  updateError = null,
} = {}) {
  let maybeSingleCallCount = 0;
  const query = {
    eq: mock.fn(() => query),
    insert: mock.fn(() => query),
    maybeSingle: mock.fn(() => {
      maybeSingleCallCount += 1;
      if (maybeSingleCallCount === 1) {
        return Promise.resolve({ data: currentRow, error: lookupError });
      }
      if (maybeSingleCallCount === 2) {
        return Promise.resolve({ data: updatedRow, error: updateError });
      }
      return Promise.resolve({ data: latestRow, error: lookupError });
    }),
    select: mock.fn(() => query),
    single: mock.fn(() =>
      Promise.resolve({ data: insertedRow, error: insertError }),
    ),
    update: mock.fn(() => query),
    order: mock.fn((column) =>
      column === "id"
        ? Promise.resolve({ data: rows, error: databaseError })
        : query,
    ),
  };
  const supabase = {
    auth: {
      getClaims: mock.fn(() =>
        Promise.resolve({ data: { claims: { sub: userId } }, error: null }),
      ),
    },
    from: mock.fn(() => query),
  };
  createClient.mock.resetCalls();
  createClient.mock.mockImplementation(() => Promise.resolve(supabase));
  return { supabase, query };
}

test("lists and maps RLS-visible rows without adding a student-only filter", async () => {
  for (const [userId, rows] of [
    [studentId, [row]],
    [adminId, [row, { ...row, id: adminId, student_id: adminId }]],
    [studentId, []],
  ]) {
    const { supabase, query } = setClient({ userId, rows });
    const response = await GET(request, {});
    assert.equal(response.status, HttpStatusCodes.OK);
    assert.deepEqual(await response.json(), {
      consultations: rows.map((item) => ({
        id: item.id,
        studentId: item.student_id,
        firstName: item.first_name,
        lastName: item.last_name,
        reason: item.reason,
        scheduledAt: item.scheduled_at,
        status: item.status,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      })),
    });
    assert.equal(createClient.mock.callCount(), 1);
    assert.equal(supabase.auth.getClaims.mock.callCount(), 1);
    assert.deepEqual(supabase.from.mock.calls[0].arguments, ["consultations"]);
    assert.deepEqual(query.select.mock.calls[0].arguments, [
      "id, student_id, first_name, last_name, reason, scheduled_at, status, created_at, updated_at",
    ]);
    assert.deepEqual(
      query.order.mock.calls.map((call) => call.arguments),
      [["scheduled_at"], ["id"]],
    );
  }
});

test("books a consultation with normalized fields and returns 201", async () => {
  const body = bookingBody();
  const insertedRow = {
    ...row,
    first_name: "Ann",
    last_name: "Able",
    reason: "Consultation",
    scheduled_at: body.scheduledAt,
  };
  const { supabase, query } = setClient({ insertedRow });

  const response = await POST(bookingRequest(body), {});
  assert.equal(response.status, HttpStatusCodes.CREATED);
  assert.deepEqual(await response.json(), {
    consultation: {
      id: insertedRow.id,
      studentId: insertedRow.student_id,
      firstName: insertedRow.first_name,
      lastName: insertedRow.last_name,
      reason: insertedRow.reason,
      scheduledAt: insertedRow.scheduled_at,
      status: insertedRow.status,
      createdAt: insertedRow.created_at,
      updatedAt: insertedRow.updated_at,
    },
  });
  assert.equal(supabase.auth.getClaims.mock.callCount(), 1);
  assert.deepEqual(supabase.from.mock.calls[0].arguments, ["consultations"]);
  assert.deepEqual(query.insert.mock.calls[0].arguments, [
    {
      first_name: "Ann",
      last_name: "Able",
      reason: "Consultation",
      scheduled_at: body.scheduledAt,
    },
  ]);
  assert.deepEqual(query.select.mock.calls[0].arguments, [
    "id, student_id, first_name, last_name, reason, scheduled_at, status, created_at, updated_at",
  ]);
  assert.equal(query.single.mock.callCount(), 1);
});

test("rejects malformed JSON and invalid booking fields without querying", async () => {
  const { supabase } = setClient();
  const malformedJson = new Request("http://localhost/api/consultations", {
    method: "POST",
    headers: { origin: "http://localhost" },
    body: "{",
  });
  let response = await POST(malformedJson, {});
  assert.equal(response.status, HttpStatusCodes.BAD_REQUEST);
  assert.deepEqual(await response.json(), {
    error: {
      code: "INVALID_JSON",
      message: "Request body must be valid JSON.",
    },
  });

  for (const body of [
    { ...bookingBody(), firstName: " " },
    { ...bookingBody(), lastName: "x".repeat(101) },
    { ...bookingBody(), reason: "" },
    { ...bookingBody(), scheduledAt: "2099-01-01T10:00:00" },
    { ...bookingBody(), scheduledAt: "2000-01-01T10:00:00Z" },
    null,
  ]) {
    response = await POST(bookingRequest(body), {});
    assert.equal(response.status, HttpStatusCodes.BAD_REQUEST);
    assert.equal((await response.json()).error.code, "INVALID_INPUT");
  }
  assert.equal(supabase.from.mock.callCount(), 0);
});

test("returns 401 for unauthenticated booking attempts without reading the body or querying", async (t) => {
  const { supabase } = setClient();
  supabase.auth.getClaims.mock.mockImplementation(() =>
    Promise.resolve({ data: null, error: new Error("Invalid token") }),
  );
  const request = bookingRequest(bookingBody());
  const readBody = t.mock.method(request, "json");
  const response = await POST(request, {});
  assert.equal(response.status, HttpStatusCodes.UNAUTHORIZED);
  assert.equal(readBody.mock.callCount(), 0);
  assert.equal(supabase.from.mock.callCount(), 0);
});

test("rejects cross-origin and missing-origin booking requests before reading the body", async (t) => {
  const { supabase } = setClient();

  for (const origin of ["https://attacker.example", undefined]) {
    const request = bookingRequest(bookingBody());
    if (origin === undefined) {
      request.headers.delete("origin");
    } else {
      request.headers.set("origin", origin);
    }
    const readBody = t.mock.method(request, "json");
    const response = await POST(request, {});
    assert.equal(response.status, HttpStatusCodes.FORBIDDEN);
    assert.equal((await response.json()).error.code, "ORIGIN_NOT_ALLOWED");
    assert.equal(readBody.mock.callCount(), 0);
  }
  assert.equal(supabase.from.mock.callCount(), 0);
});

test("updates status, reschedules and cancels using the supplied version", async () => {
  const rescheduledAt = new Date(Date.now() + 172_800_000).toISOString();
  const actions = [
    {
      body: {
        action: "setStatus",
        status: "completed",
        updatedAt: row.updated_at,
      },
      changes: { status: "completed" },
      updatedRow: { ...row, status: "completed" },
    },
    {
      body: {
        action: "reschedule",
        scheduledAt: rescheduledAt,
        updatedAt: row.updated_at,
      },
      changes: {
        scheduled_at: rescheduledAt,
      },
      updatedRow: {
        ...row,
        scheduled_at: rescheduledAt,
      },
    },
    {
      body: { action: "cancel", updatedAt: row.updated_at },
      changes: { status: "cancelled" },
      updatedRow: { ...row, status: "cancelled" },
    },
  ];

  for (const action of actions) {
    const { query } = setClient({ updatedRow: action.updatedRow });
    const response = await PATCH(updateRequest(row.id, action.body), {
      params: Promise.resolve({ id: row.id }),
    });
    assert.equal(response.status, HttpStatusCodes.OK);
    const result = (await response.json()).consultation;
    assert.equal(result.status, action.updatedRow.status);
    assert.equal(result.scheduledAt, action.updatedRow.scheduled_at);
    assert.deepEqual(query.update.mock.calls[0].arguments, [action.changes]);
    assert.deepEqual(
      query.eq.mock.calls.map((call) => call.arguments),
      [
        ["id", row.id],
        ["id", row.id],
        ["updated_at", row.updated_at],
      ],
    );
  }
});

test("returns 400 for invalid consultation IDs or update bodies", async () => {
  const { supabase } = setClient();
  const invalidIdResponse = await PATCH(
    updateRequest("not-a-guid", {
      action: "cancel",
      updatedAt: row.updated_at,
    }),
    { params: Promise.resolve({ id: "not-a-guid" }) },
  );
  assert.equal(invalidIdResponse.status, HttpStatusCodes.BAD_REQUEST);
  assert.equal((await invalidIdResponse.json()).error.code, "INVALID_ID");

  const invalidBodyResponse = await PATCH(
    updateRequest(row.id, {
      action: "reschedule",
      scheduledAt: "2099-01-01T10:00:00",
      updatedAt: row.updated_at,
    }),
    { params: Promise.resolve({ id: row.id }) },
  );
  assert.equal(invalidBodyResponse.status, HttpStatusCodes.BAD_REQUEST);
  assert.equal((await invalidBodyResponse.json()).error.code, "INVALID_INPUT");

  const scheduledStatusResponse = await PATCH(
    updateRequest(row.id, {
      action: "setStatus",
      status: "scheduled",
      updatedAt: row.updated_at,
    }),
    { params: Promise.resolve({ id: row.id }) },
  );
  assert.equal(scheduledStatusResponse.status, HttpStatusCodes.BAD_REQUEST);
  assert.equal(
    (await scheduledStatusResponse.json()).error.code,
    "INVALID_INPUT",
  );
  assert.equal(supabase.from.mock.callCount(), 0);
});

test("maps missing, stale and database-rejected consultation updates", async () => {
  const cases = [
    {
      options: { currentRow: null },
      status: HttpStatusCodes.NOT_FOUND,
      code: "NOT_FOUND",
      updates: 0,
    },
    {
      options: {
        currentRow: { id: row.id, updated_at: "2026-01-02T00:00:00Z" },
      },
      status: HttpStatusCodes.CONFLICT,
      code: "CONSULTATION_CONFLICT",
      message: "The consultation has changed. Refresh and try again.",
      updates: 0,
    },
    {
      options: {
        updatedRow: null,
        latestRow: {
          id: row.id,
          updated_at: "2026-01-02T00:00:00Z",
        },
      },
      status: HttpStatusCodes.CONFLICT,
      code: "CONSULTATION_CONFLICT",
      message: "The consultation has changed. Refresh and try again.",
      updates: 1,
    },
    {
      options: { updatedRow: null },
      status: HttpStatusCodes.FORBIDDEN,
      code: "FORBIDDEN",
      updates: 1,
    },
    {
      options: { updateError: { code: "42501", message: "RLS denied" } },
      status: HttpStatusCodes.FORBIDDEN,
      code: "FORBIDDEN",
      updates: 1,
    },
    {
      options: { updateError: { code: "23514", message: "trigger rejected" } },
      status: HttpStatusCodes.UNPROCESSABLE_ENTITY,
      code: "INVALID_CONSULTATION",
      updates: 1,
    },
    {
      options: { updateError: { code: "23505", message: "unique constraint" } },
      status: HttpStatusCodes.CONFLICT,
      code: "CONSULTATION_CONFLICT",
      message: "A consultation is already scheduled for that time.",
      updates: 1,
    },
  ];

  for (const item of cases) {
    const { query } = setClient(item.options);
    const response = await PATCH(
      updateRequest(row.id, {
        action: "setStatus",
        status: "completed",
        updatedAt: row.updated_at,
      }),
      { params: Promise.resolve({ id: row.id }) },
    );
    assert.equal(response.status, item.status);
    const body = await response.json();
    assert.equal(body.error.code, item.code);
    if (item.message) {
      assert.equal(body.error.message, item.message);
    }
    assert.equal(query.update.mock.callCount(), item.updates);
  }
});

test("maps database booking constraints to conflict, forbidden and validation responses", async () => {
  const expected = [
    {
      insertError: { code: "23505", message: "duplicate key" },
      status: HttpStatusCodes.CONFLICT,
      code: "CONSULTATION_CONFLICT",
    },
    {
      insertError: { code: "42501", message: "row-level security violation" },
      status: HttpStatusCodes.FORBIDDEN,
      code: "FORBIDDEN",
    },
    {
      insertError: { code: "23514", message: "check violation" },
      status: HttpStatusCodes.UNPROCESSABLE_ENTITY,
      code: "INVALID_CONSULTATION",
    },
  ];

  for (const item of expected) {
    setClient({ insertError: item.insertError });
    const response = await POST(bookingRequest(bookingBody()), {});
    assert.equal(response.status, item.status);
    assert.equal((await response.json()).error.code, item.code);
  }
});

test("unexpected booking database and returned-row validation errors become generic 500 responses", async (t) => {
  const logger = t.mock.method(console, "error", () => {});

  setClient({
    insertError: { code: "08006", message: "Internal database details" },
  });
  let response = await POST(bookingRequest(bookingBody()), {});
  assert.equal(response.status, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  assert.deepEqual(await response.json(), internalErrorBody);

  setClient({ insertedRow: { ...row, status: "invalid" } });
  response = await POST(bookingRequest(bookingBody()), {});
  assert.equal(response.status, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  assert.deepEqual(await response.json(), internalErrorBody);
  assert.equal(logger.mock.callCount(), 2);
});

test("returns the existing JSON 401 without querying for unauthenticated callers", async () => {
  for (const authResult of [
    { data: null, error: null },
    { data: { claims: {} }, error: null },
    { data: null, error: new Error("Invalid token") },
  ]) {
    const { supabase } = setClient();
    supabase.auth.getClaims.mock.mockImplementation(() =>
      Promise.resolve(authResult),
    );
    const response = await GET(request, {});
    assert.equal(response.status, HttpStatusCodes.UNAUTHORIZED);
    assert.deepEqual(await response.json(), {
      error: { code: "UNAUTHENTICATED", message: "Sign in to continue." },
    });
    assert.equal(supabase.from.mock.callCount(), 0);
  }
});

test("database and row-validation failures become logged, generic JSON 500 responses", async (t) => {
  const logger = t.mock.method(console, "error", () => {});
  for (const options of [
    {
      databaseError: {
        code: "42501",
        message: "Internal database details",
      },
    },
    { rows: [{ ...row, status: "invalid" }] },
    { rows: null },
  ]) {
    setClient(options);
    const response = await GET(request, {});
    assert.equal(response.status, HttpStatusCodes.INTERNAL_SERVER_ERROR);
    assert.deepEqual(await response.json(), internalErrorBody);
  }
  assert.equal(logger.mock.callCount(), 3);
});

test("the outer error boundary catches client creation and authentication rejections", async (t) => {
  const logger = t.mock.method(console, "error", () => {});
  setClient();
  createClient.mock.mockImplementation(() =>
    Promise.reject(new Error("Missing server configuration")),
  );
  let response = await GET(request, {});
  assert.equal(response.status, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  assert.deepEqual(await response.json(), internalErrorBody);

  const { supabase } = setClient();
  supabase.auth.getClaims.mock.mockImplementation(() =>
    Promise.reject(new Error("Unexpected auth failure")),
  );
  response = await GET(request, {});
  assert.equal(response.status, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  assert.deepEqual(await response.json(), internalErrorBody);
  assert.equal(supabase.from.mock.callCount(), 0);
  assert.equal(logger.mock.callCount(), 2);
});

test("withAuth preserves the request, dynamic route context and authenticated client", async () => {
  const { supabase } = setClient();
  const context = { params: Promise.resolve({ id: row.id }) };
  const handler = withAuth(async (user) => {
    assert.equal(user.request, request);
    assert.equal(user.routeContext, context);
    assert.deepEqual(await user.routeContext.params, { id: row.id });
    assert.equal(user.supabase, supabase);
    assert.equal(user.userId, studentId);
    return Response.json({ ok: true });
  });
  const response = await handler(request, context);
  assert.deepEqual(await response.json(), { ok: true });
});

test("withAuth does not handle errors; the composed error wrapper does", async (t) => {
  const logger = t.mock.method(console, "error", () => {});
  setClient();
  const failing = () => Promise.reject(new Error("Private handler details"));

  await assert.rejects(withAuth(failing)(request, {}), {
    message: "Private handler details",
  });
  assert.equal(logger.mock.callCount(), 0);

  const response = await withHttpErrorHandling(withAuth(failing))(request, {});
  assert.equal(response.status, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  assert.deepEqual(await response.json(), internalErrorBody);
  assert.equal(logger.mock.callCount(), 1);
});

test("the error wrapper preserves ordinary responses and arguments", async () => {
  const context = { params: Promise.resolve({ id: row.id }) };
  const expected = Response.json(
    { error: { code: "INVALID_INPUT", message: "Invalid input." } },
    { status: HttpStatusCodes.BAD_REQUEST },
  );
  const handler = withHttpErrorHandling((receivedRequest, receivedContext) => {
    assert.equal(receivedRequest, request);
    assert.equal(receivedContext, context);
    return Promise.resolve(expected);
  });
  assert.equal(await handler(request, context), expected);
});

test("the error wrapper catches synchronous exceptions, rejections and non-Error values", async (t) => {
  const logger = t.mock.method(console, "error", () => {});
  const failedRequest = new Request(
    "http://localhost/api/consultations?private=value",
    { method: "POST" },
  );
  const failures = [
    new Error("Private exception details"),
    "Private thrown string",
    { message: "Private thrown object" },
    null,
    undefined,
  ];
  for (const failure of failures) {
    for (const rejectAsync of [false, true]) {
      const handler = withHttpErrorHandling(() => {
        if (rejectAsync) {
          return Promise.reject(failure);
        }
        throw failure;
      });
      const response = await handler(failedRequest, {});
      assert.equal(response.status, HttpStatusCodes.INTERNAL_SERVER_ERROR);
      assert.deepEqual(await response.json(), internalErrorBody);
    }
  }
  assert.equal(logger.mock.callCount(), failures.length * 2);
  for (const call of logger.mock.calls) {
    assert.equal(call.arguments[0], "Unhandled API error");
    assert.equal(call.arguments[1].method, "POST");
    assert.equal(call.arguments[1].pathname, "/api/consultations");
  }
});
