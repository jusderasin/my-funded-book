import { redirect } from "next/navigation";

// L'ancien Journal et Trade Logs montraient la m\u00eame information.
// On garde cette redirection pour les anciens favoris, mais l'exp\u00e9rience unique est Trade Logs.
export default function JournalPage() {
  redirect("/trade-logs");
}
