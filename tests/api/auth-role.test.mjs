import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test, { mock } from "node:test";

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
    return nextResolve(specifier, context);
  },
});

const { getUserRole } = await import("../../lib/dal/auth.ts");
hooks.deregister();

function createUser(result) {
  const query = {
    select: mock.fn(() => query),
    eq: mock.fn(() => query),
    single: mock.fn(() => Promise.resolve(result)),
  };
  const supabase = { from: mock.fn(() => query) };

  return {
    user: { supabase, userId: "a0000000-0000-4000-8000-00000000000a" },
    supabase,
    query,
  };
}

test("reads the authenticated user's role from their profile", async () => {
  for (const role of ["student", "admin"]) {
    const { user, supabase, query } = createUser({
      data: { role },
      error: null,
    });

    assert.equal(await getUserRole(user), role);
    assert.deepEqual(supabase.from.mock.calls[0].arguments, ["profiles"]);
    assert.deepEqual(query.select.mock.calls[0].arguments, ["role"]);
    assert.deepEqual(query.eq.mock.calls[0].arguments, ["id", user.userId]);
    assert.equal(query.single.mock.callCount(), 1);
  }
});

test("does not default to a role when the profile query fails", async () => {
  const databaseError = { code: "PGRST116", message: "Profile not found" };
  const { user } = createUser({ data: null, error: databaseError });

  await assert.rejects(getUserRole(user), (error) => {
    assert.equal(error.message, "Could not load user role.");
    assert.equal(error.cause, databaseError);
    return true;
  });
});
