import type { Metadata } from "next";
import { getLocale } from "@/lib/locale";

export const metadata: Metadata = { title: "Terms" };

export default async function TermsPage() {
  const locale = await getLocale();
  const fr = locale === "fr";
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-heading text-4xl tracking-tight">{fr ? "Conditions" : "Terms"}</h1>
      <div className="mt-6 space-y-4 text-base leading-7">
        {fr ? (
          <>
            <p>
              Northernwork est un marché pour du travail au Canada. Les tarifs sont en dollars canadiens. À distance signifie à distance au Canada.
            </p>
            <p>
              Northernwork retient 5 % du montant du projet à la libération du séquestre. La TPS, la TVH ou la TVQ affichée est une estimation sur ces frais seulement, selon la province du client ou le lieu du projet. Ce n’est pas un avis fiscal.
            </p>
            <p id="disputes">
              Tant que le paiement est retenu, le client peut l’annuler et la carte n’est pas capturée. Après la libération, les deux personnes règlent le litige dans leur fil. Northernwork ne juge pas un litige une fois l’argent versé.
            </p>
            <p>
              Les profils marqués Exemple sont fictifs. Les inviter ou les embaucher n’est pas possible.
            </p>
            <p>Un compte vérifié a confirmé son courriel et a au moins un paiement libéré. Une ville inscrite ne suffit pas.</p>
          </>
        ) : (
          <>
            <p>
              Northernwork is a marketplace for work inside Canada. Rates are in Canadian dollars. Remote means remote inside Canada.
            </p>
            <p>
              Northernwork keeps 5% of the project amount when escrow is released. Any GST, HST, or QST shown is an estimate on that fee only, based on the client province or the project location. It is not tax advice.
            </p>
            <p id="disputes">
              While a payment is held, the client can cancel it and the card is not captured. After release, the two people settle a dispute in their thread. Northernwork does not judge a dispute once the money has moved.
            </p>
            <p>Profiles marked Sample are fictional. They cannot be invited or hired.</p>
            <p>
              A verified account has confirmed its email and has at least one released payment. Typing a city is not enough.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
