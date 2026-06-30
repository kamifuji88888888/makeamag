import { LegalPageLayout } from '../components/LegalPageLayout'
import { SITE_NAME, SITE_URL, SUPPORT_EMAIL } from '../../shared/site'

export function AccessibilityPage() {
  return (
    <LegalPageLayout title="Accessibility Statement" updated="June 29, 2026">
      <section className="space-y-4">
        <p>
          {SITE_NAME} is committed to making our website and flipbook viewer accessible to as many
          people as possible, including users with disabilities. We aim to conform with widely
          recognized accessibility standards, including the Web Content Accessibility Guidelines
          (WCAG) 2.1 Level AA where practicable.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">Our platform</h2>
        <p className="text-apple-muted">
          We work to ensure that core {SITE_NAME} features — including sign-in, publishing,
          navigation, and the flipbook reader — support keyboard navigation, readable text, and
          sufficient color contrast. We continue to improve accessibility as we add new features.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">Published flipbooks</h2>
        <p className="text-apple-muted">
          Flipbooks are created from PDFs uploaded by publishers. The accessibility of a specific
          publication depends in part on the source PDF (for example, whether it includes tagged
          text, alt text for images, and logical reading order). Publishers are responsible for the
          accessibility of the content they upload and share.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">Known limitations</h2>
        <ul className="list-disc space-y-2 pl-5 text-apple-muted">
          <li>Page-flip animations may not be ideal for all users; keyboard and control-based navigation is available</li>
          <li>Scanned PDFs without embedded text may not be fully accessible until OCR or remediation is applied</li>
          <li>Third-party embeds (such as videos) depend on the accessibility of the external provider</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">Feedback and assistance</h2>
        <p className="text-apple-muted">
          If you encounter an accessibility barrier on {SITE_URL} or in a {SITE_NAME} flipbook,
          please let us know. We welcome your feedback and will try to provide the information or
          functionality you need in an alternative format where possible.
        </p>
        <p className="text-apple-muted">
          Contact us at{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="apple-link">
            {SUPPORT_EMAIL}
          </a>{' '}
          with the subject line &quot;Accessibility&quot; and include:
        </p>
        <ul className="list-disc space-y-2 pl-5 text-apple-muted">
          <li>The page or flipbook URL</li>
          <li>A description of the issue you experienced</li>
          <li>The browser and assistive technology you use, if applicable</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">Ongoing efforts</h2>
        <p className="text-apple-muted">
          Accessibility is an ongoing effort. We review our product regularly and update this
          statement when we make meaningful improvements.
        </p>
      </section>
    </LegalPageLayout>
  )
}
