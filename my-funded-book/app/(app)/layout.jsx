import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { BookProvider } from "@/components/BookProvider";
import { AppShellPrism } from "@/components/prism";

const ACTIVE = ["active", "trialing"];

export default async function AppLayout({ children }) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Guard d'abonnement : lecture serveur du statut dans Supabase (table écrite par le webhook Stripe).
  // Le paywall n'est pas décoratif, il bloque l'accès aux données avant même le rendu.
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  const active =
    sub &&
    ACTIVE.includes(sub.status) &&
    (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
  if (!active) redirect("/pricing");

  return (
    <BookProvider user={{ id: user.id, email: user.email }}>
      <AppShellPrism user={{ email: user.email }}>{children}</AppShellPrism>
    </BookProvider>
  );
}
