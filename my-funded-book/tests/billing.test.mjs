import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import vm from "node:vm";
import { build } from "esbuild";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(new URL("../package.json", import.meta.url));
const user = { id: "user-a", email: "a@example.test" };
const row = { user_id: user.id, stripe_customer_id: "cus_a", stripe_subscription_id: "sub_a", status: "active", current_period_end: "2099-01-01T00:00:00.000Z" };
const stripeSub = { id: "sub_a", customer: "cus_a", status: "active", current_period_end: 4070908800, cancel_at_period_end: false, items: { data: [{ price: { id: "price_a" } }] } };

// Compile the real route/service modules in memory, replacing only external boundaries.
async function load(entry, mocks = {}) {
  mocks = { "server-only": {}, ...mocks };
  const result = await build({
    entryPoints: [path.join(root, entry)], bundle: true, write: false,
    platform: "node", format: "cjs", packages: "external", jsx: "automatic",
    plugins: [{
      name: "test-boundaries",
      setup(b) {
        b.onResolve({ filter: /.*/ }, ({ path: specifier }) => {
          if (Object.hasOwn(mocks, specifier)) return { path: specifier, namespace: "mock" };
          if (specifier.startsWith("@/")) return { path: path.join(root, specifier.slice(2) + (path.extname(specifier) ? "" : ".js")) };
        });
        b.onLoad({ filter: /.*/, namespace: "mock" }, ({ path: specifier }) => ({
          contents: Object.keys(mocks[specifier]).map((name) =>
            `export const ${name} = globalThis.__mocks[${JSON.stringify(specifier)}][${JSON.stringify(name)}];`
          ).join("\n"),
        }));
      },
    }],
  });
  const module = { exports: {} };
  vm.runInNewContext(result.outputFiles[0].text, {
    module, exports: module.exports, require, __mocks: mocks, process,
    console: { ...console, error() {} }, Response, Request, URL, setTimeout, clearTimeout,
  }, { filename: entry });
  return module.exports;
}

function auth(currentUser = user, error = null) {
  return { createServerSupabase: async () => ({
    auth: { getUser: async () => ({ data: { user: currentUser }, error }) },
  }) };
}
const next = { "next/server": { NextResponse: Response } };
function dbMocks(overrides = {}) {
  return { getSubscription: async (id) => { assert.equal(id, user.id); return row; },
    saveStripeCustomer: async () => {}, syncStripeSubscription: async () => {}, deleteSubscription: async () => {},
    markSubscriptionCanceled: async () => {}, ...overrides };
}
function routeMocks({ currentUser = user, authError = null, db = {}, stripe = {}, extra = {} } = {}) {
  return { ...next, "@/lib/supabase/server": auth(currentUser, authError),
    "@/lib/subscriptions": dbMocks(db), "@/lib/stripe": { getStripe: () => stripe }, ...extra };
}
const json = (response) => response.json();

test("access: active, trial, free access, expired, exact expiry and invalid dates", async () => {
  const { hasSubscriptionAccess } = await load("lib/subscription.js");
  const now = Date.parse("2026-09-09T12:00:00Z");
  assert.equal(hasSubscriptionAccess(null, now), false);
  for (const status of ["active", "trialing"]) {
    assert.equal(hasSubscriptionAccess({ status, current_period_end: "2026-09-10" }, now), true);
    assert.equal(hasSubscriptionAccess({ status, current_period_end: null }, now), true);
    for (const end of ["2026-09-08", "2026-09-09T12:00:00Z", "invalid"]) {
      assert.equal(hasSubscriptionAccess({ status, current_period_end: end }, now), false);
    }
  }
  for (const status of ["inactive", "canceled", "past_due", "unpaid"]) {
    assert.equal(hasSubscriptionAccess({ status }, now), false);
  }
});

test("summary: allowlisted fields only; scheduled cancellation preserves trial and expiry", async () => {
  const { subscriptionSummary, hasSubscriptionAccess, stripePeriodEnd } = await load("lib/subscription.js");
  const trial = { ...stripeSub, status: "trialing", cancel_at_period_end: true };
  const result = subscriptionSummary({ ...row, secret: "never expose" }, trial);
  assert.equal(result.status, "trialing");
  assert.equal(result.cancel_at_period_end, true);
  assert.equal(result.billing_details_loaded, true);
  assert.equal(hasSubscriptionAccess(result), true);
  for (const key of ["user_id", "stripe_customer_id", "stripe_subscription_id", "secret"]) assert.equal(key in result, false);
  assert.equal(stripePeriodEnd({ items: { data: [{ current_period_end: 4070908800 }] } }), result.current_period_end);
  assert.equal(subscriptionSummary(row).billing_details_loaded, false);
  assert.equal(subscriptionSummary({ ...row, stripe_subscription_id: null }).complimentary, true);
});

for (const entry of ["portal", "cancel", "subscription"]) {
  for (const mode of ["missing user", "auth error"]) {
    test(`${entry}: rejects ${mode} before any billing lookup`, async () => {
      const handler = await load(`app/api/stripe/${entry}/route.js`, routeMocks({
        currentUser: mode === "missing user" ? null : user,
        authError: mode === "auth error" ? new Error("expired session") : null,
        db: { getSubscription: () => assert.fail("must not query billing") },
      }));
      const res = await handler[entry === "subscription" ? "GET" : "POST"]();
      assert.equal(res.status, 401);
    });
  }
}

test("portal uses the authenticated user's Neon customer", async () => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://example.test/";
  const { POST } = await load("app/api/stripe/portal/route.js", routeMocks({
    stripe: { billingPortal: { sessions: { create: async (args) => {
      assert.equal(args.customer, "cus_a");
      assert.equal(args.return_url, "https://example.test/settings");
      return { url: "https://billing.stripe.com/test" };
    } } } },
  }));
  const res = await POST();
  assert.equal(res.status, 200);
  assert.equal((await json(res)).url, "https://billing.stripe.com/test");
});

test("portal reports absent customer and database failure separately", async () => {
  for (const [getSubscription, status] of [
    [async () => null, 400], [async () => { throw new Error("Neon unavailable"); }, 503],
  ]) {
    const { POST } = await load("app/api/stripe/portal/route.js", routeMocks({ db: { getSubscription } }));
    assert.equal((await POST()).status, status);
  }
});

test("cancellation schedules period end and syncs Neon without revoking access", async () => {
  let synced = false;
  const { POST } = await load("app/api/stripe/cancel/route.js", routeMocks({
    stripe: { subscriptions: { update: async (id, args) => {
      assert.equal(id, "sub_a");
      assert.equal(args.cancel_at_period_end, true);
      return { ...stripeSub, cancel_at_period_end: true };
    } } },
    db: { syncStripeSubscription: async (customer, sub) => {
      assert.equal(customer, "cus_a"); assert.equal(sub.status, "active"); synced = true;
    } },
  }));
  const res = await POST(), data = await json(res);
  assert.equal(res.status, 200);
  assert.equal(synced, true);
  assert.equal(data.subscription.status, "active");
  assert.equal(data.subscription.current_period_end, row.current_period_end);
  assert.equal(data.subscription.cancel_at_period_end, true);
});

test("cancellation does not mutate billing for a complimentary account", async () => {
  const { POST } = await load("app/api/stripe/cancel/route.js", routeMocks({
    db: { getSubscription: async () => ({ ...row, stripe_subscription_id: null }) },
  }));
  assert.equal((await POST()).status, 400);
});

test("cancellation failure is not acknowledged as success", async () => {
  const { POST } = await load("app/api/stripe/cancel/route.js", routeMocks({
    stripe: { subscriptions: { update: async () => { throw new Error("Stripe down"); } } },
  }));
  assert.equal((await POST()).status, 503);
});

test("status returns live scheduled cancellation without caching or exposing IDs", async () => {
  const { GET } = await load("app/api/stripe/subscription/route.js", routeMocks({
    stripe: { subscriptions: { retrieve: async (id) => {
      assert.equal(id, "sub_a"); return { ...stripeSub, cancel_at_period_end: true };
    } } },
  }));
  const res = await GET(), data = await json(res);
  assert.equal(res.headers.get("cache-control"), "private, no-store");
  assert.equal(data.subscription.cancel_at_period_end, true);
  assert.equal("stripe_customer_id" in data.subscription, false);
});

test("status distinguishes free access, no subscription and lookup failure", async () => {
  for (const scenario of ["free", "none", "outage"]) {
    const { GET } = await load("app/api/stripe/subscription/route.js", routeMocks({
      db: { getSubscription: async () => {
        if (scenario === "outage") throw new Error("Neon down");
        return scenario === "none" ? null : { ...row, stripe_subscription_id: null, current_period_end: null };
      } },
    }));
    const res = await GET(), data = await json(res);
    if (scenario === "outage") { assert.equal(res.status, 503); assert.equal("subscription" in data, false); }
    else if (scenario === "none") assert.equal(data.subscription, null);
    else { assert.equal(data.subscription.complimentary, true); assert.equal(data.subscription.can_cancel, false); }
  }
});

test("status exposes a Stripe outage as an error rather than reporting no subscription", async () => {
  const { GET } = await load("app/api/stripe/subscription/route.js", routeMocks({
    stripe: { subscriptions: { retrieve: async () => { throw new Error("timeout"); } } },
  }));
  assert.equal((await GET()).status, 503);
});

async function deletion({ billingFailure, dbFailure, cleanupFailure, neonDeleteFailure, authDeleteFailure, currentUser = user } = {}) {
  const events = [];
  const mocks = routeMocks({
    currentUser,
    db: {
      getSubscription: async () => { events.push("lookup"); if (dbFailure) throw Error("Neon down"); return row; },
      deleteSubscription: async (id) => { assert.equal(id, user.id); events.push("neon-delete"); if (neonDeleteFailure) throw Error("delete failed"); },
    },
    extra: { "@/lib/billing": { stopAccountBilling: async (value) => {
      assert.equal(value, row); events.push("stripe-stop"); if (billingFailure) throw Error("Stripe down");
    } } },
  });
  mocks["@/lib/supabase/server"].createAdminSupabase = () => ({
    from(table) {
      return { delete: () => ({ eq: async (key, id) => {
        assert.equal(key, "user_id"); assert.equal(id, user.id); events.push("cleanup:" + table);
        return { error: cleanupFailure ? Error("cleanup failed") : null };
      } }) };
    },
    auth: { admin: { deleteUser: async (id) => {
      assert.equal(id, user.id); events.push("auth-delete"); return { error: authDeleteFailure ? Error("auth down") : null };
    } } },
  });
  const { POST } = await load("app/api/account/delete/route.js", mocks);
  return { res: await POST(), events };
}

test("account deletion stops billing before any deletion and removes Neon before auth", async () => {
  const { res, events } = await deletion();
  assert.equal(res.status, 200);
  assert.deepEqual(events, ["lookup", "stripe-stop", "cleanup:bt_trades", "cleanup:bt_sessions", "cleanup:badge_unlocks", "neon-delete", "auth-delete"]);
});

test("account deletion rejects unauthenticated requests", async () => {
  const { res, events } = await deletion({ currentUser: null });
  assert.equal(res.status, 401); assert.deepEqual(events, []);
});

for (const failure of ["dbFailure", "billingFailure", "cleanupFailure", "neonDeleteFailure"]) {
  test(`account deletion stops before auth deletion on ${failure}`, async () => {
    const { res, events } = await deletion({ [failure]: true });
    assert.ok(res.status >= 500); assert.equal(events.includes("auth-delete"), false);
    if (failure === "dbFailure" || failure === "billingFailure") assert.equal(events.some((e) => e.startsWith("cleanup")), false);
  });
}

test("account deletion reports auth failure for retry after billing has stopped", async () => {
  const { res } = await deletion({ authDeleteFailure: true });
  assert.equal(res.status, 500);
});

test("billing shutdown iterates all subscriptions, skips terminal states and deduplicates stored ID", async () => {
  const canceled = [];
  const { stopAccountBilling } = await load("lib/billing.js", {
    "@/lib/stripe": { getStripe: () => ({ subscriptions: {
      list: (args) => {
        assert.equal(args.customer, "cus_a"); assert.equal(args.status, "all");
        return (async function* () {
          yield { id: "sub_a", status: "active" };
          yield { id: "sub_trial", status: "trialing" };
          yield { id: "sub_paid", status: "past_due" };
          yield { id: "sub_old", status: "canceled" };
          yield { id: "sub_expired", status: "incomplete_expired" };
        })();
      },
      retrieve: async () => stripeSub,
      cancel: async (id, args) => { assert.equal(args.invoice_now, false); assert.equal(args.prorate, false); canceled.push(id); },
    } }) },
  });
  await stopAccountBilling(row);
  assert.deepEqual(canceled, ["sub_a", "sub_trial", "sub_paid"]);
  await stopAccountBilling(null);
  await stopAccountBilling({ status: "active" });
});

test("billing shutdown never treats a Stripe lookup failure as no billing", async () => {
  const { stopAccountBilling } = await load("lib/billing.js", {
    "@/lib/stripe": { getStripe: () => ({ subscriptions: {
      list: () => (async function* () { throw Error("timeout"); })(),
      cancel: () => assert.fail("must not cancel before list completes"),
    } }) },
  });
  await assert.rejects(stopAccountBilling(row), /timeout/);
});

test("billing shutdown handles a stored subscription without customer ID", async () => {
  let canceled;
  const { stopAccountBilling } = await load("lib/billing.js", {
    "@/lib/stripe": { getStripe: () => ({ subscriptions: {
      retrieve: async (id) => { assert.equal(id, "sub_a"); return stripeSub; },
      cancel: async (id) => { canceled = id; },
    } }) },
  });
  await stopAccountBilling({ ...row, stripe_customer_id: null });
  assert.equal(canceled, "sub_a");
});

test("Neon writes preserve trial status and do not recreate deleted user mappings", async () => {
  const queries = [];
  const { syncStripeSubscription, markSubscriptionCanceled } = await load("lib/subscriptions.js", {
    "@/lib/db": { sql: async (parts, ...values) => { queries.push({ sql: parts.join("?"), values }); return []; } },
  });
  assert.equal(await syncStripeSubscription("cus_a", { ...stripeSub, status: "trialing" }), null);
  assert.ok(queries[0].sql.includes("UPDATE subscriptions"));
  assert.equal(queries[0].sql.includes("INSERT"), false);
  assert.ok(queries[0].values.includes("trialing"));
  await markSubscriptionCanceled("cus_a", "sub_old");
  assert.ok(queries[1].sql.includes("AND stripe_subscription_id ="));
  assert.ok(queries[1].values.includes("sub_old"));
});

test("webhook rejects invalid signatures without processing billing", async () => {
  const { POST } = await load("app/api/stripe/webhook/route.js", routeMocks({
    stripe: { webhooks: { constructEvent: () => { throw Error("bad signature"); } } },
  }));
  const res = await POST(new Request("https://example.test/api/stripe/webhook", { method: "POST", body: "{}" }));
  assert.equal(res.status, 400);
});

test("webhook refreshes delayed update events from current Stripe state", async () => {
  let synced;
  const event = { type: "customer.subscription.updated", data: { object: { id: "sub_a", status: "active" } } };
  const { POST } = await load("app/api/stripe/webhook/route.js", routeMocks({
    stripe: { webhooks: { constructEvent: () => event }, subscriptions: { retrieve: async () => ({ ...stripeSub, status: "canceled" }) } },
    db: { syncStripeSubscription: async (_, sub) => { synced = sub.status; } },
  }));
  assert.equal((await POST(new Request("https://example.test", { method: "POST", body: "{}" }))).status, 200);
  assert.equal(synced, "canceled");
});

test("webhook deletion targets the event's exact subscription", async () => {
  let target;
  const { POST } = await load("app/api/stripe/webhook/route.js", routeMocks({
    stripe: { webhooks: { constructEvent: () => ({ type: "customer.subscription.deleted", data: { object: { id: "sub_old", customer: "cus_a" } } }) } },
    db: { markSubscriptionCanceled: async (customer, id) => { target = [customer, id]; } },
  }));
  await POST(new Request("https://example.test", { method: "POST", body: "{}" }));
  assert.deepEqual(target, ["cus_a", "sub_old"]);
});

test("subscription UI shows free access without renewal or cancellation controls", async () => {
  const { SubscriptionCard } = await load("components/SubscriptionCard.jsx", {
    "@/components/BookProvider": { useBook: () => ({
      subscription: { status: "active", complimentary: true, current_period_end: null },
      profile: {}, lang: "fr", t: (key) => key,
    }) },
    "@/components/ui": { GhostBtn: (props) => React.createElement("button", props) },
  });
  const html = renderToStaticMarkup(React.createElement(SubscriptionCard));
  assert.ok(html.includes("Accès offert"));
  assert.ok(html.includes("Sans date"));
  assert.equal(html.includes("sub_cancel"), false);
  assert.equal(html.includes("sub_renews_on"), false);
});

test("subscription UI shows loading errors without falsely declaring no subscription", async () => {
  const { SubscriptionCard } = await load("components/SubscriptionCard.jsx", {
    "@/components/BookProvider": { useBook: () => ({
      subscription: null, subscriptionError: true, profile: {}, lang: "fr", t: (key) => key,
    }) },
    "@/components/ui": { GhostBtn: (props) => React.createElement("button", props) },
  });
  const html = renderToStaticMarkup(React.createElement(SubscriptionCard));
  assert.ok(html.includes('role="alert"'));
  assert.equal(html.includes("sub_none"), false);
});

test("service worker never caches API responses", async () => {
  const handlers = {};
  vm.runInNewContext(await readFile(path.join(root, "public/sw.js"), "utf8"), {
    self: { addEventListener: (name, fn) => { handlers[name] = fn; } },
    URL, location: { origin: "https://example.test" },
  });
  handlers.fetch({ request: new Request("https://example.test/api/stripe/subscription"),
    respondWith: () => assert.fail("API must bypass service worker cache") });
});

test("checkout saves the Neon customer before creating the trial session", async () => {
  process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY = "price_month";
  const events = [];
  const { POST } = await load("app/api/stripe/checkout/route.js", routeMocks({
    db: {
      getSubscription: async () => null,
      saveStripeCustomer: async (id, customer) => { assert.equal(id, user.id); assert.equal(customer, "cus_new"); events.push("save"); },
    },
    stripe: {
      customers: { create: async () => ({ id: "cus_new" }) },
      checkout: { sessions: { create: async (args) => {
        assert.equal(args.customer, "cus_new");
        assert.equal(args.subscription_data.trial_period_days, 14);
        assert.equal(args.line_items[0].price, "price_month");
        events.push("checkout"); return { url: "https://checkout.stripe.com/test" };
      } } },
    },
    extra: {
      "@supabase/ssr": { createServerClient: () => ({ auth: { getUser: async () => ({ data: { user } }) } }) },
      "next/headers": { cookies: () => ({ get() {} }) },
    },
  }));
  const res = await POST(new Request("https://example.test", { method: "POST", body: JSON.stringify({ plan: "monthly" }) }));
  assert.equal(res.status, 200);
  assert.deepEqual(events, ["save", "checkout"]);
});

test("checkout does not create a duplicate customer after a Stripe network failure", async () => {
  process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY = "price_month";
  const { POST } = await load("app/api/stripe/checkout/route.js", routeMocks({
    stripe: { customers: {
      retrieve: async () => { throw Error("network failure"); },
      create: () => assert.fail("must not create duplicate customer"),
    } },
    extra: {
      "@supabase/ssr": { createServerClient: () => ({ auth: { getUser: async () => ({ data: { user } }) } }) },
      "next/headers": { cookies: () => ({ get() {} }) },
    },
  }));
  assert.equal((await POST(new Request("https://example.test", { method: "POST", body: JSON.stringify({ plan: "monthly" }) }))).status, 500);
});
