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

/** Sent once, right after checkout.session.completed activates a subscription. */
export async function sendSubscriptionActivatedEmail(toEmail: string): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping activation email to', toEmail);
    return;
  }

  const text = `Здравствуйте!

Спасибо за оплату. Ваша подписка успешно активирована.

Управлять подпиской или отменить её можно по этой ссылке:
${MANAGE_SUBSCRIPTION_URL}

Просто перейдите по ссылке, введите свой email — и вы попадёте в личный кабинет управления подпиской.

Если возникнут вопросы — просто ответьте на это письмо.

С уважением,
Команда Who's Smarter
support@whosmarter.com`;

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: toEmail,
      subject: 'Ваша подписка активирована — Who’s Smarter',
      text,
    });
    if (error) throw error;
  } catch (err) {
    const message = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('[email] Failed to send activation email to', toEmail, ':', message);
  }
}
