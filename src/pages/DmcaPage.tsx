import { LegalPageLayout } from '../components/LegalPageLayout'
import { SITE_NAME, SITE_URL, SUPPORT_EMAIL } from '../../shared/site'

export function DmcaPage() {
  return (
    <LegalPageLayout title="DMCA Copyright Policy" updated="June 29, 2026">
      <section className="space-y-4">
        <p>
          {SITE_NAME} respects intellectual property rights and expects publishers who use our
          platform to do the same. We respond to notices of alleged copyright infringement in
          accordance with the Digital Millennium Copyright Act (&quot;DMCA&quot;), 17 U.S.C. § 512.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">Reporting infringement</h2>
        <p className="text-apple-muted">
          If you believe content hosted on {SITE_URL} infringes your copyright, please send a DMCA
          notice to our designated agent with the following information:
        </p>
        <ul className="list-disc space-y-2 pl-5 text-apple-muted">
          <li>Your physical or electronic signature</li>
          <li>Identification of the copyrighted work you claim has been infringed</li>
          <li>
            Identification of the material you claim is infringing, including the URL or flipbook
            link where it appears on {SITE_NAME}
          </li>
          <li>Your contact information (address, telephone number, and email address)</li>
          <li>
            A statement that you have a good-faith belief that use of the material is not authorized
            by the copyright owner, its agent, or the law
          </li>
          <li>
            A statement, under penalty of perjury, that the information in your notice is accurate
            and that you are the copyright owner or authorized to act on the owner&apos;s behalf
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">Designated agent</h2>
        <p className="text-apple-muted">
          Send DMCA notices and counter-notices to:
        </p>
        <p className="text-apple-muted">
          DMCA Agent — {SITE_NAME}
          <br />
          Email:{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="apple-link">
            {SUPPORT_EMAIL}
          </a>
        </p>
        <p className="text-apple-muted">
          Please include &quot;DMCA Notice&quot; in the subject line. We may share your notice with
          the user who uploaded the content, as required by law.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">Counter-notification</h2>
        <p className="text-apple-muted">
          If you believe your content was removed or disabled by mistake or misidentification, you
          may submit a counter-notification to the agent above. Your counter-notification must
          include the information required by 17 U.S.C. § 512(g)(3). We may restore the content
          unless the original complainant files a court action within the time period specified by
          the DMCA.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">Repeat infringers</h2>
        <p className="text-apple-muted">
          We may terminate accounts of users who are repeat infringers, in appropriate circumstances
          and at our discretion.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-apple-text">Publisher responsibility</h2>
        <p className="text-apple-muted">
          If you upload content to {SITE_NAME}, you are responsible for ensuring you have the rights
          to publish it. Do not upload material you do not own or have permission to distribute.
        </p>
      </section>
    </LegalPageLayout>
  )
}
