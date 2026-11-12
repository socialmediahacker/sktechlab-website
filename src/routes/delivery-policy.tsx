import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, LegalSection, LegalList } from "@/components/legal-page";
import { COMPANY } from "@/lib/company";

export const Route = createFileRoute("/delivery-policy")({
  head: () => ({
    meta: [
      { title: "Digital Delivery Policy | SK Tech Lab" },
      {
        name: "description",
        content:
          "How SK Tech Lab delivers digital products electronically — by email, secure download link, customer account or access link — after payment verification.",
      },
      { property: "og:title", content: "Digital Delivery Policy | SK Tech Lab" },
      {
        property: "og:description",
        content: "Delivery methods, delivery timeframe and what to do if you have not received access.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://sktechlab.com/delivery-policy" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://sktechlab.com/delivery-policy" }],
  }),
  component: DeliveryPolicyPage,
});

function DeliveryPolicyPage() {
  return (
    <LegalPage title="Digital Delivery Policy" updated="12 November 2026">
      <p>
        {COMPANY.name} provides digital products and electronically delivered services and products. No
        physical goods are shipped.
      </p>

      <LegalSection heading="Delivery methods">
        <LegalList
          items={["Email", "Secure download link", "Customer account", "Access link"]}
        />
      </LegalSection>

      <LegalSection heading="Delivery timeframe">
        <p>
          Template and shop access normally activate within 15 minutes after a captured online payment
          is verified. Manual payments are reviewed within 2 working days. Custom development follows
          the delivery schedule agreed in your quote; purchasing a plan does not promise immediate
          completion of custom work.
        </p>
      </LegalSection>

      <LegalSection heading="Domains and DNS">
        <p>Domain registration is normally processed within 24 hours of verified payment and receipt
        of complete registrant details, subject to registrar availability and identity checks. An
        unresolved registrar response is sent for manual review. Registration, website connection
        and DNS propagation are separate steps. DNS changes can take up to 48 hours to propagate
        after the correct records are configured. Domain status is available in your dashboard.</p>
      </LegalSection>
      <LegalSection heading="If you have not received your product">
        <p>
          If a customer does not receive or cannot access the purchased product, they can contact{" "}
          <a className="text-foreground underline" href={`mailto:${COMPANY.supportEmail}`}>
            {COMPANY.supportEmail}
          </a>{" "}
          with the following details:
        </p>
        <LegalList
          items={["Order / Transaction ID", "Registered email", "Product name", "Date of purchase"]}
        />
        <p>
          Please also check your spam or promotions folder before contacting support. Related terms are
          available in our{" "}
          <Link className="text-foreground underline" to="/refund-policy">
            Refund & Cancellation Policy
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
