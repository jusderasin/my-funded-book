"use client";

import { useMemo, useState } from "react";
import { Images, X } from "lucide-react";
import { useBook } from "@/components/BookProvider";
import { frDate } from "@/lib/format";

export default function GalleryPage() {
  const { trades, accounts, lang } = useBook();
  const [accountId, setAccountId] = useState("all");
  const [selected, setSelected] = useState(null);
  const L = lang === "en" ? "en" : "fr";
  const images = useMemo(() => trades.filter((trade) => (accountId === "all" || trade.account_id === accountId)).flatMap((trade) => [trade.screenshot_url, trade.screenshot_url_2].filter(Boolean).map((url, index) => ({ id: `${trade.id}-${index}`, url, trade }))), [accountId, trades]);
  const copy = L === "en" ? { title: "Trade gallery", subtitle: "All your chart captures in one visual archive.", all: "All accounts", empty: "No captures yet. Add an entry or exit image when you log a trade." } : { title: "Galerie de trades", subtitle: "Toutes tes captures de chart réunies dans une archive visuelle.", all: "Tous les comptes", empty: "Aucune capture pour le moment. Ajoute une image d’entrée ou de sortie en loggant un trade." };
  const accountName = (id) => accounts.find((account) => account.id === id)?.note || accounts.find((account) => account.id === id)?.firm || "—";
  return <div className="mx-auto max-w-[1280px] px-5 py-8 text-prism-text sm:px-10"><header className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="flex items-center gap-2 text-[10px] font-bold tracking-[.18em] text-prism-accent"><Images className="h-4 w-4" />ARCHIVE</p><h1 className="mt-2 text-[26px] font-bold tracking-tight">{copy.title}</h1><p className="mt-1 text-sm text-prism-muted">{copy.subtitle}</p></div><select value={accountId} onChange={(event) => setAccountId(event.target.value)} className="h-10 rounded-lg border border-prism-line bg-prism-panel px-3 text-sm"><option value="all">{copy.all}</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.note || account.firm}</option>)}</select></header>{images.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{images.map((image) => <button key={image.id} type="button" onClick={() => setSelected(image)} className="group overflow-hidden rounded-xl border border-prism-line bg-prism-panel text-left transition hover:border-prism-accent"><img src={image.url} alt="Trade chart" className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-105" /><span className="block p-3"><b className="block text-xs">{image.trade.symbol} · {String(image.trade.dir || "").toUpperCase()}</b><small className="mt-1 block text-[10px] text-prism-muted">{frDate(image.trade.date)} · {accountName(image.trade.account_id)}</small></span></button>)}</div> : <div className="rounded-xl border border-dashed border-prism-line bg-prism-panel/50 py-20 text-center text-sm text-prism-muted">{copy.empty}</div>}{selected && <div className="fixed inset-0 z-[120] grid place-items-center bg-black/90 p-5" onClick={() => setSelected(null)}><button type="button" className="absolute right-5 top-5 text-prism-muted hover:text-white" onClick={() => setSelected(null)}><X className="h-7 w-7" /></button><img src={selected.url} alt="Trade chart" className="max-h-full max-w-full rounded-xl" onClick={(event) => event.stopPropagation()} /></div>}</div>;
}
