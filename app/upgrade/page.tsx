'use client';
// ============================================================
// /upgrade — plans & billing page for web hosts
//
// Shows Free / Basic / Premium cards with the user's current tier and
// remaining quota (GET /api/billing/status). Subscribe buttons start a
// Stripe Checkout hosted-page flow (POST /api/billing/checkout) and
// redirect to Stripe; existing subscribers get the Billing Portal.
//
// Stripe redirects back here with ?status=success|cancelled. After a
// success we poll the status endpoint until the webhook has activated
// the tier (usually a couple of seconds).
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthProvider';
import { useLocale } from '@/context/LocaleProvider';
import { PLANS, FREE_TRIAL_CREATES, TEST_PLAN, type PaidPlan } from '@/lib/billing-plans';
import { playSound } from '@/lib/sounds';

interface QuotaInfo {
  used: number;
  limit: number;
  remaining: number;
}

interface BillingStatus {
  tier: 'free' | 'basic' | 'premium';
  status: string;
  hasStripeCustomer: boolean;
  quota: QuotaInfo;
}

type Banner = 'success' | 'activating' | 'cancelled' | null;

function priceLabel(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

export default function UpgradePage() {
  const { user, session, loading: authLoading, signInWithGoogle } = useAuth();
  const { t } = useLocale();

  const accessToken = session?.access_token ?? null;

  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [banner, setBanner] = useState<Banner>(null);
  const [busyPlan, setBusyPlan] = useState<PaidPlan | 'test' | 'portal' | null>(null);
  const [error, setError] = useState<string | null>(null);
  // TEMPORARY: ?test=1 reveals the $1 Stripe Live Mode verification SKU.
  // Remove this + the 'test' card below once the provider confirms Live
  // Mode works (see lib/billing-plans.ts TEST_PLAN).
  const [showTestPlan, setShowTestPlan] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStatus = useCallback(async (): Promise<BillingStatus | null> => {
    if (!accessToken) return null;
    try {
      const res = await fetch('/api/billing/status', {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      if (!res.ok) return null;
      const data = (await res.json()) as BillingStatus;
      setStatus(data);
      return data;
    } catch {
      return null;
    }
  }, [accessToken]);

  // Read the Stripe redirect outcome from the URL once on mount. Deferred a
  // tick so hydration completes with the prerendered (banner-less) markup.
  useEffect(() => {
    const id = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const s = params.get('status');
      if (s === 'success') setBanner('activating');
      else if (s === 'cancelled') setBanner('cancelled');
      if (params.get('test') === '1') setShowTestPlan(true);
    }, 0);
    return () => clearTimeout(id);
  }, []);

  // Load status when signed in; after a successful payment keep polling
  // until the webhook flips the tier (max ~30s).
  useEffect(() => {
    if (authLoading || !accessToken) return;

    let attempts = 0;
    let cancelled = false;

    const load = async () => {
      const data = await fetchStatus();
      if (cancelled) return;
      if (banner === 'activating') {
        if (data && data.tier !== 'free') {
          setBanner('success');
          return;
        }
        attempts += 1;
        if (attempts < 15) {
          pollTimer.current = setTimeout(load, 2000);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [authLoading, accessToken, banner, fetchStatus]);

  async function startCheckout(plan: PaidPlan | 'test') {
    playSound('click');
    setError(null);
    if (!accessToken) {
      try {
        await signInWithGoogle();
      } catch {
        setError(t('billing.checkoutError'));
      }
      return;
    }
    setBusyPlan(plan);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        cache: 'no-store',
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? t('billing.checkoutError'));
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('billing.checkoutError'));
      setBusyPlan(null);
    }
  }

  async function openPortal() {
    playSound('click');
    setError(null);
    if (!accessToken) return;
    setBusyPlan('portal');
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? t('billing.checkoutError'));
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('billing.checkoutError'));
      setBusyPlan(null);
    }
  }

  const tier = status?.tier ?? 'free';
  const quota = status?.quota ?? null;

  const planCards: Array<{
    id: 'free' | PaidPlan | 'test';
    name: string;
    price: string;
    includes: string;
  }> = [
    {
      id: 'free',
      name: t('billing.planFree'),
      price: '$0',
      includes: t('billing.freeIncludes', { n: FREE_TRIAL_CREATES }),
    },
    {
      id: 'basic',
      name: t('billing.planBasic'),
      price: priceLabel(PLANS.basic.priceCents),
      includes: t('billing.quizzesPerMonth', { n: PLANS.basic.monthlyQuizzes }),
    },
    {
      id: 'premium',
      name: t('billing.planPremium'),
      price: priceLabel(PLANS.premium.priceCents),
      includes: t('billing.quizzesPerMonth', { n: PLANS.premium.monthlyQuizzes }),
    },
    // TEMPORARY: only shown via /upgrade?test=1 — see TEST_PLAN in
    // lib/billing-plans.ts. Remove once Live Mode is verified.
    ...(showTestPlan
      ? [
          {
            id: 'test' as const,
            name: TEST_PLAN.name,
            price: priceLabel(TEST_PLAN.priceCents),
            includes: 'Stripe Live Mode verification charge (temporary, not a real plan).',
          },
        ]
      : []),
  ];

  return (
    <main className="relative flex flex-col items-center min-h-dvh px-4 sm:px-6 py-8 sm:py-12">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            {t('billing.title')}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            {t('billing.subtitle')}
          </p>
        </div>

        {banner === 'activating' && (
          <div
            className="rounded-xl px-4 py-3 text-sm text-center"
            style={{ background: 'rgba(47,125,119,0.10)', border: '1px solid var(--accent)' }}
          >
            <span className="inline-flex items-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
              {t('billing.paymentActivating')}
            </span>
          </div>
        )}
        {banner === 'success' && (
          <div
            className="rounded-xl px-4 py-3 text-sm text-center"
            style={{ background: 'rgba(47,125,119,0.10)', border: '1px solid var(--accent)' }}
          >
            {t('billing.paymentSuccess')}
          </div>
        )}
        {banner === 'cancelled' && (
          <div
            className="rounded-xl px-4 py-3 text-sm text-center"
            style={{ background: 'rgba(214,87,69,0.10)', border: '1px solid var(--wrong)' }}
          >
            {t('billing.paymentCancelled')}
          </div>
        )}
        {error && (
          <div
            className="rounded-xl px-4 py-3 text-sm text-center"
            style={{ background: 'rgba(214,87,69,0.10)', border: '1px solid var(--wrong)', color: 'var(--wrong)' }}
          >
            {error}
          </div>
        )}

        {user && quota && (
          <p className="text-center text-sm text-[var(--text-secondary)]">
            {tier === 'free'
              ? t('billing.remainingFree', { n: quota.remaining, limit: quota.limit })
              : t('billing.remainingMonthly', { n: quota.remaining, limit: quota.limit })}
          </p>
        )}
        {!user && !authLoading && (
          <p className="text-center text-sm text-[var(--text-muted)]">
            {t('billing.signInFirst')}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          {planCards.map((plan) => {
            const isCurrent = tier === plan.id;
            return (
              <div
                key={plan.id}
                className="card elevated flex flex-col gap-3 p-5"
                style={isCurrent ? { border: '2px solid var(--accent)' } : undefined}
              >
                <div className="flex items-baseline justify-between">
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">{plan.name}</h2>
                  <span className="text-base font-semibold text-[var(--text-primary)]">
                    {plan.price}
                    {plan.id !== 'free' && (
                      <span className="text-xs font-normal text-[var(--text-muted)]">
                        {t('billing.perMonth')}
                      </span>
                    )}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] flex-1">{plan.includes}</p>

                {isCurrent ? (
                  <div className="text-center text-xs font-semibold uppercase tracking-wider text-[var(--accent)] py-2.5">
                    {t('billing.currentPlan')}
                  </div>
                ) : plan.id !== 'free' ? (
                  <button
                    type="button"
                    disabled={busyPlan !== null || authLoading}
                    onClick={() => startCheckout(plan.id)}
                    className="keycap keycap-primary py-2.5 rounded-xl font-semibold text-sm text-white"
                  >
                    {busyPlan === plan.id ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <span className="w-4 h-4 rounded-full border-2 border-[var(--border-strong)] border-t-white animate-spin" />
                      </span>
                    ) : (
                      t('billing.subscribe')
                    )}
                  </button>
                ) : (
                  <div className="py-2.5" />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-3">
          {user && status?.hasStripeCustomer && (
            <button
              type="button"
              disabled={busyPlan !== null}
              onClick={openPortal}
              className="keycap keycap-secondary px-5 py-2.5 rounded-xl text-sm font-medium"
            >
              {t('billing.manage')}
            </button>
          )}
          <Link
            href="/"
            className="text-sm text-[var(--text-muted)] underline hover:text-[var(--text-secondary)]"
          >
            {t('billing.backHome')}
          </Link>
        </div>
      </div>
    </main>
  );
}
