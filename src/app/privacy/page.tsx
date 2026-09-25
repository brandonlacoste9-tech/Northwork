import type { Metadata } from "next";
import { getLocale } from "@/lib/locale";

export const metadata: Metadata = { title: "Privacy" };

export default async function PrivacyPage() {
  const locale = await getLocale();
  const fr = locale === "fr";
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-heading text-4xl tracking-tight">
        {fr ? "Confidentialité" : "Privacy"}
      </h1>
      <div className="mt-6 space-y-4 text-base leading-7">
        {fr ? (
          <>
            <p>
              Northernwork conserve le compte (courriel), le profil public, les projets, les offres, les messages, les avis et l’état des paiements. Stripe traite la carte. Nous ne vendons pas le répertoire.
            </p>
            <p>
              Le profil, la ville et la province sont publics pour que le marché fonctionne. Les messages et le détail d’un paiement ne sont visibles que par les deux personnes concernées.
            </p>
            <p>
              Les alertes restent dans le compte. Un courriel n’est envoyé que si un service de messagerie est configuré. Le courriel de confirmation d’inscription vient de Supabase et peut être limité à deux par heure.
            </p>
          </>
        ) : (
          <>
            <p>
              Northernwork stores the account email, the public profile, projects, pitches, messages, reviews, and payment status. Stripe handles the card. We do not sell the directory.
            </p>
            <p>
              A profile, city, and province are public so the marketplace can work. Messages and payment detail are visible only to the two people involved.
            </p>
            <p>
              Alerts stay on the account. Email is sent only when a mail provider is configured. Signup confirmation mail comes from Supabase and may be limited to two an hour.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
