import Link from 'next/link';
import NavBar from '@/components/NavBar';

export const metadata = {
  title: 'Terms of Service — AskLizy',
  description: 'Terms of Use and General Terms of Sale for AskLizy',
};

function LegalNavLink({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  const base = 'legal-nav-link';
  if (active) return <span className={`${base} active`}>{children}</span>;
  return <Link href={href} className={base}>{children}</Link>;
}

export default function TermsPage() {
  return (
    <main>
      <NavBar />
      <div className="shell legal-page">
        <div className="legal-layout">
          <nav className="legal-sidebar">
            <LegalNavLink href="/legal">Legal Notice</LegalNavLink>
            <LegalNavLink href="/privacy">Privacy Policy</LegalNavLink>
            <LegalNavLink href="/terms" active>Terms of Service</LegalNavLink>
          </nav>

          <div className="legal-content panel">
            <h1>Terms of Service</h1>
            <p className="legal-intro">
              This document combines AskLizy&apos;s Terms of Use (ToU) and General Terms of Sale (GTS), outlining the rights and obligations of users and THELI SAS, including rules on service access, data protection, intellectual property, liability, billing, and dispute resolution.
            </p>
            <p className="legal-updated">Last updated: July 5, 2026</p>

            {/* ============ TERMS OF USE ============ */}
            <h2 className="legal-section-title">Terms of Use (ToU)</h2>

            <h3>1. Purpose</h3>
            <p>These Terms of Use govern access to and use of the <strong>AskLizy</strong> platform. By using AskLizy, you fully accept the terms set out below.</p>
            <p>AskLizy is a product developed by <strong>THELI SAS</strong>, whose registered office is at 8 Rue des Cloys, 75018 Paris, France. SIRET: 940 357 981 00015. VAT: FR63 940 357 981.</p>

            <h3>2. Definitions</h3>
            <ul className="legal-list">
              <li><strong>User:</strong> Any individual or legal entity with access to AskLizy&apos;s services.</li>
              <li><strong>Service:</strong> All functionalities offered by AskLizy — location benchmarking, POI analysis, review aggregation, scoring, saved reports, and export.</li>
              <li><strong>Benchmark:</strong> A single comparison between two addresses, including data collection, scoring, and report generation.</li>
            </ul>

            <h3>3. Access to the Service</h3>
            <p>The free tier is open to all registered users. Paid tiers (Starter, Pro) require an active subscription managed via Stripe.</p>
            <p>Upon registration, it is mandatory to provide accurate and up-to-date information. In case of false declarations or inappropriate use, AskLizy reserves the right to suspend or terminate the account.</p>
            <p>Login credentials are strictly personal and confidential. The user undertakes not to share them. Any fraudulent use is the sole responsibility of the user.</p>
            <p>Anonymous (unregistered) users are limited to one benchmark per month and may have their access restricted at any time to protect service availability.</p>

            <h3>4. Use of the Service</h3>
            <p>AskLizy aggregates and structures location data from third-party APIs (Google Maps, RapidAPI) including nearby places, reviews, ratings, and visitor estimates. This data is provided for decision-support purposes only.</p>
            <p>The service must be used in compliance with applicable regulations, including the GDPR and data protection laws. Once data is extracted or shared, it is the user&apos;s responsibility to ensure compliance with the legal framework. THELI SAS cannot be held liable for any unlawful use.</p>
            <p>Any unauthorized mass extraction, bulk resale of data, or redistribution of information obtained via AskLizy without express authorization is prohibited. The data provided cannot be resold to a third party.</p>

            <h3>5. Intellectual Property</h3>
            <p>All content, scoring algorithms, data structures, and services provided by AskLizy remain the exclusive property of THELI SAS. The user undertakes not to reproduce, distribute, or exploit this information without prior authorization.</p>
            <p>Underlying place and review data is sourced from third-party APIs and remains the property of their respective owners.</p>

            <h3>6. Data Protection</h3>
            <p>AskLizy ensures compliance of its services with the GDPR. No personal information will be resold or used for unauthorized purposes.</p>
            <p>In accordance with the GDPR, each user has the right to access, modify, and delete their data. To exercise these rights: <a href="mailto:privacy@asklizy.com">privacy@asklizy.com</a></p>
            <p>The <Link href="/privacy">Privacy Policy</Link> details the data processing arrangements.</p>

            <h3>7. Liability</h3>
            <p>AskLizy is a decision-support tool. It does not provide certified footfall, legal, real-estate, or investment advice. Maps and review data may be incomplete, delayed, or rate-limited.</p>
            <p>AskLizy makes every effort to provide reliable information but cannot guarantee its absolute accuracy. The user is solely responsible for how they use the data and the consequences that follow.</p>
            <p>In case of non-compliance with these ToU, AskLizy reserves the right to temporarily or permanently suspend access to the service after notification.</p>

            <h3>8. Service Availability</h3>
            <p>AskLizy strives to ensure the availability of its services. However, temporary interruptions may occur due to technical constraints or external factors.</p>
            <p>A data source or API may become unavailable at any time. In such cases, AskLizy will endeavor to offer an alternative if one exists. If no alternative is available, the subscription will be suspended without payment obligation for the affected period.</p>

            <h3>9. Modifications</h3>
            <p>AskLizy reserves the right to modify these Terms of Use at any time. Any update will be communicated to users with one month&apos;s notice.</p>

            <h3>10. Applicable Law</h3>
            <p>These ToU are governed by French law. In case of dispute, the parties will endeavor to find an amicable solution. Failing that, any dispute shall be submitted to the exclusive jurisdiction of the Commercial Court of Paris.</p>

            {/* ============ GENERAL TERMS OF SALE ============ */}
            <h2 className="legal-section-title">General Terms of Sale (GTS)</h2>

            <h3>1. Purpose</h3>
            <p>These GTS define the terms for subscribing to and using AskLizy&apos;s services. They are governed by French law.</p>

            <h3>2. Service Description</h3>
            <p>AskLizy is a digital location intelligence platform that compares two addresses using nearby POIs, review data, ratings, competition density, and visitor estimates. It provides a 100-point location score and a detailed benchmark report.</p>
            <p>The service relies on third-party APIs (Google Maps, RapidAPI) for place and review data. AskLizy does not produce or modify the underlying data — official sources and direct verification take precedence in case of discrepancies.</p>

            <h3>3. Plans and Pricing</h3>
            <div className="legal-table-wrap">
              <table className="legal-table">
                <thead>
                  <tr><th>Plan</th><th>Price (ex-VAT)</th><th>Description</th></tr>
                </thead>
                <tbody>
                  <tr><td>Free</td><td>€0/month</td><td>10 benchmarks per month, basic report view, no export</td></tr>
                  <tr><td>Starter</td><td>€99/month</td><td>500 benchmarks per month, full report view, no export</td></tr>
                  <tr><td>Pro</td><td>€149/month</td><td>1,500 benchmarks per month, full report view, export enabled</td></tr>
                </tbody>
              </table>
            </div>
            <p>Prices are shown excluding VAT. VAT is calculated by Stripe based on the country and billing information provided. Payment is processed securely via Stripe.</p>
            <p>In case of payment default, access to the service may be suspended until regularized.</p>

            <h3>4. Delivery</h3>
            <p>Access to the service is activated immediately after payment confirmation.</p>

            <h3>5. Liability and Warranty</h3>
            <p>AskLizy cannot be held responsible for service interruptions beyond its control. The user is solely responsible for how they use the data.</p>
            <p>Support: <a href="mailto:contact@asklizy.com">contact@asklizy.com</a></p>

            <h3>6. Renewal and Cancellation</h3>
            <p>Monthly subscriptions auto-renew. Cancellation can be done at any time via the Stripe billing portal accessible in your <Link href="/account">account page</Link>. Cancellation takes effect at the end of the current billing period.</p>

            <h3>7. Refund Policy</h3>
            <p>No refunds will be granted for already-billed periods, except for billing errors or commercial goodwill at AskLizy&apos;s discretion.</p>
            <p>Any request relating to a billing error can be sent to <a href="mailto:contact@asklizy.com">contact@asklizy.com</a>.</p>

            <h3>8. Suspension During Prolonged Interruption</h3>
            <p>In the event of a prolonged service interruption beyond our control, subscriptions will be suspended and no payment will be required for the affected period.</p>

            <h3>9. Force Majeure</h3>
            <p>AskLizy cannot be held responsible for failures due to force majeure events (natural disasters, cyberattacks, third-party provider interruptions).</p>

            <h3>10. Applicable Law and Disputes</h3>
            <p>These GTS are governed by French law.</p>
            <p>In the event of a dispute, both parties undertake to attempt an amicable resolution within 30 days from written notification of the dispute. Failing that, any dispute shall be submitted to the exclusive jurisdiction of the Commercial Court of Paris.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
