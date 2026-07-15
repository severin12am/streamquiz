import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy & Support — WhoSmarter',
  description:
    'How WhoSmarter collects, uses, and protects your information, plus how to contact support.',
};

export default function PrivacyLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
