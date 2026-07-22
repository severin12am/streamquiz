// ============================================================
// WhoSmarter — Support page content (per-locale)
// Rendered by app/support/page.tsx. Falls back to `en`.
// ============================================================

// Stripe's permanent Customer Portal "login page" link — same URL works
// for every customer (they verify by email, no whosmarter.com account
// needed). Configured via the Billing Portal API; see chat history for
// context. Update here if the Stripe billing portal configuration is ever
// recreated (the id would change).
const MANAGE_SUBSCRIPTION_URL = 'https://billing.stripe.com/p/login/3cI28q1ZX1h24vTcBkeEo00';

export const support = {
  en: {
    pageTitle: 'Support',
    tagline: 'Real-time multiplayer quiz with AI questions',
    intro: 'Need help with WhoSmarter?',
    emailLabel: 'Email Support',
    email: 'support@whosmarter.com',
    reply: 'We usually reply within 24–48 hours.',
    websiteLabel: 'Website',
    websiteHint: 'Play the web version and see the latest updates.',
    websiteUrl: 'https://whosmarter.com/',
    manageLabel: 'Manage or Cancel Subscription',
    manageHint: "Open your subscription billing portal (you'll be asked for the email used at checkout).",
    manageUrl: MANAGE_SUBSCRIPTION_URL,
    footer:
      'For account issues, billing questions, or technical problems with the web app, email us and include as much detail as you can.',
  },

  ru: {
    pageTitle: 'Поддержка',
    tagline: 'Мультиплеерная викторина в реальном времени с вопросами от ИИ',
    intro: 'Нужна помощь с WhoSmarter?',
    emailLabel: 'Email поддержки',
    email: 'support@whosmarter.com',
    reply: 'Обычно отвечаем в течение 24–48 часов.',
    websiteLabel: 'Сайт',
    websiteHint: 'Играйте в веб-версии и следите за обновлениями.',
    websiteUrl: 'https://whosmarter.com/',
    manageLabel: 'Управление подпиской / отмена',
    manageHint: 'Откроет портал управления подпиской (попросит email, указанный при оплате).',
    manageUrl: MANAGE_SUBSCRIPTION_URL,
    footer:
      'По вопросам аккаунта, оплаты или технических проблем с веб-приложением напишите нам и укажите как можно больше деталей.',
  },

  es: {
    pageTitle: 'Soporte',
    tagline: 'Concurso multijugador en tiempo real con preguntas de IA',
    intro: '¿Necesitas ayuda con WhoSmarter?',
    emailLabel: 'Soporte por email',
    email: 'support@whosmarter.com',
    reply: 'Solemos responder en 24–48 horas.',
    websiteLabel: 'Sitio web',
    websiteHint: 'Juega la versión web y consulta las novedades.',
    websiteUrl: 'https://whosmarter.com/',
    manageLabel: 'Gestionar o cancelar la suscripción',
    manageHint: 'Abre el portal de facturación de tu suscripción (te pedirá el email usado al pagar).',
    manageUrl: MANAGE_SUBSCRIPTION_URL,
    footer:
      'Para problemas de cuenta, facturación o técnicos con la app web, escríbenos e incluye todos los detalles que puedas.',
  },

  fr: {
    pageTitle: 'Assistance',
    tagline: 'Quiz multijoueur en temps réel avec questions IA',
    intro: 'Besoin d’aide avec WhoSmarter ?',
    emailLabel: 'Assistance par e-mail',
    email: 'support@whosmarter.com',
    reply: 'Nous répondons généralement sous 24 à 48 heures.',
    websiteLabel: 'Site web',
    websiteHint: 'Jouez sur la version web et consultez les dernières mises à jour.',
    websiteUrl: 'https://whosmarter.com/',
    manageLabel: 'Gérer ou annuler l’abonnement',
    manageHint: 'Ouvre le portail de facturation de votre abonnement (l’e-mail utilisé au paiement vous sera demandé).',
    manageUrl: MANAGE_SUBSCRIPTION_URL,
    footer:
      'Pour les problèmes de compte, de facturation ou techniques avec l’application web, contactez-nous par e-mail avec un maximum de détails.',
  },

  de: {
    pageTitle: 'Support',
    tagline: 'Echtzeit-Multiplayer-Quiz mit KI-Fragen',
    intro: 'Brauchst du Hilfe mit WhoSmarter?',
    emailLabel: 'E-Mail-Support',
    email: 'support@whosmarter.com',
    reply: 'Wir antworten in der Regel innerhalb von 24–48 Stunden.',
    websiteLabel: 'Website',
    websiteHint: 'Spiele die Webversion und sieh dir die neuesten Updates an.',
    websiteUrl: 'https://whosmarter.com/',
    manageLabel: 'Abo verwalten oder kündigen',
    manageHint: 'Öffnet dein Abrechnungsportal (du wirst nach der beim Bezahlen verwendeten E-Mail gefragt).',
    manageUrl: MANAGE_SUBSCRIPTION_URL,
    footer:
      'Bei Kontoproblemen, Abrechnungsfragen oder technischen Problemen mit der Web-App schreib uns eine E-Mail mit möglichst vielen Details.',
  },

  ja: {
    pageTitle: 'サポート',
    tagline: 'AI問題のリアルタイムマルチプレイヤークイズ',
    intro: 'WhoSmarterでお困りですか？',
    emailLabel: 'メールサポート',
    email: 'support@whosmarter.com',
    reply: '通常24〜48時間以内に返信します。',
    websiteLabel: 'ウェブサイト',
    websiteHint: 'Web版でプレイし、最新情報をご確認ください。',
    websiteUrl: 'https://whosmarter.com/',
    manageLabel: 'サブスクリプションの管理・解約',
    manageHint: 'サブスクリプション管理ポータルを開きます（お支払い時のメールアドレスの入力が必要です）。',
    manageUrl: MANAGE_SUBSCRIPTION_URL,
    footer:
      'アカウント、請求、Webアプリの技術的な問題については、できるだけ詳しくメールでお問い合わせください。',
  },

  ar: {
    pageTitle: 'الدعم',
    tagline: 'مسابقة جماعية مباشرة بأسئلة من الذكاء الاصطناعي',
    intro: 'هل تحتاج مساعدة مع WhoSmarter؟',
    emailLabel: 'الدعم عبر البريد',
    email: 'support@whosmarter.com',
    reply: 'نرد عادةً خلال 24–48 ساعة.',
    websiteLabel: 'الموقع',
    websiteHint: 'العب النسخة على الويب واطّلع على آخر التحديثات.',
    websiteUrl: 'https://whosmarter.com/',
    manageLabel: 'إدارة أو إلغاء الاشتراك',
    manageHint: 'يفتح بوابة إدارة الفوترة لاشتراكك (سيُطلب منك البريد الإلكتروني المستخدم عند الدفع).',
    manageUrl: MANAGE_SUBSCRIPTION_URL,
    footer:
      'لمشاكل الحساب أو الفوترة أو المشاكل التقنية في تطبيق الويب، راسلنا مع أكبر قدر ممكن من التفاصيل.',
  },
} as const;

export type SupportLocale = keyof typeof support;
export type SupportStrings = (typeof support)[SupportLocale];
