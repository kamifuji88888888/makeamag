import { LegalPageLayout } from '../components/LegalPageLayout'
import { SITE_NAME, SITE_URL, SUPPORT_EMAIL } from '../../shared/site'

export function TermsPage() {
  return (
    <LegalPageLayout title="Terms of Service" updated="June 19, 2026">
      <section className="space-y-4">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of {SITE_NAME}{' '}
          at {SITE_URL}. By using the service, you agree to these Terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">The service</h2>
        <p className="text-apple-muted">
          {SITE_NAME} lets you upload PDF publications, create interactive flipbooks, and share
          them online. Features vary by plan. We may update, suspend, or discontinue parts of the
          service at any time.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">Accounts</h2>
        <p className="text-apple-muted">
          You are responsible for your account credentials and for all activity under your account.
          You must provide accurate information and keep your password secure. Notify us immediately
          at {SUPPORT_EMAIL} if you suspect unauthorized access.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">Your content</h2>
        <p className="text-apple-muted">
          You retain ownership of PDFs and other content you upload. You grant {SITE_NAME} a
          limited license to host, process, display, and distribute your content solely to operate
          the service and provide features you request (such as sharing, embedding, or custom
          domains).
        </p>
        <p className="text-apple-muted">
          You represent that you have the rights to upload and publish your content and that it does
          not violate any law or third-party rights.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">Acceptable use</h2>
        <p className="text-apple-muted">You agree not to:</p>
        <ul className="list-disc space-y-2 pl-5 text-apple-muted">
          <li>Upload unlawful, infringing, or harmful content</li>
          <li>Attempt to disrupt, probe, or compromise the service</li>
          <li>Use the service to send spam or misleading communications</li>
          <li>Resell or misrepresent the service without our permission</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">Subscriptions and payments</h2>
        <p className="text-apple-muted">
          Paid plans are billed through Stripe on a recurring basis unless canceled. Fees are
          non-refundable except where required by law. You may cancel through the billing portal.
          Downgrading or canceling may reduce available features or storage limits.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">Reader paywalls and third parties</h2>
        <p className="text-apple-muted">
          If you enable reader monetization, lead capture, or third-party integrations, you are
          responsible for compliance with applicable laws and for your relationship with readers
          and payment processors.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">Disclaimer</h2>
        <p className="text-apple-muted">
          THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF
          ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR
          PURPOSE, AND NON-INFRINGEMENT.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">Limitation of liability</h2>
        <p className="text-apple-muted">
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, {SITE_NAME.toUpperCase()} AND ITS OPERATORS WILL NOT
          BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY
          LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">Termination</h2>
        <p className="text-apple-muted">
          We may suspend or terminate access if you violate these Terms or if necessary to protect
          the service. You may stop using {SITE_NAME} at any time.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">Contact</h2>
        <p className="text-apple-muted">
          For questions about these Terms, contact {SUPPORT_EMAIL}.
        </p>
      </section>
    </LegalPageLayout>
  )
}
