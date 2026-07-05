import Link from 'next/link';
import NavBar from '@/components/NavBar';

export const metadata = {
  title: 'Privacy Policy — AskLizy',
  description: 'Privacy Policy and personal data protection for AskLizy',
};

function LegalNavLink({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  const base = 'legal-nav-link';
  if (active) return <span className={`${base} active`}>{children}</span>;
  return <Link href={href} className={base}>{children}</Link>;
}

export default function PrivacyPage() {
  return (
    <main>
      <NavBar />
      <div className="shell legal-page">
        <div className="legal-layout">
          <nav className="legal-sidebar">
            <LegalNavLink href="/legal">Legal Notice</LegalNavLink>
            <LegalNavLink href="/privacy" active>Privacy Policy</LegalNavLink>
            <LegalNavLink href="/terms">Terms of Service</LegalNavLink>
          </nav>

          <div className="legal-content panel">
            <h1>Privacy Policy</h1>
            <p className="legal-updated">Last updated: July 5, 2026</p>

            <p className="legal-intro">
              The protection of your privacy is a priority for AskLizy. This policy explains how THELI SAS collects, uses, and protects your personal data when you use the website <strong>asklizy.com</strong>.
            </p>
            <p className="legal-intro">This policy is established in accordance with the GDPR and applicable French regulations.</p>

            <h2>1. Data controller</h2>
            <p>The personal data collected on this site is processed by:</p>
            <div className="legal-box">
              <p><strong>THELI SAS</strong></p>
              <p>Registered at the RCS of Paris under number 940 357 981</p>
              <p><strong>Registered office:</strong> 8 Rue des Cloys, 75018 Paris, France</p>
              <p><strong>Contact email:</strong> <a href="mailto:privacy@asklizy.com">privacy@asklizy.com</a></p>
            </div>
            <p>THELI SAS acts as the data controller within the meaning of Article 4 of the GDPR.</p>

            <h2>2. Technical cookies</h2>
            <p>AskLizy uses only cookies strictly necessary for the operation of the service:</p>
            <ul className="legal-list">
              <li>Supabase session (authentication)</li>
              <li>Anonymous rate-limiting cookie (signed, non-personal)</li>
              <li>Stripe payment security cookies (third-party)</li>
            </ul>
            <p>No profiling, advertising tracking, or behavioral analysis cookies are used. In accordance with CNIL recommendations, these technical cookies do not require prior consent.</p>

            <h2>3. Personal data collected</h2>
            <p>We collect only the data necessary for the operation of the service:</p>
            <div className="legal-table-wrap">
              <table className="legal-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Example</th>
                    <th>Purpose</th>
                    <th>Legal basis</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>Identity</td><td>Email address</td><td>Account creation and management</td><td>Contract performance</td></tr>
                  <tr><td>Payment</td><td>Stripe customer ID, invoices</td><td>Subscription management</td><td>Contract performance</td></tr>
                  <tr><td>Company</td><td>Company name, VAT number</td><td>B2B invoicing</td><td>Contract performance</td></tr>
                  <tr><td>Technical</td><td>IP hash, Vercel logs</td><td>Site security and rate limiting</td><td>Legitimate interest</td></tr>
                  <tr><td>Usage</td><td>Benchmark history, saved reports</td><td>Service delivery</td><td>Contract performance</td></tr>
                </tbody>
              </table>
            </div>
            <p>No sensitive data is knowingly collected.</p>

            <h2>4. Purposes of processing</h2>
            <p>Personal data is used for:</p>
            <ul className="legal-list">
              <li>managing user accounts and authentication</li>
              <li>providing the AskLizy service (location benchmarking, scoring, reports)</li>
              <li>managing subscriptions and billing (Stripe)</li>
              <li>ensuring site security</li>
              <li>preventing fraud and abuse</li>
              <li>improving service quality</li>
            </ul>
            <p>AskLizy does not engage in any automated profiling or automated decision-making with legal effect.</p>

            <h2>5. Data recipients</h2>
            <p>Data is intended exclusively for:</p>
            <ul className="legal-list">
              <li>THELI SAS internal teams</li>
              <li>technical subprocessors necessary for the service (Supabase, Stripe, Vercel, Google Maps API, RapidAPI)</li>
            </ul>
            <p>These providers act as subprocessors within the meaning of Article 28 of the GDPR.</p>

            <h2>6. Hosting and providers</h2>
            <div className="legal-box">
              <p><strong>Frontend & API:</strong> Vercel Inc. — United States</p>
              <p><strong>Database & Auth:</strong> Supabase Inc. — data hosted in EU</p>
              <p><strong>Payments:</strong> Stripe Inc.</p>
              <p><strong>Maps & POI data:</strong> Google Maps API / RapidAPI</p>
            </div>
            <p>Some transfers may take place outside the European Union, notably to the United States. These transfers are governed by Standard Contractual Clauses of the European Commission.</p>

            <h2>7. Data retention</h2>
            <div className="legal-table-wrap">
              <table className="legal-table">
                <thead>
                  <tr><th>Data type</th><th>Retention period</th></tr>
                </thead>
                <tbody>
                  <tr><td>Active user account</td><td>Duration of activity</td></tr>
                  <tr><td>Benchmark history</td><td>Duration of account</td></tr>
                  <tr><td>Invoices and accounting records</td><td>10 years</td></tr>
                  <tr><td>Supabase session</td><td>1 hour (renewable)</td></tr>
                  <tr><td>Anonymous rate-limit records</td><td>Monthly reset</td></tr>
                  <tr><td>Vercel technical logs</td><td>Maximum 12 months</td></tr>
                </tbody>
              </table>
            </div>
            <p>Beyond these periods, data is deleted or anonymized.</p>

            <h2>8. Account deletion</h2>
            <p>You can delete your AskLizy account at any time from your <Link href="/account">account page</Link>. This action is irreversible: your authentication data is immediately deleted from Supabase.</p>
            <p>If a Stripe subscription is active, you must first cancel it via the billing portal available in your account page.</p>

            <h2>9. Data security</h2>
            <p>THELI SAS implements appropriate technical and organizational measures:</p>
            <ul className="legal-list">
              <li>HTTPS encryption (TLS)</li>
              <li>Supabase Row Level Security (RLS)</li>
              <li>Secure service tokens</li>
              <li>Access control and internal access limitation</li>
              <li>Signed anonymous rate-limiting cookies</li>
            </ul>

            <h2>10. Your rights</h2>
            <p>In accordance with the GDPR, you have the following rights:</p>
            <ul className="legal-list">
              <li>right of access</li>
              <li>right to rectification</li>
              <li>right to erasure</li>
              <li>right to restriction of processing</li>
              <li>right to data portability</li>
              <li>right to object</li>
              <li>right to withdraw consent</li>
            </ul>
            <p>You can exercise these rights by writing to: <a href="mailto:privacy@asklizy.com">privacy@asklizy.com</a></p>
            <p>A response will be provided within a maximum of 30 days.</p>
            <p>In the absence of a satisfactory response, you may file a complaint with the <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">CNIL</a>.</p>

            <h2>11. No sale of data</h2>
            <p>THELI SAS does not sell, rent, or share any personal data for commercial or advertising purposes.</p>

            <h2>12. Changes to this policy</h2>
            <p>This policy may be updated to reflect the evolution of the service, legal obligations, or technical practices. The update date at the top will be modified accordingly.</p>

            <h2>13. Contact</h2>
            <p>For any questions regarding this policy: <a href="mailto:privacy@asklizy.com">privacy@asklizy.com</a></p>
          </div>
        </div>
      </div>
    </main>
  );
}
