# MY FUNDED BOOK

Journal de trading SaaS pour prop traders — Next.js (App Router) · Supabase · Stripe · PWA.

8 vues : Dashboard · Accounts · Journal · Review · Playbook · Breakdown · Certificates · Expenses.
Auth réelle, RLS stricte, paywall vérifié côté serveur, installable sur mobile et PC.

---

## 1. Prérequis

- Node.js 18.18+ (ou 20+)
- Un projet [Supabase](https://supabase.com)
- Un compte [Stripe](https://stripe.com)

## 2. Installation locale

```bash
npm install
cp .env.local.example .env.local   # puis remplis les valeurs (voir plus bas)
npm run dev
```

L'app tourne sur http://localhost:3000

## 3. Configuration Supabase

1. Crée un projet Supabase.
2. Dans **SQL Editor**, colle et exécute `supabase/schema.sql` (tables + RLS + trigger).
3. Récupère dans **Project Settings → API** :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - clé `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - clé `service_role` (secrète) → `SUPABASE_SERVICE_ROLE_KEY`
4. **Authentication → Providers → Email** : active Email. Pour tester sans confirmation, désactive "Confirm email" (à réactiver en prod).

> À l'inscription, un trigger crée automatiquement le `profile` + la ligne `subscriptions` (statut `inactive`).

## 4. Configuration Stripe

1. **Products** → crée un produit "MY FUNDED BOOK" avec deux prix récurrents (mensuel + annuel).
   Copie les `price_...` dans `NEXT_PUBLIC_STRIPE_PRICE_MONTHLY` et `NEXT_PUBLIC_STRIPE_PRICE_YEARLY`.
2. **Developers → API keys** → `STRIPE_SECRET_KEY`.
3. **Webhook** :
   - En local : `stripe listen --forward-to localhost:3000/api/stripe/webhook` → copie le `whsec_...` dans `STRIPE_WEBHOOK_SECRET`.
   - En prod : **Developers → Webhooks → Add endpoint** = `https://ton-domaine/api/stripe/webhook`, événements :
     `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.

### Le flux d'abonnement (important)
Le paywall **n'est pas** un `if` côté client. Le statut vit dans la table `subscriptions`, écrit **uniquement** par le webhook (via la clé `service_role`, qui bypass la RLS). Le layout serveur `app/(app)/layout.jsx` lit ce statut et redirige vers `/pricing` si l'abonnement n'est pas `active`/`trialing`. Impossible à contourner côté front.

## 4bis. Configuration Cloudflare R2 (stockage images/PDF — gratuit)

Les captures de trades et certificats sont stockés sur **Cloudflare R2** (10 Go gratuits, pas d'egress).

1. Installe le SDK : `npm install @aws-sdk/client-s3`
2. Cloudflare Dashboard → **R2** → *Create bucket* (ex. `myfundedbook`).
3. **Bucket → Settings → Public access** : active **r2.dev** (URL publique de dev) ou branche un domaine custom. Copie cette URL dans `NEXT_PUBLIC_R2_PUBLIC_URL` (sans slash final).
4. **R2 → Manage API Tokens → Create API Token** (permission *Object Read & Write*). Récupère :
   - `Account ID` → `R2_ACCOUNT_ID`
   - `Access Key ID` → `R2_ACCESS_KEY_ID`
   - `Secret Access Key` → `R2_SECRET_ACCESS_KEY`
5. Nom du bucket → `R2_BUCKET_NAME`.
6. Si tu as déjà déployé la base, exécute `supabase/migration_r2_images.sql` (ajoute `trades.screenshot_url` et `certificates.file_url`).

**Comment ça marche.** Le navigateur envoie le fichier à `/api/upload` (route protégée par l'auth Supabase), le serveur le pousse sur R2 via le SDK S3, et l'URL publique renvoyée est stockée dans Supabase. Les images sont compressées en WebP côté client avant l'envoi.

> ⚠️ Sur **Vercel free**, le body d'une fonction serverless est limité à ~4,5 Mo. La compression client garde les screenshots bien en dessous, mais pour de gros PDF de certificat, soit tu déploies le bucket avec un **upload direct par URL signée** (presigned PUT — je peux te le câbler), soit tu héberges sur un runtime sans cette limite. R2 lui-même accepte jusqu'à 15 Mo dans la route fournie.

## 5. Variables d'environnement (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PRICE_MONTHLY=
NEXT_PUBLIC_STRIPE_PRICE_YEARLY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 6. Données de démo (optionnel)
Pour reproduire les chiffres de la vidéo (Net P&L $8 966,56 · WR 57,14% · PF 2,45) :
ouvre `supabase/seed_demo.sql`, remplace `:USER_ID` par ton UUID (`select id from auth.users;`), exécute.
Ce script passe aussi ton abonnement en `active` pour tester sans payer.

## 7. PWA (installable)
`public/manifest.json` + `public/sw.js` sont déjà branchés. En prod (HTTPS), le navigateur propose
"Installer l'application" sur Android/PC, et "Ajouter à l'écran d'accueil" sur iOS.
Remplace les icônes `public/icons/icon-192.png` et `icon-512.png` par les tiennes (placeholders fournis).

## 8. Déploiement
1. Pousse le repo sur GitHub.
2. Importe-le sur **Vercel** (recommandé pour Next.js) ou Netlify.
3. Ajoute toutes les variables d'environnement dans le dashboard de l'hébergeur.
4. Mets `NEXT_PUBLIC_SITE_URL` = ton URL de prod.
5. Crée le webhook Stripe de prod (étape 4) avec l'URL déployée.

## Arborescence

```
my-funded-book/
├── app/
│   ├── layout.jsx                 # racine : polices, PWA meta, service worker
│   ├── page.jsx                   # redirige login <-> dashboard
│   ├── globals.css
│   ├── login/page.jsx             # Supabase Auth (login + signup)
│   ├── pricing/page.jsx           # paywall + Stripe Checkout
│   ├── auth/callback/route.js     # confirmation email / échange de code
│   ├── api/stripe/
│   │   ├── checkout/route.js      # crée la session d'abonnement
│   │   ├── webhook/route.js       # source de vérité du statut (service_role)
│   │   └── portal/route.js        # portail de gestion d'abonnement
│   └── (app)/
│       ├── layout.jsx             # garde auth + abonnement, monte le provider
│       ├── dashboard/page.jsx
│       ├── accounts/page.jsx
│       ├── journal/page.jsx
│       ├── review/page.jsx
│       ├── playbook/page.jsx
│       ├── breakdown/page.jsx
│       ├── certificates/page.jsx
│       └── expenses/page.jsx
├── components/
│   ├── AppShell.jsx               # sidebar + header + lock PIN + modales
│   ├── BookProvider.jsx           # contexte : charge/mute les données Supabase
│   ├── ui.jsx                     # KPI, Pill, Modal, Field, Chip, boutons
│   ├── charts.jsx                 # Radar, Area, Bars, Gauge, Calendar (SVG)
│   ├── modals.jsx                 # LogTrade, Account, Cert, Expense, Settings
│   └── PWARegister.jsx
├── lib/
│   ├── supabase/{client,server}.js
│   ├── stripe.js
│   ├── stats.js                   # tous les calculs (Edge Score, drawdown…)
│   ├── format.js
│   └── constants.js
├── supabase/
│   ├── schema.sql                 # tables + RLS + trigger  ← à exécuter
│   └── seed_demo.sql              # données de démo (optionnel)
├── public/
│   ├── manifest.json
│   ├── sw.js
│   └── icons/{icon-192,icon-512}.png
├── middleware.js                  # rafraîchit la session sur chaque requête
├── tailwind.config.js
└── package.json
```

## Sécurité — checklist
- ✅ RLS activée sur les 8 tables, policies `auth.uid() = user_id`.
- ✅ Table `subscriptions` en lecture seule côté client ; écriture réservée au webhook (`service_role`).
- ✅ Guard d'abonnement côté serveur (redirection avant rendu).
- ✅ `service_role` jamais exposée au navigateur (utilisée uniquement dans les routes API).
- ✅ Webhook Stripe : signature vérifiée (`constructEvent`).
