import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { syncStripeSubscription, markSubscriptionCanceled } from "@/lib/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const stripe = getStripe();
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "invalid_webhook_signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          await syncStripeSubscription(session.customer, subscription);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        // Read current Stripe state; delayed events must not restore stale access.
        const subscription = await stripe.subscriptions.retrieve(event.data.object.id);
        const customerId = typeof subscription.customer === "string"
          ? subscription.customer : subscription.customer.id;
        await syncStripeSubscription(customerId, subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = typeof subscription.customer === "string"
          ? subscription.customer : subscription.customer.id;
        await markSubscriptionCanceled(customerId, subscription.id);
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error("Stripe webhook failed:", error);
    return NextResponse.json({ error: "webhook_processing_failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
