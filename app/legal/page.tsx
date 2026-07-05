import Link from 'next/link';
import NavBar from '@/components/NavBar';

export const metadata = {
  title: 'Legal Notice — AskLizy',
  description: 'Legal information for asklizy.com',
};

function LegalNavLink({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  const base = 'legal-nav-link';
  if (active) return <span className={`${base} active`}>{children}</span>;
  return <Link href={href} className={base}>{children}</Link>;
}

export default function LegalPage() {
  return (
    <main>
      <NavBar />
      <div className="shell legal-page">
        <div className="legal-layout">
          <nav className="legal-sidebar">
            <LegalNavLink href="/legal" active>Legal Notice</LegalNavLink>
            <LegalNavLink href="/privacy">Privacy Policy</LegalNavLink>
            <LegalNavLink href="/terms">Terms of Service</LegalNavLink>
          </nav>

          <div className="legal-content panel">
            <h1>Legal Notice</h1>
            <p className="legal-updated">Last updated: July 5, 2026</p>

            <p className="legal-intro">
              In accordance with the French law for confidence in the digital economy (LCEN, law n°2004-575 of June 21, 2004), the legal information for the website <strong>asklizy.com</strong> is as follows.
            </p>

            <h2>1. Publisher</h2>
            <ul className="legal-list">
              <li><strong>Company:</strong> THELI SAS</li>
              <li><strong>Legal form:</strong> Simplified Joint Stock Company (SAS)</li>
              <li><strong>Share capital:</strong> €1,000</li>
              <li><strong>RCS:</strong> Paris 940 357 981</li>
              <li><strong>SIRET:</strong> 940 357 981 00015</li>
              <li><strong>VAT number:</strong> FR63 940 357 981</li>
              <li><strong>Registered office:</strong> 8 Rue des Cloys, 75018 Paris, France</li>
              <li><strong>Email:</strong> <a href="mailto:contact@asklizy.com">contact@asklizy.com</a> / <a href="mailto:privacy@asklizy.com">privacy@asklizy.com</a></li>
              <li><strong>Publication director:</strong> Hassine ACHOUR</li>
            </ul>

            <h2>2. Hosting provider</h2>
            <p>Vercel Inc.</p>
            <p>440 N Barranca Ave #4133, Covina CA 91723, United States</p>
            <ul className="legal-list">
              <li><strong>Email:</strong> <a href="mailto:support@vercel.com">support@vercel.com</a></li>
              <li><strong>Website:</strong> <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com</a></li>
            </ul>

            <h2>3. Intellectual property</h2>
            <p>All content on <strong>asklizy.com</strong> (text, images, logos, databases, source code) is protected by copyright, trademark law, and intellectual property law.</p>
            <p>Any reproduction, representation, or use of these materials without prior written authorization is strictly prohibited.</p>

            <h2>4. Personal data</h2>
            <p>The processing of personal data is described in our <Link href="/privacy">Privacy Policy</Link>.</p>
            <ul className="legal-list">
              <li>GDPR compliance</li>
              <li>CNIL recommendations</li>
              <li>Strictly necessary cookies only</li>
            </ul>

            <h2>5. Liability</h2>
            <p>AskLizy is a decision-support tool. It does not provide certified footfall, legal, real-estate, or investment advice. Maps and review data are provided through third-party APIs and may be incomplete, delayed, or rate-limited.</p>
            <p>Users should verify critical decisions with site visits, brokers, local market experts, and official sources. THELI SAS cannot be held liable for:</p>
            <ul className="legal-list">
              <li>errors, omissions, or inaccuracies in data</li>
              <li>damages resulting from the use of the site or the information provided</li>
              <li>external sites accessible via hyperlinks</li>
            </ul>

            <h2>6. External links</h2>
            <p>The site may contain links to third-party websites. AskLizy exercises no control over these sites and cannot be responsible for their content or privacy policies.</p>

            <h2>7. Cookies</h2>
            <p>The site asklizy.com uses cookies strictly necessary for its technical operation, including authentication (Supabase session), anonymous rate limiting, and security.</p>
            <ul className="legal-list">
              <li>No profiling or advertising cookies are used.</li>
              <li>No non-essential collection is performed.</li>
            </ul>

            <h2>8. Applicable law and jurisdiction</h2>
            <p>The site is subject to French law.</p>
            <p>Any dispute relating to the use of the site or the services provided by AskLizy shall fall under the exclusive jurisdiction of the competent French courts.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
