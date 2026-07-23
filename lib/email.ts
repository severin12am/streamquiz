// ============================================================
// WhoSmarter — transactional emails (SERVER ONLY, via Resend)
//
// Sent from the Stripe webhook (app/api/stripe/webhook/route.ts) — the
// single authoritative place a subscription gets activated. Every sender
// here swallows its own errors: a broken/missing email must never fail
// the webhook response, or Stripe will keep retrying the whole event.
// ============================================================

import { getResend } from '@/lib/resend';

const FROM = "Who's Smarter <support@whosmarter.com>";

// Stripe's permanent Customer Portal login link — same URL for every
// customer, they verify by email, no whosmarter.com account needed.
const MANAGE_SUBSCRIPTION_URL = 'https://billing.stripe.com/p/login/3cI28q1ZX1h24vTcBkeEo00';

/** Sent once, right after checkout.session.completed activates a subscription.
 * `productName` (e.g. "WhoSmarter Basic") is shown so the customer — and the
 * payment provider reviewing the flow — can see exactly what was purchased. */
export async function sendSubscriptionActivatedEmail(
  toEmail: string,
  productName?: string | null,
): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping activation email to', toEmail);
    return;
  }

  const productLine = productName
    ? `\nPlan purchased: ${productName}\n`
    : '';

  // Always English, regardless of the site locale the customer paid in —
  // standard practice for transactional emails (see chat history for why).
  const text = `Hello!

Thank you for your payment. Your subscription has been successfully activated.
${productLine}
You can manage or cancel your subscription here:
${MANAGE_SUBSCRIPTION_URL}

Just open the link and enter your email — you'll be taken to your subscription management page.

If you have any questions, just reply to this email.

Best regards,
The Who's Smarter Team
support@whosmarter.com`;

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: toEmail,
      subject: "Your subscription is active — Who's Smarter",
      text,
    });
    if (error) throw error;
  } catch (err) {
    const message = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('[email] Failed to send activation email to', toEmail, ':', message);
  }
}
