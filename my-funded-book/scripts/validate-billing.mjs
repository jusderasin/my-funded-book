import { readFile } from "node:fs/promises";
import { transform } from "esbuild";

const paths = [
  "lib/subscription.js", "lib/subscriptions.js", "lib/billing.js", "lib/db.js",
  "app/(app)/layout.jsx", "components/BookProvider.jsx", "components/SubscriptionCard.jsx",
  "app/(app)/settings/page.jsx", "components/modals.jsx", "public/sw.js",
  ...["portal", "cancel", "checkout", "webhook", "subscription"].map((name) => `app/api/stripe/${name}/route.js`),
  "app/api/account/delete/route.js",
];
for (const path of paths) {
  await transform(await readFile(new URL("../" + path, import.meta.url), "utf8"), {
    loader: "jsx", format: "esm", sourcefile: path,
  });
}
console.log(`esbuild: ${paths.length} JS/JSX files validated.`);
