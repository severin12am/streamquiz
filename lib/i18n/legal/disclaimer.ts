// ============================================================
// WhoSmarter — IP / trademark disclaimer (per-locale)
//
// Shown in the site footer on every page (except during a game).
// The support email is intentionally left untranslated.
// Falls back to `en` for any locale not listed here.
// ============================================================

export const disclaimer = {
  en: 'Quiz topics are entered by users and generated automatically. Any brand names, titles, or franchises that may appear in user-created quiz topics or questions are trademarks or copyrighted works of their respective owners. WhoSmarter is an independent product and is not affiliated with, endorsed by, or sponsored by any of these rights holders. If you believe content on this service infringes your intellectual property rights, please contact us at support@whosmarter.app.',

  ru: 'Темы викторин вводят пользователи, а вопросы генерируются автоматически. Любые названия брендов, произведений или франшиз, которые могут появиться в темах или вопросах, созданных пользователями, являются товарными знаками или объектами авторского права их соответствующих владельцев. WhoSmarter — независимый продукт и не связан, не одобрен и не спонсируется этими правообладателями. Если вы считаете, что контент на сервисе нарушает ваши права на интеллектуальную собственность, свяжитесь с нами: support@whosmarter.app.',

  es: 'Los temas de los concursos los introducen los usuarios y se generan automáticamente. Cualquier nombre de marca, título o franquicia que pueda aparecer en temas o preguntas creados por usuarios son marcas registradas u obras protegidas por derechos de autor de sus respectivos titulares. WhoSmarter es un producto independiente y no está afiliado, respaldado ni patrocinado por ninguno de estos titulares de derechos. Si cree que algún contenido de este servicio infringe sus derechos de propiedad intelectual, contáctenos en support@whosmarter.app.',

  fr: 'Les sujets de quiz sont saisis par les utilisateurs et générés automatiquement. Toute marque, titre ou franchise pouvant apparaître dans les sujets ou questions créés par les utilisateurs est une marque déposée ou une œuvre protégée par le droit d’auteur de ses propriétaires respectifs. WhoSmarter est un produit indépendant et n’est affilié, approuvé ni sponsorisé par aucun de ces titulaires de droits. Si vous estimez qu’un contenu de ce service enfreint vos droits de propriété intellectuelle, contactez-nous à support@whosmarter.app.',

  de: 'Quiz-Themen werden von Nutzern eingegeben und automatisch generiert. Markennamen, Titel oder Franchises, die in nutzererstellten Quiz-Themen oder -Fragen erscheinen können, sind Marken oder urheberrechtlich geschützte Werke ihrer jeweiligen Rechteinhaber. WhoSmarter ist ein unabhängiges Produkt und steht in keiner Verbindung zu diesen Rechteinhabern, wird von ihnen weder unterstützt noch gesponsert. Wenn Sie der Meinung sind, dass Inhalte dieses Dienstes Ihre Rechte an geistigem Eigentum verletzen, kontaktieren Sie uns unter support@whosmarter.app.',

  ja: 'クイズのトピックはユーザーが入力し、問題は自動生成されます。ユーザー作成のトピックや問題に表示されるブランド名、タイトル、フランチャイズは、それぞれの権利者の商標または著作物です。WhoSmarter は独立した製品であり、これらの権利者と提携、後援、スポンサー提供の関係にはありません。本サービスのコンテンツが知的財産権を侵害しているとお考えの場合は、support@whosmarter.app までご連絡ください。',

  ar: 'مواضيع المسابقات يُدخلها المستخدمون وتُولَّد الأسئلة تلقائيًا. أي أسماء علامات تجارية أو عناوين أو امتيازات قد تظهر في مواضيع أو أسئلة أنشأها المستخدمون هي علامات تجارية أو أعمال محمية بحقوق النشر لأصحابها. WhoSmarter منتج مستقل وغير تابع أو معتمد أو مموّل من أي من هؤلاء أصحاب الحقوق. إذا كنت تعتقد أن محتوى على هذه الخدمة ينتهك حقوق ملكيتك الفكرية، يرجى التواصل معنا على support@whosmarter.app.',
} as const;

export type DisclaimerLocale = keyof typeof disclaimer;
