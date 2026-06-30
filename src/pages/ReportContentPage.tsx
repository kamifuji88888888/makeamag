import { LegalPageLayout } from '../components/LegalPageLayout'
import { Link } from 'react-router-dom'
import { SITE_NAME, SITE_URL, SUPPORT_EMAIL } from '../../shared/site'

export function ReportContentPage() {
  return (
    <LegalPageLayout title="Report Content" updated="June 29, 2026">
      <section className="space-y-4">
        <p>
          {SITE_NAME} hosts flipbooks and other content uploaded by publishers. If you believe
          content on {SITE_URL} is unlawful, harmful, or violates our policies, you can report it
          to us for review.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">What you can report</h2>
        <ul className="list-disc space-y-2 pl-5 text-apple-muted">
          <li>Copyright infringement (see our <Link to="/dmca" className="apple-link">DMCA policy</Link>)</li>
          <li>Content that is illegal, abusive, harassing, or threatening</li>
          <li>Content that appears to impersonate another person or organization</li>
          <li>Malware, phishing, or deceptive links embedded in a flipbook</li>
          <li>Other violations of our <Link to="/terms" className="apple-link">Terms of Service</Link></li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">How to report</h2>
        <p className="text-apple-muted">
          Email{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="apple-link">
            {SUPPORT_EMAIL}
          </a>{' '}
          with the subject line &quot;Content Report&quot; and include:
        </p>
        <ul className="list-disc space-y-2 pl-5 text-apple-muted">
          <li>The URL of the flipbook or page in question</li>
          <li>A description of the issue and why you believe it violates our policies</li>
          <li>Your contact information, if you would like a response</li>
          <li>Any supporting documentation (screenshots, registration numbers, etc.)</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">What happens next</h2>
        <p className="text-apple-muted">
          We review reports as promptly as practicable. We may remove or restrict access to content,
          contact the publisher, or take other action we deem appropriate. We are not obligated to
          notify reporters of the outcome in every case, but we will respond when follow-up is
          warranted.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">Copyright claims</h2>
        <p className="text-apple-muted">
          For formal copyright takedown requests, please use our{' '}
          <Link to="/dmca" className="apple-link">
            DMCA Copyright Policy
          </Link>{' '}
          so we can process your notice correctly.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">Misuse of reporting</h2>
        <p className="text-apple-muted">
          Submitting false or bad-faith reports may violate our Terms and could expose you to
          liability. Please report content only when you have a genuine concern.
        </p>
      </section>
    </LegalPageLayout>
  )
}
