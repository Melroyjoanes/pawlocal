import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy — PupStep',
  description: 'PupStep refund and cancellation policy for Pro subscriptions. Understand when and how refunds are processed.',
}

const LAST_UPDATED = '21 June 2025'

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen py-12 px-4" style={{ background: '#FFFBEB' }}>
      <div className="max-w-3xl mx-auto">

        <div className="mb-10">
          <Link href="/" className="text-sm font-semibold" style={{ color: 'oklch(0.48 0.17 196)' }}>
            ← Back to PupStep
          </Link>
          <h1 className="text-4xl font-bold mt-4 mb-2" style={{ fontFamily: 'var(--font-fredoka)', color: '#0A2F35' }}>
            Refund &amp; Cancellation Policy
          </h1>
          <p className="text-sm" style={{ color: '#0A2F35', opacity: 0.5 }}>Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="space-y-8" style={{ fontFamily: 'var(--font-nunito)', color: '#0A2F35' }}>

          <p className="text-sm leading-relaxed" style={{ opacity: 0.75 }}>
            This policy applies to PupStep Pro subscriptions purchased on <strong>pupstep.in</strong>. Please read it
            carefully before subscribing. For questions, contact us at{' '}
            <a href="mailto:melroy@verfolia.com" style={{ color: 'oklch(0.48 0.17 196)' }}>melroy@verfolia.com</a>.
          </p>

          {/* Quick summary card */}
          <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #e5e7eb' }}>
            <p className="font-bold text-sm mb-3" style={{ color: '#0A2F35' }}>Quick Summary</p>
            <div className="text-sm">
              <div className="rounded-xl p-3" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <p className="font-bold text-green-800 mb-1">Monthly Plan (₹199)</p>
                <p className="text-green-700 text-xs leading-relaxed">Full refund within 7 days of first payment. Cancel anytime — no charge for the next cycle.</p>
              </div>
            </div>
          </div>

          <Section title="1. What This Policy Covers">
            <p>
              This policy covers refunds and cancellations for <strong>PupStep Pro</strong> subscriptions (₹199/month). PupStep itself has no listing fees, booking commissions, or charges for service
              providers — only the Pro subscription for dog parents is a paid product.
            </p>
          </Section>

          <Section title="2. Cancellation">
            <ul>
              <li>Plans do not auto-renew, so there is nothing to cancel — your access simply ends 30 days after payment unless you renew manually.</li>
              <li>Your Pro access always continues until the end of the paid 30-day period.</li>
              <li>No charge is ever made without your explicit action.</li>
              <li>No partial refund is issued for unused days within an already-paid period.</li>
            </ul>
          </Section>

          <Section title="3. Refund Eligibility">
            <ul>
              <li><strong>Within 7 days of the first payment:</strong> Full refund of ₹199, no questions asked.</li>
              <li><strong>After 7 days:</strong> No refund for the current 30-day period.</li>
              <li><strong>Renewal payments:</strong> Plans do not auto-renew — every payment is made manually by you. If you paid by mistake, contact us within 48 hours for a full refund.</li>
            </ul>
            <SubSection title="Non-refundable situations">
              <ul>
                <li>Refund requests citing reasons within your control (e.g., &quot;my dog passed away&quot; — we are deeply sorry, and will always process a compassionate refund in such cases)</li>
                <li>Accounts suspended for violation of our Terms &amp; Conditions</li>
                <li>Payments made through third-party promotions or gift codes</li>
              </ul>
            </SubSection>
          </Section>

          <Section title="4. How to Request a Refund">
            <ol className="list-decimal list-inside space-y-2">
              <li>Email <a href="mailto:melroy@verfolia.com" style={{ color: 'oklch(0.48 0.17 196)' }}>melroy@verfolia.com</a> with the subject: <strong>&quot;Refund Request — PupStep Pro&quot;</strong></li>
              <li>Include your registered email address and the Razorpay payment ID (available in your payment confirmation email)</li>
              <li>Briefly describe the reason for your refund request</li>
            </ol>
            <p className="mt-3">
              We will acknowledge your request within <strong>2 business days</strong> and process eligible refunds within
              <strong> 7–10 business days</strong>. Refunds are credited to the original payment method (debit card, credit
              card, UPI, or net banking) via Razorpay.
            </p>
          </Section>

          <Section title="5. Payment Failures">
            <p>
              If a payment fails mid-transaction (network error, bank decline, etc.) and your account was debited,
              the amount is typically returned automatically by your bank or Razorpay within 5–7 business days.
              If not received, email us with your Razorpay payment ID and we will initiate a manual investigation.
            </p>
          </Section>

          <Section title="6. Service Downtime">
            <p>
              If PupStep is unavailable for more than 72 consecutive hours due to our fault, you are entitled to a
              pro-rated credit for the affected period added to your subscription. We do not issue cash refunds for
              downtime unless the outage extends beyond 7 consecutive days.
            </p>
          </Section>

          <Section title="7. Changes to This Policy">
            <p>
              We may update this policy at any time. Changes will be posted on this page and take effect from the
              date of posting. For material changes, we will notify active subscribers by email at least 7 days in advance.
            </p>
          </Section>

          <Section title="8. Contact">
            <div className="bg-white rounded-2xl border border-stone-200 p-5 mt-2">
              <p className="text-sm leading-loose" style={{ opacity: 0.8 }}>
                <strong>Email:</strong>{' '}
                <a href="mailto:melroy@verfolia.com" style={{ color: 'oklch(0.48 0.17 196)' }}>melroy@verfolia.com</a><br />
                <strong>Subject line:</strong> Refund Request — PupStep Pro<br />
                <strong>Response time:</strong> Within 2 business days<br />
                <strong>Address:</strong> PupStep, Juhu, Mumbai, Maharashtra — 400049, India
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

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <h3 className="font-bold text-sm mb-1" style={{ color: '#0A2F35' }}>{title}</h3>
      {children}
    </div>
  )
}
