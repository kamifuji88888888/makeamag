import { LegalPageLayout } from '../components/LegalPageLayout'
import { Link } from 'react-router-dom'
import { SITE_NAME, SITE_URL, SUPPORT_EMAIL } from '../../shared/site'

export function ContentGuidelinesPage() {
  return (
    <LegalPageLayout title="Content Guidelines" updated="June 30, 2026">
      <section className="space-y-4">
        <p>
          {SITE_NAME} is built for magazines, catalogs, brochures, and other legitimate publications.
          These guidelines explain what may be published on {SITE_URL} and how we handle violations.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">What belongs on {SITE_NAME}</h2>
        <ul className="list-disc space-y-2 pl-5 text-apple-muted">
          <li>Magazines, lookbooks, catalogs, annual reports, and marketing brochures</li>
          <li>Editorial, fashion, beauty, lifestyle, and trade publications you have the right to distribute</li>
          <li>Professional publications with accurate titles, descriptions, and metadata</li>
          <li>Content that complies with applicable laws and respects third-party rights</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">Prohibited content</h2>
        <p className="text-apple-muted">Do not upload or publish content that:</p>
        <ul className="list-disc space-y-2 pl-5 text-apple-muted">
          <li>Infringes copyright, trademark, or other intellectual property rights</li>
          <li>Is illegal or promotes illegal activity</li>
          <li>Contains pornography or sexually explicit material intended to arouse</li>
          <li>Depicts or promotes violence, abuse, or exploitation</li>
          <li>Harasses, threatens, or defames others</li>
          <li>Impersonates a person or organization without authorization</li>
          <li>Contains malware, phishing, scams, or deceptive links</li>
          <li>Is primarily spam, scraped material you do not own, or misleading clickbait</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">Mature and editorial content</h2>
        <p className="text-apple-muted">
          Fashion, art, and editorial photography may include mature themes. That content is generally
          allowed when it is presented in a professional publishing context and you have the rights to
          publish it. We may review borderline material and restrict or remove publications that cross
          into explicit adult content or violate these guidelines.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">Publisher responsibility</h2>
        <p className="text-apple-muted">
          You are responsible for every PDF and link you upload. By publishing on {SITE_NAME}, you
          confirm that you have the necessary rights and that your content complies with these
          guidelines and our <Link to="/terms" className="apple-link">Terms of Service</Link>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">How we enforce guidelines</h2>
        <p className="text-apple-muted">
          We may remove or restrict access to content, disable sharing or embeds, suspend accounts, or
          terminate repeat offenders. Enforcement actions may be taken:
        </p>
        <ul className="list-disc space-y-2 pl-5 text-apple-muted">
          <li>In response to a valid <Link to="/dmca" className="apple-link">DMCA notice</Link></li>
          <li>After a <Link to="/report" className="apple-link">content report</Link> we substantiate</li>
          <li>When we discover a clear violation during review</li>
          <li>When required by law or to protect users and the platform</li>
        </ul>
        <p className="text-apple-muted">
          We may introduce automated review tools as the platform grows. Publications that violate
          guidelines may be labeled or removed without prior notice in serious cases.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">Reporting violations</h2>
        <p className="text-apple-muted">
          See our <Link to="/report" className="apple-link">Report Content</Link> page or email{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="apple-link">
            {SUPPORT_EMAIL}
          </a>{' '}
          with the flipbook URL and a description of the issue.
        </p>
      </section>
    </LegalPageLayout>
  )
}
