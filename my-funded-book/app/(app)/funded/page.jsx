"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Award, ImagePlus, Landmark, Trash2 } from "lucide-react";
import { useBook } from "@/components/BookProvider";
import { CertModal } from "@/components/modals";
import { accountName, firmLabel, isFundedAccount, money } from "@/components/accounts/shared";

export default function FundedPage() {
  const { accounts, certificates, deleteCert, lang } = useBook();
  const [addingFor, setAddingFor] = useState(null);
  const L = lang === "en" ? "en" : "fr";
  const funded = useMemo(() => accounts.filter(isFundedAccount), [accounts]);
  const images = useMemo(() => certificates.filter((item) => item.file_url && (item.type === "funded" || item.type === "eval_passed")), [certificates]);
  const copy = L === "en" ? { title: "Funded wall", subtitle: "Your funded accounts and proof in one place.", add: "Add proof", empty: "No funded account yet.", emptyImage: "Add your first funded certificate or photo.", view: "Open account", del: "Delete" } : { title: "Mur des Funded", subtitle: "Tes comptes funded et leurs preuves réunis au même endroit.", add: "Ajouter une preuve", empty: "Aucun compte funded pour le moment.", emptyImage: "Ajoute ton premier certificat ou une photo de funded.", view: "Voir le compte", del: "Supprimer" };

  return <div className="mx-auto max-w-[1280px] px-5 py-8 text-prism-text sm:px-10">
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4"><div><p className="flex items-center gap-2 text-[10px] font-bold tracking-[.18em] text-prism-accent"><Award className="h-4 w-4" />FUNDED</p><h1 className="mt-2 text-[26px] font-bold tracking-tight">{copy.title}</h1><p className="mt-1 text-sm text-prism-muted">{copy.subtitle}</p></div><button type="button" onClick={() => setAddingFor({})} className="inline-flex h-10 items-center gap-2 rounded-lg bg-prism-accent px-4 text-sm font-bold text-black"><ImagePlus className="h-4 w-4" />{copy.add}</button></header>
    <section><h2 className="mb-3 text-[11px] font-bold tracking-[.16em] text-prism-muted">{L === "en" ? "ACCOUNTS" : "COMPTES"}</h2>{funded.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{funded.map((account) => <Link key={account.id} href={`/accounts/${account.id}`} className="rounded-xl border border-prism-line bg-prism-panel p-5 transition hover:border-prism-accent"><div className="flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-[.13em] text-prism-accent">{firmLabel(account.firm)}</span><Landmark className="h-4 w-4 text-prism-win" /></div><p className="mt-3 text-lg font-bold">{accountName(account)}</p><p className="mt-1 font-mono text-sm text-prism-muted">{money(account.size, false)}</p><span className="mt-5 inline-flex text-xs font-semibold text-prism-accent">{copy.view} →</span></Link>)}</div> : <Empty text={copy.empty} />}</section>
    <section className="mt-10"><h2 className="mb-3 text-[11px] font-bold tracking-[.16em] text-prism-muted">{L === "en" ? "PHOTOS & CERTIFICATES" : "PHOTOS & CERTIFICATS"}</h2>{images.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{images.map((item) => <article key={item.id} className="group overflow-hidden rounded-xl border border-prism-line bg-prism-panel"><a href={item.file_url} target="_blank" rel="noreferrer" className="block aspect-[4/3] bg-prism-surface"><img src={item.file_url} alt={item.note || "Funded proof"} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" /></a><div className="flex items-start justify-between gap-3 p-4"><div><p className="text-sm font-bold">{firmLabel(item.firm)}</p><p className="mt-1 text-xs text-prism-muted">{item.note || (L === "en" ? "Funded proof" : "Preuve de funded")}</p></div><button type="button" onClick={() => deleteCert(item.id)} className="text-prism-muted hover:text-prism-loss" aria-label={copy.del}><Trash2 className="h-4 w-4" /></button></div></article>)}</div> : <Empty text={copy.emptyImage} />}</section>
    {addingFor && <CertModal onClose={() => setAddingFor(null)} initialAccountId={addingFor.id || ""} initialFirm={addingFor.firm || "MFF"} initialAmount={addingFor.size || ""} initialType="funded" />}
  </div>;
}

function Empty({ text }) { return <div className="rounded-xl border border-dashed border-prism-line bg-prism-panel/50 px-5 py-10 text-center text-sm text-prism-muted">{text}</div>; }
