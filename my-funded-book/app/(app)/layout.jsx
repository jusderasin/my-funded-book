import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSubscription } from "@/lib/subscriptions";
import { hasSubscriptionAccess, subscriptionSummary } from "@/lib/subscription";
import { BookProvider } from "@/components/BookProvider";
import { AppShell } from "@/components/AppShell";


export default async function AppLayout({ children }) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sub = await getSubscription(user.id);
  if (!hasSubscriptionAccess(sub)) redirect("/pricing");

  return (
    <BookProvider user={{ id: user.id, email: user.email }} initialSubscription={subscriptionSummary(sub)}>
      <AppShell>{children}</AppShell>
    </BookProvider>
  );
}
