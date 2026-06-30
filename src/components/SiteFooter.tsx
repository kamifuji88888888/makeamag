import { Link } from 'react-router-dom'
import { SUPPORT_EMAIL } from '../../shared/site'

export function SiteFooter() {
  return (
    <footer className="border-t border-apple-border-light bg-apple-bg px-6 py-10">
      <div className="mx-auto flex max-w-[980px] flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="text-sm text-apple-muted">
          © {new Date().getFullYear()} MakeAMag. All rights reserved.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
          <Link to="/privacy" className="apple-link">
            Privacy
          </Link>
          <Link to="/terms" className="apple-link">
            Terms
          </Link>
          <Link to="/dmca" className="apple-link">
            DMCA
          </Link>
          <Link to="/report" className="apple-link">
            Report Content
          </Link>
          <Link to="/accessibility" className="apple-link">
            Accessibility
          </Link>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="apple-link">
            Contact
          </a>
        </div>
      </div>
    </footer>
  )
}
