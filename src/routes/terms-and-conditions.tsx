import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, LegalSection, LegalList } from "@/components/legal-page";
import { COMPANY } from "@/lib/company";

export const Route = createFileRoute("/terms-and-conditions")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions | SK Tech Lab" },
      {
        name: "description",
        content:
          "The terms that apply when you purchase or use SK Tech Lab digital products, website plans and digital marketing services.",
      },
      { property: "og:title", content: "Terms & Conditions | SK Tech Lab" },
      {
        property: "og:description",
        content: "Orders, payment, digital delivery, intellectual property and liability terms.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://sktechlab.com/terms-and-conditions" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://sktechlab.com/terms-and-conditions" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage title="Terms & Conditions">
      <LegalSection heading="1. Introduction">
        <p>
          These Terms & Conditions govern your use of the {COMPANY.name} website and the purchase of any
          digital products or services offered through it.
        </p>
      </LegalSection>

      <LegalSection heading="2. Acceptance of terms">
        <p>
          By accessing the website, creating an account or placing an order, you confirm that you have
          read, understood and agreed to these terms. If you do not agree, please do not use the website
          or place an order.
        </p>
      </LegalSection>

      <LegalSection heading="3. Products and services">
        <p>
          We offer website building tools and templates, website plans, and digital marketing related
          services. The specific inclusions of each product or plan are described on the relevant product
          or pricing page.
        </p>
      </LegalSection>

      <LegalSection heading="4. Digital products">
        <p>
          All products and services sold are digital and are delivered electronically. No physical goods
          are shipped. Access may be provided through your account, an access link, a download link or
          email.
        </p>
      </LegalSection>

      <LegalSection heading="5. Product information">
        <p>
          We make reasonable efforts to describe products accurately. Screenshots, demo templates and
          sample content are for illustration and may differ from the final result, which depends on the
          content and settings you provide.
        </p>
      </LegalSection>

      <LegalSection heading="6. Pricing">
        <p>
          Prices are displayed on the website in Indian Rupees and may change at any time. Applicable
          taxes, if any, will be indicated at checkout. The price shown at the time of a completed order
          applies to that order.
        </p>
      </LegalSection>

      <LegalSection heading="7. Orders">
        <p>
          An order is treated as placed when you complete the checkout steps. We may decline or cancel an
          order where information is incomplete or inaccurate, where payment cannot be verified, or where
          the order appears fraudulent or in breach of these terms.
        </p>
      </LegalSection>

      <LegalSection heading="8. Payment">
        <p>
          Payment must be completed in full through the payment options offered at checkout. Payment
          processing may be handled by the applicable payment gateway or payment service provider. We do
          not store card numbers, CVV, UPI PINs or similar sensitive payment credentials. A payment is
          treated as successful only after it is verified.
        </p>
      </LegalSection>

      <LegalSection heading="9. Digital delivery">
        <p>
          Delivery is electronic and takes place immediately or within the timeframe stated on the
          relevant product page after successful payment verification. Full details are set out in our{" "}
          <Link className="text-foreground underline" to="/delivery-policy">
            Digital Delivery Policy
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="10. Customer responsibilities">
        <LegalList
          items={[
            "Provide accurate account, contact and billing information",
            "Keep your account credentials confidential",
            "Ensure you have a compatible device, browser and internet connection",
            "Ensure that content you upload or publish is lawful and that you hold the necessary rights to it",
          ]}
        />
      </LegalSection>

      <LegalSection heading="11. Intellectual property">
        <p>
          The website, its software, templates, designs, text and branding remain the property of{" "}
          {COMPANY.name} or its licensors. A purchase grants you a limited, non-exclusive,
          non-transferable licence to use the purchased product for your own business purposes. Content
          you upload remains yours.
        </p>
      </LegalSection>

      <LegalSection heading="12. Prohibited use">
        <LegalList
          items={[
            "Reselling, redistributing or sublicensing our products without written permission",
            "Copying, reverse engineering or extracting source code, templates or assets",
            "Using the service for unlawful, fraudulent, abusive or infringing content",
            "Attempting to gain unauthorised access to the platform or another user's account",
            "Interfering with the security, availability or performance of the service",
          ]}
        />
      </LegalSection>

      <LegalSection heading="13. Refund and cancellation">
        <p>
          Refunds and cancellations are governed by our{" "}
          <Link className="text-foreground underline" to="/refund-policy">
            Refund & Cancellation Policy
          </Link>
          , which forms part of these terms.
        </p>
      </LegalSection>

      <LegalSection heading="Domain ownership and renewal">
        <p>Provide accurate registrant details and accept the registrar agreement shown at checkout.
        Availability and the first-year price are checked before payment; neither guarantees a
        reservation. Registration is successful only after registrar confirmation. Renewal estimates
        may change and are separate from your website or shop subscription. Keep your contact
        information current and renew before expiry. Domain payments do not create an automatic renewal mandate.</p>
      </LegalSection>
      <LegalSection heading="14. Third-party services">
        <p>
          Our services may rely on or link to third-party providers such as hosting, domain registrars,
          email delivery and payment gateways. Their availability and terms are outside our control, and
          your use of them may be subject to their own agreements.
        </p>
      </LegalSection>

      <LegalSection heading="15. Limitation of liability">
        <p>
          To the maximum extent permitted by law, our total liability arising out of or relating to a
          product or service is limited to the amount paid by you for that product or service. We do not
          guarantee any specific business outcome, including earnings, sales, search rankings, leads,
          traffic or business growth. We are not liable for indirect or consequential losses.
        </p>
      </LegalSection>

      <LegalSection heading="16. Changes to products or services">
        <p>
          We may add, modify, suspend or discontinue features, templates or plans. Where a change
          materially affects an active paid service, we will make reasonable efforts to inform you.
        </p>
      </LegalSection>

      <LegalSection heading="17. Applicable law">
        <p>
          These terms are governed by the laws of India, and the courts having jurisdiction at the
          registered place of business of {COMPANY.name} shall have exclusive jurisdiction over any
          dispute.
        </p>
      </LegalSection>

      <LegalSection heading="18. Contact information">
        <p>{COMPANY.name}</p>
        <p>
          Email:{" "}
          <a className="text-foreground underline" href={`mailto:${COMPANY.supportEmail}`}>
            {COMPANY.supportEmail}
          </a>
        </p>
        <p>Phone: {COMPANY.phone}</p>
        <p>Address: {COMPANY.address}</p>
      </LegalSection>
    </LegalPage>
  );
}
