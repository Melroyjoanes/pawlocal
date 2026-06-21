import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — PupStep',
  description: 'How PupStep collects, uses, and protects your personal data. Compliant with the Indian IT Act 2000 and SPDI Rules 2011.',
}

const LAST_UPDATED = '21 June 2025'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen py-12 px-4" style={{ background: '#FFFBEB' }}>
      <div className="max-w-3xl mx-auto">

        <div className="mb-10">
          <Link href="/" className="text-sm font-semibold" style={{ color: 'oklch(0.48 0.17 196)' }}>
            ← Back to PupStep
          </Link>
          <h1 className="text-4xl font-bold mt-4 mb-2" style={{ fontFamily: 'var(--font-fredoka)', color: '#0A2F35' }}>
            Privacy Policy
          </h1>
          <p className="text-sm" style={{ color: '#0A2F35', opacity: 0.5 }}>Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="prose prose-stone max-w-none space-y-8" style={{ fontFamily: 'var(--font-nunito)', color: '#0A2F35' }}>

          <section>
            <p className="text-sm leading-relaxed" style={{ opacity: 0.75 }}>
              PupStep (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is operated by Melroy Joanes, Juhu, Mumbai, Maharashtra, India.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit{' '}
              <strong>pupstep.in</strong> or use our mobile web application. Please read this policy carefully. If you disagree
              with its terms, please discontinue use of the site.
            </p>
            <p className="text-sm mt-3 leading-relaxed" style={{ opacity: 0.75 }}>
              This policy is published in compliance with the <strong>Information Technology Act, 2000</strong> and the{' '}
              <strong>Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or
              Information) Rules, 2011</strong> (SPDI Rules).
            </p>
          </section>

          <Section title="1. Information We Collect">
            <SubSection title="a. Information you provide directly">
              <ul>
                <li>Name, email address, and phone/WhatsApp number when you register or sign in</li>
                <li>Your dog&apos;s name, breed, date of birth, and health notes when you create a dog profile</li>
                <li>Business information (name, address, working hours, pricing) if you register as a service provider</li>
                <li>Walk session data including GPS coordinates, distance, and events (pee/poop logs and photos) captured during walks</li>
                <li>Payment information — processed exclusively by Razorpay. PupStep does not store your card number or banking credentials.</li>
                <li>Messages, requests, and feedback submitted through our platform</li>
              </ul>
            </SubSection>
            <SubSection title="b. Information collected automatically">
              <ul>
                <li>Device type, browser, and operating system</li>
                <li>IP address and approximate location (city level)</li>
                <li>Pages visited, time spent, and interaction patterns (via Google Analytics 4)</li>
                <li>GPS coordinates during active walk sessions (precise location, collected only while a walk is in progress)</li>
              </ul>
            </SubSection>
            <SubSection title="c. Sensitive Personal Data or Information (SPDI)">
              <p>
                Under SPDI Rules, location data and health information (including dog health notes) may qualify as sensitive.
                We collect this only with your explicit consent and for the purpose of delivering our core service: GPS-verified
                walk reports and pet health records.
              </p>
            </SubSection>
          </Section>

          <Section title="2. How We Use Your Information">
            <ul>
              <li>To provide GPS walk tracking, health diaries, and grooming records</li>
              <li>To connect dog parents with local service providers</li>
              <li>To process payments via Razorpay for PupStep Pro subscriptions</li>
              <li>To send walk reports and health summaries via WhatsApp (with your consent)</li>
              <li>To send transactional emails (booking confirmations, receipts, security alerts)</li>
              <li>To improve the platform and diagnose technical issues</li>
              <li>To comply with legal obligations</li>
            </ul>
            <p className="text-sm mt-3" style={{ opacity: 0.75 }}>
              We do <strong>not</strong> sell your personal data to third parties. We do not use your data for targeted
              advertising beyond our own platform.
            </p>
          </Section>

          <Section title="3. Sharing of Information">
            <p>We share your data only in these limited circumstances:</p>
            <ul>
              <li><strong>Service providers:</strong> Supabase (database and authentication), Razorpay (payments), Resend (email), Vercel (hosting). Each is bound by data processing agreements.</li>
              <li><strong>Other users:</strong> When you connect with a service provider, your name, dog&apos;s name, and WhatsApp number are visible to that provider. Walk report links are shareable only by the provider.</li>
              <li><strong>Legal requirements:</strong> If required by law, court order, or governmental authority in India.</li>
              <li><strong>Business transfer:</strong> In the event of a merger or acquisition, your data may be transferred. You will be notified via email before any such transfer.</li>
            </ul>
          </Section>

          <Section title="4. Location Data">
            <p>
              PupStep collects precise GPS location data during active walk sessions. This data is:
            </p>
            <ul>
              <li>Collected only when a walk session is explicitly started by a provider</li>
              <li>Used to compute walk distance, track routes, and generate walk reports for dog parents</li>
              <li>Stored in our Supabase database (Mumbai region, hosted on AWS)</li>
              <li>Accessible only to the provider who conducted the walk and the linked dog parent</li>
              <li>Not used for advertising or sold to third parties</li>
            </ul>
            <p className="text-sm mt-2" style={{ opacity: 0.75 }}>
              You can revoke location permission at any time through your browser or device settings. Revoking permission
              will disable GPS walk tracking features.
            </p>
          </Section>

          <Section title="5. Data Retention">
            <ul>
              <li>Account data: retained until you delete your account</li>
              <li>Walk session data and photos: retained for 3 years from session date, then permanently deleted</li>
              <li>Payment records: retained for 7 years as required under Indian tax law (Income Tax Act, 1961)</li>
              <li>Deleted accounts: personal data purged within 30 days of account deletion request; anonymised analytics data may be retained</li>
            </ul>
          </Section>

          <Section title="6. Security">
            <p>
              We implement industry-standard security measures including:
            </p>
            <ul>
              <li>TLS/HTTPS encryption for all data in transit</li>
              <li>Row-level security policies on our database (Supabase)</li>
              <li>Passwords are never stored — we use Google OAuth exclusively</li>
              <li>Payment data handled entirely by PCI-DSS compliant Razorpay</li>
            </ul>
            <p className="text-sm mt-2" style={{ opacity: 0.75 }}>
              No method of transmission over the internet is 100% secure. While we strive to protect your data,
              we cannot guarantee absolute security.
            </p>
          </Section>

          <Section title="7. Cookies">
            <p>
              We use essential cookies for authentication (Supabase session management) and analytics cookies via
              Google Analytics 4. You can disable non-essential cookies through your browser settings. Essential cookies
              are required for the site to function.
            </p>
          </Section>

          <Section title="8. Your Rights">
            <p>Under applicable Indian law and as a matter of policy, you have the right to:</p>
            <ul>
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
              <li><strong>Correction:</strong> Request correction of inaccurate data</li>
              <li><strong>Deletion:</strong> Request deletion of your account and associated personal data</li>
              <li><strong>Withdrawal of consent:</strong> Withdraw consent for location data or marketing communications at any time</li>
              <li><strong>Portability:</strong> Request your walk history and health records in a machine-readable format (JSON/CSV)</li>
            </ul>
            <p className="text-sm mt-3" style={{ opacity: 0.75 }}>
              To exercise any of these rights, email us at <strong>melroy@verfolia.com</strong> with the subject line
              &quot;Data Request — [your request type]&quot;. We will respond within 30 days.
            </p>
          </Section>

          <Section title="9. Children's Privacy">
            <p>
              PupStep is not intended for use by persons under the age of 18. We do not knowingly collect personal
              data from minors. If you believe a minor has provided us with personal data, contact us immediately at
              melroy@verfolia.com and we will delete it.
            </p>
          </Section>

          <Section title="10. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated
              &quot;Last updated&quot; date. For material changes, we will notify you via email or a prominent notice on the
              website at least 7 days before the change takes effect.
            </p>
          </Section>

          <Section title="11. Grievance Officer">
            <div className="bg-white rounded-2xl border border-stone-200 p-5 mt-2">
              <p className="font-bold text-base mb-3" style={{ color: '#0A2F35' }}>Designated Grievance Officer</p>
              <p className="text-sm leading-loose" style={{ opacity: 0.8 }}>
                <strong>Name:</strong> Melroy Joanes<br />
                <strong>Designation:</strong> Founder &amp; Grievance Officer<br />
                <strong>Email:</strong> <a href="mailto:melroy@verfolia.com" style={{ color: 'oklch(0.48 0.17 196)' }}>melroy@verfolia.com</a><br />
                <strong>Address:</strong> PupStep, Juhu, Mumbai, Maharashtra — 400049, India<br />
                <strong>Response time:</strong> Within 30 days of receiving a complaint
              </p>
              <p className="text-xs mt-3" style={{ opacity: 0.5 }}>
                Published in compliance with Rule 5(9) of the SPDI Rules, 2011 and Rule 3(2) of the IT
                (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021.
              </p>
            </div>
          </Section>

          <Section title="12. Contact Us">
            <p>
              For any questions about this Privacy Policy, contact us at:{' '}
              <a href="mailto:melroy@verfolia.com" style={{ color: 'oklch(0.48 0.17 196)' }}>melroy@verfolia.com</a>
              {' '}or through our <Link href="/contact" style={{ color: 'oklch(0.48 0.17 196)' }}>Contact page</Link>.
            </p>
          </Section>

        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold mb-3" style={{ fontFamily: 'var(--font-fredoka)', color: '#0A2F35' }}>{title}</h2>
      <div className="text-sm leading-relaxed space-y-2" style={{ opacity: 0.8 }}>{children}</div>
    </section>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <h3 className="font-bold text-sm mb-1" style={{ color: '#0A2F35' }}>{title}</h3>
      {children}
    </div>
  )
}
