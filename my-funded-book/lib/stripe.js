import Stripe from "stripe";

// Le client Stripe est créé à la demande (et pas au chargement du module),
// pour que le build ne plante pas quand la clé n'est pas encore configurée.
let _stripe = null;

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe n'est pas configuré (STRIPE_SECRET_KEY manquant).");
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
  }
  return _stripe;
}
