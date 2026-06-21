import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms & Conditions — PupStep',
  description: 'Terms and conditions governing use of the PupStep platform for dog parents and service providers in Mumbai.',
}

const LAST_UPDATED = '21 June 2025'

export default function TermsPage() {
  return (
    <div className="min-h-screen py-12 px-4" style={{ background: '#FFFBEB' }}>
      <div className="max-w-3xl mx-auto">

        <div className="mb-10">
          <Link href="/" className="text-sm font-semibold" style={{ color: 'oklch(0.48 0.17 196)' }}>
            ← Back to PupStep
          </Link>
          <h1 className="text-4xl font-bold mt-4 mb-2" style={{ fontFamily: 'var(--font-fredoka)', color: '#0A2F35' }}>
            Terms &amp; Conditions
          </h1>
          <p className="text-sm" style={{ color: '#0A2F35', opacity: 0.5 }}>Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="space-y-8" style={{ fontFamily: 'var(--font-nunito)', color: '#0A2F35' }}>

          <p className="text-sm leading-relaxed" style={{ opacity: 0.75 }}>
            These Terms &amp; Conditions (&quot;Terms&quot;) govern your use of PupStep (&quot;Platform&quot;), operated by Melroy D&apos;Souza,
            Juhu, Mumbai, Maharashtra, India (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;). By accessing or using PupStep, you agree to be
            bound by these Terms. If you do not agree, please do not use the Platform.
          </p>

          <Section title="1. Who We Are">
            <p>
              PupStep is a hyperlocal pet services platform connecting Mumbai dog parents with verified local service
              providers (walkers, groomers, vets, trainers, and pet stores). We operate as an intermediary under the
              Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021.
            </p>
          </Section>

          <Section title="2. Eligibility">
            <ul>
              <li>You must be at least 18 years of age to use PupStep.</li>
              <li>By using the Platform, you represent that all information you provide is accurate and current.</li>
              <li>PupStep is currently available only within Mumbai, India.</li>
            </ul>
          </Section>

          <Section title="3. User Accounts">
            <ul>
              <li>You must sign in using Google OAuth. You are responsible for all activity under your account.</li>
              <li>You may not share your account credentials with others.</li>
              <li>We reserve the right to suspend or terminate accounts that violate these Terms.</li>
            </ul>
          </Section>

          <Section title="4. Service Providers">
            <ul>
              <li>Providers listed on PupStep are independent professionals, not employees of PupStep.</li>
              <li>All service agreements, pricing, and scheduling are directly between the provider and the dog parent.</li>
              <li>PupStep does not charge a booking commission or take a cut from service transactions.</li>
              <li>Provider listings are manually reviewed before approval. We reserve the right to reject or remove listings at our discretion.</li>
              <li>Providers using the GPS walk tracking feature must obtain explicit consent from dog parents before starting a session.</li>
            </ul>
          </Section>

          <Section title="5. PupStep Pro Subscription (Dog Parents)">
            <ul>
              <li><strong>Monthly plan:</strong> ₹249/month, billed monthly.</li>
              <li><strong>Annual plan:</strong> ₹1,999/year, billed annually (equivalent to ₹166/month).</li>
              <li>Payments are processed securely by Razorpay. By subscribing, you also agree to Razorpay&apos;s{' '}
                <a href="https://razorpay.com/terms/" target="_blank" rel="noopener noreferrer" style={{ color: 'oklch(0.48 0.17 196)' }}>
                  Terms of Service
                </a>.
              </li>
              <li>Subscriptions auto-renew. You may cancel at any time from your account settings before the next billing date.</li>
              <li>Please refer to our <Link href="/refund-policy" style={{ color: 'oklch(0.48 0.17 196)' }}>Refund &amp; Cancellation Policy</Link> for details on refunds.</li>
            </ul>
          </Section>

          <Section title="6. Provider Listing (Free)">
            <p>
              Listing a business on PupStep is free. There are no charges for providers to appear in the directory,
              receive client connections, or use GPS walk tracking features. We reserve the right to introduce
              premium provider features in the future with advance notice.
            </p>
          </Section>

          <Section title="7. GPS Walk Tracking &amp; Walk Reports">
            <ul>
              <li>GPS walk reports are generated automatically from data collected during active walk sessions.</li>
              <li>PupStep does not guarantee the accuracy of GPS data — device GPS accuracy may vary.</li>
              <li>Walk reports are informational and not a substitute for direct communication between providers and dog parents.</li>
              <li>Poop photos uploaded during walks are stored in our secure cloud storage and are accessible only to the provider and the linked dog parent.</li>
            </ul>
          </Section>

          <Section title="8. Prohibited Conduct">
            <p>You agree not to:</p>
            <ul>
              <li>Use the Platform for any unlawful purpose or in violation of any Indian law</li>
              <li>Post false, misleading, or fraudulent information (provider listings, reviews, or requests)</li>
              <li>Harass, threaten, or harm other users or providers</li>
              <li>Scrape, crawl, or extract data from the Platform without written permission</li>
              <li>Attempt to gain unauthorised access to any account, server, or database</li>
              <li>Upload content that is defamatory, obscene, or violates third-party intellectual property rights</li>
            </ul>
          </Section>

          <Section title="9. Content &amp; Intellectual Property">
            <ul>
              <li>All content on PupStep (design, copy, code) is owned by PupStep unless stated otherwise.</li>
              <li>Walk photos and dog profile photos you upload remain your property. You grant PupStep a limited licence to store and display them to you and your connected providers.</li>
              <li>Provider listings: by submitting a listing, you grant PupStep permission to display your business information on the Platform.</li>
            </ul>
          </Section>

          <Section title="10. Disclaimer of Warranties">
            <p>
              PupStep is provided &quot;as is&quot; without warranties of any kind. We do not warrant that the Platform
              will be uninterrupted, error-free, or that provider information is complete or accurate. Your use of
              the Platform and reliance on any listed provider is at your own risk.
            </p>
          </Section>

          <Section title="11. Limitation of Liability">
            <p>
              To the maximum extent permitted by law, PupStep and its operators shall not be liable for any
              indirect, incidental, or consequential damages arising from your use of the Platform, including but
              not limited to: loss of data, injury to your pet, disputes with service providers, or service
              interruptions. Our total liability to you shall not exceed the amount paid by you to PupStep in the
              3 months preceding the claim.
            </p>
          </Section>

          <Section title="12. Governing Law &amp; Dispute Resolution">
            <p>
              These Terms are governed by the laws of India. Any dispute arising from these Terms shall be subject
              to the exclusive jurisdiction of the courts in Mumbai, Maharashtra. Before initiating legal proceedings,
              you agree to attempt resolution through our Grievance Officer (see below) for a period of 30 days.
            </p>
          </Section>

          <Section title="13. Changes to Terms">
            <p>
              We may update these Terms at any time. We will notify you of material changes via email or a prominent
              notice on the Platform at least 7 days before they take effect. Continued use after that date constitutes
              acceptance of the updated Terms.
            </p>
          </Section>

          <Section title="14. Contact &amp; Grievance Officer">
            <div className="bg-white rounded-2xl border border-stone-200 p-5 mt-2">
              <p className="font-bold text-base mb-3" style={{ color: '#0A2F35' }}>Grievance Officer</p>
              <p className="text-sm leading-loose" style={{ opacity: 0.8 }}>
                <strong>Name:</strong> Melroy D&apos;Souza<br />
                <strong>Designation:</strong> Founder &amp; Grievance Officer<br />
                <strong>Email:</strong>{' '}
                <a href="mailto:melroy@verfolia.com" style={{ color: 'oklch(0.48 0.17 196)' }}>melroy@verfolia.com</a><br />
                <strong>Address:</strong> PupStep, Juhu, Mumbai, Maharashtra — 400049, India<br />
                <strong>Response time:</strong> Within 30 days of receiving a complaint
              </p>
            </div>
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
