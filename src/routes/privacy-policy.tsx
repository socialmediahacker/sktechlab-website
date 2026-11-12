import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalSection, LegalList } from "@/components/legal-page";
import { COMPANY } from "@/lib/company";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | SK Tech Lab" },
      {
        name: "description",
        content:
          "How SK Tech Lab collects, uses, stores and protects customer information when you buy digital products and digital marketing services.",
      },
      { property: "og:title", content: "Privacy Policy | SK Tech Lab" },
      {
        property: "og:description",
        content: "Information we collect, how it is used, data security, retention and your rights.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://sktechlab.com/privacy-policy" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://sktechlab.com/privacy-policy" }],
  }),
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        This Privacy Policy explains how {COMPANY.name} ("we", "us", "our") handles information when you
        visit our website, create an account, contact support, or purchase our digital products and
        digital marketing services.
      </p>

      <LegalSection heading="1. Information we collect">
        <LegalList
          items={[
            "Name",
            "Email address",
            "Phone number",
            "Billing and order information (such as the product or plan purchased and the order reference)",
            "Payment-related information (such as the transaction reference, payment status and payment method type shared with us by the payment gateway)",
            "Website usage information (pages visited, device and browser type, approximate location derived from IP, and error logs)",
            "Cookies and similar technologies",
          ]}
        />
        <p>
          We do not collect or store card numbers, CVV, UPI PINs, net-banking passwords or other
          sensitive payment credentials. Payment processing may be handled by the applicable payment
          gateway or payment service provider, who collects such details directly under their own terms
          and privacy policy.
        </p>
      </LegalSection>

      <LegalSection heading="2. Cookies">
        <p>
          We use cookies and similar storage to keep you signed in, remember preferences, and understand
          how the website is used. You can block or delete cookies in your browser settings, though some
          parts of the website may not function correctly without them.
        </p>
      </LegalSection>

      <LegalSection heading="3. How we use information">
        <LegalList
          items={[
            "Order processing — creating, delivering and managing your purchase",
            "Customer support — responding to your queries, requests and issues",
            "Payment gateway processing — sharing the minimum details needed to initiate and verify a payment",
            "Account management and service notifications",
            "Improving website performance, security and reliability",
            "Meeting legal, tax and accounting obligations",
          ]}
        />
      </LegalSection>

      <LegalSection heading="4. Data security">
        <p>
          We use reasonable technical and organisational measures — including encrypted connections
          (HTTPS), access controls and restricted administrative access — to protect information against
          unauthorised access, alteration or disclosure. No method of transmission or storage over the
          internet can be guaranteed to be completely secure.
        </p>
      </LegalSection>

      <LegalSection heading="5. Data retention">
        <p>
          We retain information for as long as your account or service is active, and afterwards only for
          the period required to resolve disputes, provide support history, and comply with applicable
          legal, tax or record-keeping requirements. Information that is no longer required is deleted or
          anonymised.
        </p>
      </LegalSection>

      <LegalSection heading="6. Third-party services">
        <p>
          We work with third-party providers for hosting, email delivery, analytics and payment
          processing. These providers receive only the information required to perform their function and
          are expected to handle it in line with their own privacy policies and applicable law. We do not
          sell your personal information.
        </p>
      </LegalSection>

      <LegalSection heading="7. Your rights">
        <LegalList
          items={[
            "Request access to the personal information we hold about you",
            "Request correction of inaccurate or incomplete information",
            "Request deletion of your information, subject to legal and contractual limits",
            "Withdraw consent for marketing communications at any time",
            "Raise a complaint or concern about how your information is handled",
          ]}
        />
        <p>
          To exercise any of these rights, email us at{" "}
          <a className="text-foreground underline" href={`mailto:${COMPANY.supportEmail}`}>
            {COMPANY.supportEmail}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="8. Children">
        <p>
          Our services are intended for business users and are not directed at children. We do not
          knowingly collect information from children.
        </p>
      </LegalSection>

      <LegalSection heading="9. Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. The updated version will be published on
          this page.
        </p>
      </LegalSection>

      <LegalSection heading="10. Contact information">
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
