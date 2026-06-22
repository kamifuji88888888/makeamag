import { LegalPageLayout } from '../components/LegalPageLayout'
import { SITE_NAME, SITE_URL, SUPPORT_EMAIL } from '../../shared/site'

export function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" updated="June 19, 2026">
      <section className="space-y-4">
        <p>
          {SITE_NAME} (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates {SITE_URL} and
          provides tools to turn PDFs into interactive online flipbooks. This Privacy Policy explains
          how we collect, use, and protect information when you use our service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">Information we collect</h2>
        <ul className="list-disc space-y-2 pl-5 text-apple-muted">
          <li>
            <strong className="text-apple-text">Account information</strong> — email address and
            password when you create an account.
          </li>
          <li>
            <strong className="text-apple-text">Content you upload</strong> — PDF files, publication
            metadata, branding assets, and flipbook settings you choose to publish.
          </li>
          <li>
            <strong className="text-apple-text">Billing information</strong> — processed by Stripe;
            we do not store full payment card numbers on our servers.
          </li>
          <li>
            <strong className="text-apple-text">Usage data</strong> — basic analytics such as page
            views and flipbook interactions when analytics features are enabled.
          </li>
          <li>
            <strong className="text-apple-text">Technical data</strong> — browser type, device
            information, and logs needed to operate and secure the service.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">How we use information</h2>
        <ul className="list-disc space-y-2 pl-5 text-apple-muted">
          <li>Provide, host, and improve the {SITE_NAME} platform</li>
          <li>Authenticate users and manage subscriptions</li>
          <li>Display and share flipbooks you publish</li>
          <li>Respond to support requests and service communications</li>
          <li>Protect against abuse, fraud, and security incidents</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">How we share information</h2>
        <p className="text-apple-muted">
          We do not sell your personal information. We share data only with service providers that
          help us operate {SITE_NAME} (such as hosting, storage, email, and payment processing),
          when required by law, or with your direction (for example, when you publish a flipbook to
          readers).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">Data retention</h2>
        <p className="text-apple-muted">
          We retain account and published flipbook data while your account is active or as needed to
          provide the service. You may request deletion of your account or published content by
          contacting {SUPPORT_EMAIL}.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">Your choices</h2>
        <p className="text-apple-muted">
          You may access, update, or delete certain information through your account settings or by
          emailing {SUPPORT_EMAIL}. If you are in a region with additional privacy rights, you may
          contact us to exercise those rights.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">Security</h2>
        <p className="text-apple-muted">
          We use reasonable technical and organizational measures to protect your information.
          No method of transmission or storage is completely secure, and we cannot guarantee
          absolute security.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">Children</h2>
        <p className="text-apple-muted">
          {SITE_NAME} is not directed to children under 13, and we do not knowingly collect personal
          information from children.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">Changes</h2>
        <p className="text-apple-muted">
          We may update this Privacy Policy from time to time. We will post the revised policy on
          this page and update the &quot;Last updated&quot; date above.
        </p>
      </section>
    </LegalPageLayout>
  )
}
