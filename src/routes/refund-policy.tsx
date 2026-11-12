import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalSection, LegalList } from "@/components/legal-page";
import { COMPANY } from "@/lib/company";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "Refund & Cancellation Policy | SK Tech Lab" },
      {
        name: "description",
        content:
          "Refund and cancellation terms for SK Tech Lab digital products, including technical access issues, duplicate payments and refund processing timelines.",
      },
      { property: "og:title", content: "Refund & Cancellation Policy | SK Tech Lab" },
      {
        property: "og:description",
        content: "When refunds may be considered, what is non-refundable, and how cancellations work.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://sktechlab.com/refund-policy" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://sktechlab.com/refund-policy" }],
  }),
  component: RefundPolicyPage,
});

function RefundPolicyPage() {
  return (
    <LegalPage title="Refund & Cancellation Policy" updated="12 November 2026">
      <p>
        Due to the nature of digital products, purchases are generally non-refundable once the product
        has been successfully delivered, downloaded, accessed or made available to the customer.
      </p>
      <p>
        Customers should review the product description, features, requirements and pricing before
        purchasing.
      </p>

      <LegalSection heading="Technical or access issues">
        <p>
          If a customer has successfully completed payment but cannot access or receive the purchased
          digital product because of a technical issue attributable to {COMPANY.name}, the customer
          should contact support within 7 days of purchase.
        </p>
        <p>{COMPANY.name} will first attempt to resolve the delivery or access problem.</p>
      </LegalSection>

      <LegalSection heading="When a refund may be considered">
        <LegalList
          items={[
            "Duplicate payment caused by a payment or technical error",
            "Payment completed but the product was not delivered and cannot be delivered",
            `${COMPANY.name} is unable to provide the purchased product or service because of an issue on its side`,
          ]}
        />
      </LegalSection>

      <LegalSection heading="Generally non-refundable situations">
        <LegalList
          items={[
            "The customer changes their mind after purchase",
            "The customer purchased the wrong product",
            "The customer did not review the product description",
            "The customer's own device, software or internet connection prevents use of the product",
          ]}
        />
      </LegalSection>

      <LegalSection heading="Refund processing">
        <p>
          We acknowledge refund requests within 2 working days and aim to complete a review within
          7 working days after receiving the required order details. Approved refunds are initiated
          to the original payment method within 5–7 working days of approval. Bank or payment provider
          processing may take a further 5–10 working days. Contact us if this period has passed.
        </p>
      </LegalSection>

      <LegalSection heading="Domain registration">
        <p>Domain search results and quotes do not reserve a domain. Registration is confirmed only
        when the registrar accepts the order. If we cannot register the paid domain, we will offer
        an alternative only with your consent, or refund the unsuccessful domain registration charge.
        Successfully registered domains are normally non-cancellable because the registrar has
        already created the registration, subject to applicable law and any registrar refund eligibility.
        An uncertain registration is reviewed before any repeat purchase. Domain renewal is a separate purchase.</p>
      </LegalSection>
      <LegalSection heading="Website and shop plans">
        <p>You may request cancellation of future renewals through support. Cancelling does not
        automatically refund an already delivered billing period. A verified duplicate charge,
        failed activation we cannot resolve, or an undelivered service is eligible for review.
        Cancelling a website plan does not itself delete or refund an independently registered domain.</p>
      </LegalSection>
      <LegalSection heading="Cancellation">
        <p>
          Because digital products may be delivered or made accessible immediately after successful
          payment, orders generally cannot be cancelled once delivery or access has been initiated.
        </p>
      </LegalSection>

      <LegalSection heading="How to request support or a refund review">
        <p>
          Email{" "}
          <a className="text-foreground underline" href={`mailto:${COMPANY.supportEmail}`}>
            {COMPANY.supportEmail}
          </a>{" "}
          with your order or transaction ID, registered email, product name and a description of the
          issue.
        </p>
      </LegalSection>

      <p>This policy does not affect any rights or remedies available to customers under applicable law.</p>
    </LegalPage>
  );
}
