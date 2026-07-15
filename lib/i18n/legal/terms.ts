// ============================================================
// WhoSmarter — Terms of Use (per-locale)
// Rendered by app/terms/page.tsx. Falls back to `en`.
// ============================================================

export type TermsSection = { title: string; paragraphs: string[]; list?: string[] };

export type TermsDoc = {
  pageTitle: string;
  effectiveDate: string;
  intro: string[];
  sections: TermsSection[];
  contactTitle: string;
  contactBody: string;
  contactEmail: string;
};

const enTerms: TermsDoc = {
  pageTitle: 'Terms of Use',
  effectiveDate: 'Effective date: July 15, 2026',
  intro: [
    'These Terms of Use ("Terms") govern access to and use of the WhoSmarter web application, website, content, features, and related online services available at https://whosmarter.com (collectively, the "Service"). The Service is provided by WhoSmarter ("WhoSmarter," "we," "us," or "our").',
    'By accessing or using the Service, you agree to these Terms. If you do not agree, do not use the Service.',
    'These Terms are intended for the web version of WhoSmarter. They are separate from any app marketplace terms, platform rules, or mobile app license terms that may apply to any mobile version of the Service.',
  ],
  sections: [
    {
      title: '1. Eligibility and Accounts',
      paragraphs: [
        'You may use the Service only if you can legally enter into a binding agreement with us and only in compliance with these Terms and applicable law.',
        'If the Service allows or requires you to create an account, you are responsible for the accuracy of the information you provide and for keeping your login credentials confidential. You are responsible for activity that occurs under your account unless the activity results from our failure to use reasonable security measures.',
      ],
    },
    {
      title: '2. Limited Right to Use the Service',
      paragraphs: [
        'Subject to your compliance with these Terms, we grant you a limited, personal, revocable, non-exclusive, non-transferable right to access and use the Service through a web browser for your own lawful purposes.',
        'We and our licensors retain all rights, title, and interest in and to the Service, including software, designs, text, graphics, interfaces, trademarks, logos, and other content, except for rights expressly granted in these Terms.',
        'You may not:',
      ],
      list: [
        'copy, reproduce, modify, translate, adapt, or create derivative works based on the Service except as allowed by law or expressly permitted by us;',
        'sell, rent, lease, sublicense, distribute, or otherwise make the Service available to others as a standalone product or competing service;',
        'attempt to reverse engineer, decompile, disassemble, or discover source code or underlying algorithms, except to the extent such restriction is prohibited by applicable law;',
        'bypass, disable, or interfere with security, rate limits, access controls, or technical restrictions;',
        'use scraping, crawling, automated extraction, or bulk collection methods unless we have expressly authorized them;',
        'use the Service in a way that harms, disrupts, overloads, or impairs the Service or any third-party systems;',
        'use the Service to violate law, infringe rights, harass others, transmit harmful code, or submit unlawful, misleading, abusive, or harmful content.',
      ],
    },
    {
      title: '3. User Content',
      paragraphs: [
        'The Service may allow you to submit, upload, create, store, or share text, answers, profile information, images, or other materials ("User Content"). You retain ownership of your User Content, subject to the license below.',
        'You grant us a worldwide, non-exclusive, royalty-free license to host, store, reproduce, process, display, transmit, and use your User Content as reasonably necessary to operate, maintain, improve, protect, and provide the Service.',
        'You represent that you have the rights needed to provide your User Content and that your User Content does not violate these Terms, applicable law, or the rights of any third party.',
        'We may remove or restrict access to User Content if we reasonably believe it violates these Terms, creates legal risk, or may harm the Service or other users.',
      ],
    },
    {
      title: '4. Service Changes and Availability',
      paragraphs: [
        'We may update, modify, suspend, restrict, or discontinue any part of the Service at any time. We may also set usage limits, change features, or remove content where needed for operational, security, legal, or business reasons.',
        'We do not guarantee that the Service will be uninterrupted, secure, error-free, or available at any particular time or location.',
      ],
    },
    {
      title: '5. Third-Party Services and Content',
      paragraphs: [
        'The Service may include links, integrations, data, content, or functionality provided by third parties. Third-party services and content are controlled by their respective providers and may be subject to separate terms and privacy policies.',
        'We do not control and are not responsible for third-party services, third-party content, or any loss or damage arising from your use of them. You use third-party services and content at your own risk.',
        'Any information made available through the Service, including scores, comparisons, rankings, recommendations, generated content, or other outputs, is provided for general informational and entertainment purposes only. It should not be treated as professional, educational, financial, medical, legal, psychological, or other expert advice.',
      ],
    },
    {
      title: '6. Data and Privacy',
      paragraphs: [
        'Our collection and use of information in connection with the Service is described in our Privacy Policy, if one is posted or otherwise provided. By using the Service, you understand that we may process information as described in the Privacy Policy and as reasonably necessary to provide, secure, maintain, analyze, and improve the Service.',
        'If you provide feedback, suggestions, or ideas about the Service, you grant us the right to use them without restriction or compensation to you.',
      ],
    },
    {
      title: '7. Fees and Paid Features',
      paragraphs: [
        'Some parts of the Service may be offered for a fee or as a subscription. If paid features are offered, pricing, billing frequency, renewal terms, cancellation methods, and refund rules will be presented at or before purchase.',
        'Unless otherwise stated at the time of purchase, fees are non-refundable except where required by applicable law.',
      ],
    },
    {
      title: '8. Termination',
      paragraphs: [
        'You may stop using the Service at any time.',
        'We may suspend or terminate your access to the Service, with or without notice, if we reasonably believe that you have violated these Terms, created risk or potential legal exposure, misused the Service, or caused harm to us, other users, or third parties.',
        'After termination, the provisions of these Terms that by their nature should survive will remain in effect, including provisions about ownership, disclaimers, limitation of liability, indemnity, dispute terms, and general legal terms.',
      ],
    },
    {
      title: '9. Disclaimer of Warranties',
      paragraphs: [
        'To the maximum extent permitted by applicable law, the Service is provided on an "as is" and "as available" basis. We disclaim all warranties, whether express, implied, statutory, or otherwise, including any warranties of merchantability, fitness for a particular purpose, title, non-infringement, accuracy, reliability, availability, security, or uninterrupted operation.',
        'We do not warrant that the Service will meet your requirements, produce any particular result, be compatible with your device or browser, be free from errors or harmful components, or that any defects will be corrected.',
        'No statement, information, or advice, whether oral or written, obtained from us or through the Service creates any warranty not expressly stated in these Terms.',
        'Some jurisdictions do not allow certain warranty exclusions. In those jurisdictions, the exclusions apply only to the extent permitted by law.',
      ],
    },
    {
      title: '10. Limitation of Liability',
      paragraphs: [
        'To the maximum extent permitted by applicable law, WhoSmarter and its owners, directors, officers, employees, contractors, agents, affiliates, licensors, and service providers will not be liable for any indirect, incidental, special, consequential, exemplary, punitive, or enhanced damages, or for loss of profits, revenue, goodwill, data, content, business opportunity, or business interruption, arising out of or relating to the Service or these Terms, whether based on contract, tort, negligence, strict liability, statute, or any other legal theory, even if we have been advised of the possibility of such damages.',
        'To the maximum extent permitted by applicable law, our total aggregate liability for all claims arising out of or relating to the Service or these Terms will not exceed the greater of: (a) the amount you paid us for the Service during the three months before the event giving rise to the claim; or (b) USD 50.',
        'The limitations in this section apply even if a limited remedy fails of its essential purpose.',
        'Nothing in these Terms excludes or limits liability to the extent it cannot be excluded or limited under applicable law, including liability for fraud, intentional misconduct, or any other liability that cannot legally be limited.',
      ],
    },
    {
      title: '11. Indemnity',
      paragraphs: [
        'To the extent permitted by applicable law, you agree to defend, indemnify, and hold harmless WhoSmarter and its owners, directors, officers, employees, contractors, agents, affiliates, licensors, and service providers from and against any claims, liabilities, damages, losses, and expenses, including reasonable attorneys\' fees, arising out of or related to: (a) your use or misuse of the Service; (b) your User Content; (c) your violation of these Terms; or (d) your violation of any law or third-party right.',
      ],
    },
    {
      title: '12. Compliance With Laws',
      paragraphs: [
        'You are responsible for using the Service in compliance with all laws and regulations that apply to you. You may not use the Service if you are legally prohibited from receiving or using it under applicable sanctions, export control, or other laws.',
        'You may not use the Service for any purpose prohibited by applicable law, including the development, design, manufacture, or production of weapons or other unlawful activities.',
      ],
    },
    {
      title: '13. Governing Law and Disputes',
      paragraphs: [
        'These Terms and any dispute arising out of or relating to them or the Service will be governed by the laws of Hong Kong SAR, without regard to conflict of law rules.',
        'The courts located in Hong Kong SAR will have exclusive jurisdiction over disputes arising out of or relating to these Terms or the Service, except where applicable consumer protection law requires a different forum or governing law.',
        'If you are a consumer residing in a jurisdiction that gives you mandatory local rights, nothing in these Terms limits those rights.',
      ],
    },
    {
      title: '14. Changes to These Terms',
      paragraphs: [
        'We may update these Terms from time to time. If we make material changes, we will take reasonable steps to notify users, such as posting the updated Terms on the website or providing notice through the Service.',
        'The updated Terms will be effective when posted unless a later effective date is stated. Your continued use of the Service after the updated Terms become effective means you accept the updated Terms.',
      ],
    },
    {
      title: '15. General Terms',
      paragraphs: [
        'These Terms are the entire agreement between you and us regarding the Service and replace any prior or contemporaneous understandings about the Service.',
        'If any provision of these Terms is found unenforceable, the remaining provisions will remain in effect, and the unenforceable provision will be modified to the minimum extent necessary to make it enforceable where permitted by law.',
        'Our failure to enforce any provision of these Terms is not a waiver of our right to do so later.',
        'You may not assign or transfer your rights or obligations under these Terms without our prior written consent. We may assign these Terms as part of a merger, acquisition, reorganization, sale of assets, or by operation of law.',
      ],
    },
  ],
  contactTitle: 'Contact',
  contactBody: 'For questions about these Terms, contact us at:',
  contactEmail: 'support@whosmarter.app',
};

const ruTerms: TermsDoc = {
  pageTitle: 'Условия использования',
  effectiveDate: 'Дата вступления в силу: 15 июля 2026 г.',
  intro: [
    'Настоящие Условия использования («Условия») регулируют доступ к веб-приложению WhoSmarter, сайту, контенту, функциям и связанным онлайн-сервисам по адресу https://whosmarter.com (совместно — «Сервис»), а также их использование. Сервис предоставляется WhoSmarter («WhoSmarter», «мы», «нас» или «наш»).',
    'Получая доступ к Сервису или используя его, вы соглашаетесь с этими Условиями. Если вы не согласны, не используйте Сервис.',
    'Эти Условия предназначены для веб-версии WhoSmarter. Они отделены от условий магазинов приложений, правил платформ или лицензионных условий мобильных приложений, которые могут применяться к мобильной версии Сервиса.',
  ],
  sections: [
    {
      title: '1. Право на использование и аккаунты',
      paragraphs: [
        'Вы можете использовать Сервис только если вы вправе заключить с нами обязательное соглашение и только в соответствии с этими Условиями и применимым законодательством.',
        'Если Сервис позволяет или требует создания аккаунта, вы несёте ответственность за точность предоставляемой информации и за сохранение конфиденциальности учётных данных. Вы отвечаете за действия, совершённые под вашим аккаунтом, если только они не стали следствием нашей неспособности применить разумные меры безопасности.',
      ],
    },
    {
      title: '2. Ограниченное право на использование Сервиса',
      paragraphs: [
        'При соблюдении вами этих Условий мы предоставляем вам ограниченное, личное, отзывное, неисключительное и непередаваемое право на доступ к Сервису и его использование через веб-браузер в законных целях.',
        'Мы и наши лицензиары сохраняем все права, право собственности и интересы в отношении Сервиса, включая программное обеспечение, дизайн, текст, графику, интерфейсы, товарные знаки, логотипы и иной контент, за исключением прав, прямо предоставленных в этих Условиях.',
        'Вам запрещается:',
      ],
      list: [
        'копировать, воспроизводить, изменять, переводить, адаптировать или создавать производные произведения на основе Сервиса, кроме случаев, разрешённых законом или нами в явной форме;',
        'продавать, сдавать в аренду, сублицензировать, распространять или иным образом предоставлять Сервис другим лицам как самостоятельный продукт или конкурирующий сервис;',
        'пытаться осуществлять обратную разработку, декомпиляцию, дизассемблирование или выявление исходного кода или базовых алгоритмов, за исключением случаев, когда такое ограничение запрещено применимым законодательством;',
        'обходить, отключать или вмешиваться в системы безопасности, лимиты запросов, контроль доступа или технические ограничения;',
        'использовать скрапинг, краулинг, автоматизированное извлечение или массовый сбор данных, если мы не разрешили это в явной форме;',
        'использовать Сервис способом, который вредит, нарушает, перегружает или ухудшает работу Сервиса или систем третьих лиц;',
        'использовать Сервис для нарушения закона, посягательства на права, преследования других лиц, передачи вредоносного кода или размещения незаконного, вводящего в заблуждение, оскорбительного или вредного контента.',
      ],
    },
    {
      title: '3. Пользовательский контент',
      paragraphs: [
        'Сервис может позволять вам отправлять, загружать, создавать, хранить или делиться текстом, ответами, информацией профиля, изображениями или иными материалами («Пользовательский контент»). Вы сохраняете право собственности на свой Пользовательский контент с учётом лицензии ниже.',
        'Вы предоставляете нам всемирную, неисключительную, безвозмездную лицензию на размещение, хранение, воспроизведение, обработку, отображение, передачу и использование вашего Пользовательского контента в объёме, разумно необходимом для эксплуатации, поддержки, улучшения, защиты и предоставления Сервиса.',
        'Вы заявляете, что обладаете правами, необходимыми для предоставления Пользовательского контента, и что он не нарушает эти Условия, применимое законодательство или права третьих лиц.',
        'Мы можем удалить или ограничить доступ к Пользовательскому контенту, если обоснованно полагаем, что он нарушает эти Условия, создаёт правовые риски или может навредить Сервису или другим пользователям.',
      ],
    },
    {
      title: '4. Изменения Сервиса и доступность',
      paragraphs: [
        'Мы можем в любое время обновлять, изменять, приостанавливать, ограничивать или прекращать любую часть Сервиса. Мы также можем устанавливать лимиты использования, менять функции или удалять контент по операционным, безопасностным, правовым или коммерческим причинам.',
        'Мы не гарантируем, что Сервис будет бесперебойным, безопасным, безошибочным или доступным в определённое время или в определённом месте.',
      ],
    },
    {
      title: '5. Сторонние сервисы и контент',
      paragraphs: [
        'Сервис может включать ссылки, интеграции, данные, контент или функциональность, предоставляемые третьими лицами. Сторонние сервисы и контент контролируются их поставщиками и могут регулироваться отдельными условиями и политиками конфиденциальности.',
        'Мы не контролируем и не несём ответственности за сторонние сервисы, сторонний контент или любые убытки, возникшие в результате их использования. Вы используете сторонние сервисы и контент на свой риск.',
        'Любая информация, доступная через Сервис, включая баллы, сравнения, рейтинги, рекомендации, сгенерированный контент или иные результаты, предоставляется исключительно в общих информационных и развлекательных целях. Её не следует рассматривать как профессиональную, образовательную, финансовую, медицинскую, юридическую, психологическую или иную экспертную консультацию.',
      ],
    },
    {
      title: '6. Данные и конфиденциальность',
      paragraphs: [
        'Сбор и использование информации в связи с Сервисом описаны в нашей Политике конфиденциальности, если она размещена или иным образом предоставлена. Используя Сервис, вы понимаете, что мы можем обрабатывать информацию, как описано в Политике конфиденциальности, и в объёме, разумно необходимом для предоставления, защиты, поддержки, анализа и улучшения Сервиса.',
        'Если вы предоставляете отзывы, предложения или идеи о Сервисе, вы предоставляете нам право использовать их без ограничений и без компенсации вам.',
      ],
    },
    {
      title: '7. Платежи и платные функции',
      paragraphs: [
        'Некоторые части Сервиса могут предлагаться за плату или по подписке. Если предлагаются платные функции, цены, периодичность оплаты, условия продления, способы отмены и правила возврата будут указаны при покупке или до неё.',
        'Если иное не указано при покупке, платежи не подлежат возврату, за исключением случаев, предусмотренных применимым законодательством.',
      ],
    },
    {
      title: '8. Прекращение действия',
      paragraphs: [
        'Вы можете прекратить использование Сервиса в любое время.',
        'Мы можем приостановить или прекратить ваш доступ к Сервису с уведомлением или без него, если обоснованно полагаем, что вы нарушили эти Условия, создали риск или потенциальную правовую ответственность, неправомерно использовали Сервис или причинили вред нам, другим пользователям или третьим лицам.',
        'После прекращения действия положения этих Условий, которые по своей природе должны сохраняться, остаются в силе, включая положения о праве собственности, отказе от гарантий, ограничении ответственности, возмещении убытков, разрешении споров и общих правовых условиях.',
      ],
    },
    {
      title: '9. Отказ от гарантий',
      paragraphs: [
        'В максимальной степени, допускаемой применимым законодательством, Сервис предоставляется на условиях «как есть» и «по мере доступности». Мы отказываемся от всех гарантий — явных, подразумеваемых, установленных законом или иных, включая гарантии товарной пригодности, пригодности для определённой цели, права собственности, ненарушения прав, точности, надёжности, доступности, безопасности или бесперебойной работы.',
        'Мы не гарантируем, что Сервис будет соответствовать вашим требованиям, давать определённый результат, быть совместимым с вашим устройством или браузером, быть свободным от ошибок или вредоносных компонентов, или что любые дефекты будут исправлены.',
        'Никакое заявление, информация или совет, полученные от нас устно или письменно либо через Сервис, не создают гарантий, прямо не указанных в этих Условиях.',
        'В некоторых юрисдикциях не допускаются определённые исключения гарантий. В таких юрисдикциях исключения применяются только в объёме, разрешённом законом.',
      ],
    },
    {
      title: '10. Ограничение ответственности',
      paragraphs: [
        'В максимальной степени, допускаемой применимым законодательством, WhoSmarter и её владельцы, директора, должностные лица, сотрудники, подрядчики, агенты, аффилированные лица, лицензиары и поставщики услуг не несут ответственности за любые косвенные, случайные, особые, последующие, примерные, штрафные или увеличенные убытки, а также за потерю прибыли, дохода, деловой репутации, данных, контента, деловых возможностей или перерыв в деятельности, возникающие в связи с Сервисом или этими Условиями, независимо от основания — договор, деликт, небрежность, строгая ответственность, закон или иная правовая теория, даже если нам было сообщено о возможности таких убытков.',
        'В максимальной степени, допускаемой применимым законодательством, наша совокупная ответственность по всем требованиям, связанным с Сервисом или этими Условиями, не превышает большее из: (a) суммы, уплаченной вами нам за Сервис в течение трёх месяцев до события, послужившего основанием требования; или (b) 50 долларов США.',
        'Ограничения в этом разделе применяются даже если ограниченное средство правовой защиты не достигло своей основной цели.',
        'Ничто в этих Условиях не исключает и не ограничивает ответственность в объёме, в котором её нельзя исключить или ограничить по применимому законодательству, включая ответственность за мошенничество, умышленное противоправное поведение или иную ответственность, которую нельзя ограничить по закону.',
      ],
    },
    {
      title: '11. Возмещение убытков',
      paragraphs: [
        'В объёме, допускаемом применимым законодательством, вы соглашаетесь защищать, возмещать убытки и ограждать WhoSmarter и её владельцев, директоров, должностных лиц, сотрудников, подрядчиков, агентов, аффилированных лиц, лицензиаров и поставщиков услуг от любых претензий, обязательств, убытков, потерь и расходов, включая разумные гонорары адвокатов, возникающих в связи с: (a) вашим использованием или неправомерным использованием Сервиса; (b) вашим Пользовательским контентом; (c) вашим нарушением этих Условий; или (d) вашим нарушением закона или прав третьих лиц.',
      ],
    },
    {
      title: '12. Соблюдение законодательства',
      paragraphs: [
        'Вы несёте ответственность за использование Сервиса в соответствии со всеми применимыми к вам законами и нормативными актами. Вы не можете использовать Сервис, если вам законно запрещено получать или использовать его в соответствии с санкциями, экспортным контролем или иным законодательством.',
        'Вы не можете использовать Сервис в целях, запрещённых применимым законодательством, включая разработку, проектирование, изготовление или производство оружия или иной незаконной деятельности.',
      ],
    },
    {
      title: '13. Применимое право и споры',
      paragraphs: [
        'Эти Условия и любой спор, возникающий из них или в связи с ними или Сервисом, регулируются законодательством Специального административного района Гонконг без учёта коллизионных норм.',
        'Суды, расположенные в Гонконге, обладают исключительной юрисдикцией по спорам, возникающим из этих Условий или Сервиса, за исключением случаев, когда применимое законодательство о защите прав потребителей требует иного форума или применимого права.',
        'Если вы являетесь потребителем, проживающим в юрисдикции, предоставляющей вам обязательные местные права, ничто в этих Условиях не ограничивает эти права.',
      ],
    },
    {
      title: '14. Изменения этих Условий',
      paragraphs: [
        'Мы можем время от времени обновлять эти Условия. При существенных изменениях мы предпримем разумные шаги для уведомления пользователей, например разместим обновлённые Условия на сайте или уведомим через Сервис.',
        'Обновлённые Условия вступают в силу с момента публикации, если не указана более поздняя дата. Продолжение использования Сервиса после вступления обновлённых Условий в силу означает ваше согласие с ними.',
      ],
    },
    {
      title: '15. Общие положения',
      paragraphs: [
        'Эти Условия представляют собой полное соглашение между вами и нами в отношении Сервиса и заменяют любые предыдущие или одновременные договорённости о Сервисе.',
        'Если какое-либо положение этих Условий признано неисполнимым, остальные положения остаются в силе, а неисполнимое положение изменяется в минимально необходимой степени для обеспечения исполнимости, где это допускается законом.',
        'Наш отказ от принудительного исполнения какого-либо положения этих Условий не означает отказ от права сделать это позже.',
        'Вы не можете уступать или передавать свои права или обязательства по этим Условиям без нашего предварительного письменного согласия. Мы можем уступать эти Условия в рамках слияния, поглощения, реорганизации, продажи активов или в силу закона.',
      ],
    },
  ],
  contactTitle: 'Контакты',
  contactBody: 'По вопросам об этих Условиях свяжитесь с нами:',
  contactEmail: 'support@whosmarter.app',
};

export const terms: Record<string, TermsDoc> = {
  en: enTerms,
  ru: ruTerms,

  es: {
    pageTitle: 'Términos de uso',
    effectiveDate: 'Fecha de entrada en vigor: 15 de julio de 2026',
    intro: [
      'Estos Términos de uso («Términos») rigen el acceso y el uso de la aplicación web WhoSmarter, el sitio web, el contenido, las funciones y los servicios en línea relacionados disponibles en https://whosmarter.com (en conjunto, el «Servicio»). El Servicio es proporcionado por WhoSmarter («WhoSmarter», «nosotros», «nos» o «nuestro»).',
      'Al acceder o usar el Servicio, aceptas estos Términos. Si no estás de acuerdo, no uses el Servicio.',
      'Estos Términos están destinados a la versión web de WhoSmarter. Son independientes de los términos de las tiendas de aplicaciones, las reglas de las plataformas o las licencias de aplicaciones móviles que puedan aplicarse a cualquier versión móvil del Servicio.',
    ],
    sections: [
      {
        title: '1. Elegibilidad y cuentas',
        paragraphs: [
          'Puedes usar el Servicio solo si puedes celebrar legalmente un acuerdo vinculante con nosotros y solo de conformidad con estos Términos y la ley aplicable.',
          'Si el Servicio permite o requiere que crees una cuenta, eres responsable de la exactitud de la información que proporcionas y de mantener la confidencialidad de tus credenciales de acceso. Eres responsable de la actividad que ocurra bajo tu cuenta, salvo que la actividad sea resultado de nuestra falta de medidas de seguridad razonables.',
        ],
      },
      {
        title: '2. Derecho limitado a usar el Servicio',
        paragraphs: [
          'Sujeto a tu cumplimiento de estos Términos, te concedemos un derecho limitado, personal, revocable, no exclusivo e intransferible para acceder y usar el Servicio a través de un navegador web para tus propios fines lícitos.',
          'Nosotros y nuestros licenciantes conservamos todos los derechos, títulos e intereses sobre el Servicio, incluidos software, diseños, texto, gráficos, interfaces, marcas, logotipos y otro contenido, excepto los derechos expresamente concedidos en estos Términos.',
          'No puedes:',
        ],
        list: [
          'copiar, reproducir, modificar, traducir, adaptar o crear obras derivadas basadas en el Servicio, salvo lo permitido por la ley o expresamente autorizado por nosotros;',
          'vender, alquilar, arrendar, sublicenciar, distribuir o poner el Servicio a disposición de otros como producto independiente o servicio competidor;',
          'intentar realizar ingeniería inversa, descompilar, desensamblar o descubrir el código fuente o los algoritmos subyacentes, salvo en la medida en que dicha restricción esté prohibida por la ley aplicable;',
          'eludir, desactivar o interferir con la seguridad, los límites de velocidad, los controles de acceso o las restricciones técnicas;',
          'usar scraping, rastreo, extracción automatizada o métodos de recopilación masiva, salvo que los hayamos autorizado expresamente;',
          'usar el Servicio de forma que dañe, interrumpa, sobrecargue o perjudique el Servicio o los sistemas de terceros;',
          'usar el Servicio para violar la ley, infringir derechos, acosar a otros, transmitir código dañino o enviar contenido ilegal, engañoso, abusivo o perjudicial.',
        ],
      },
      {
        title: '3. Contenido del usuario',
        paragraphs: [
          'El Servicio puede permitirte enviar, cargar, crear, almacenar o compartir texto, respuestas, información de perfil, imágenes u otros materiales («Contenido del usuario»). Conservas la propiedad de tu Contenido del usuario, sujeto a la licencia que se indica a continuación.',
          'Nos concedes una licencia mundial, no exclusiva y libre de regalías para alojar, almacenar, reproducir, procesar, mostrar, transmitir y usar tu Contenido del usuario en la medida razonablemente necesaria para operar, mantener, mejorar, proteger y proporcionar el Servicio.',
          'Declaras que tienes los derechos necesarios para proporcionar tu Contenido del usuario y que no viola estos Términos, la ley aplicable ni los derechos de terceros.',
          'Podemos eliminar o restringir el acceso al Contenido del usuario si creemos razonablemente que viola estos Términos, crea riesgo legal o puede dañar el Servicio u otros usuarios.',
        ],
      },
      {
        title: '4. Cambios del Servicio y disponibilidad',
        paragraphs: [
          'Podemos actualizar, modificar, suspender, restringir o discontinuar cualquier parte del Servicio en cualquier momento. También podemos establecer límites de uso, cambiar funciones o eliminar contenido por razones operativas, de seguridad, legales o comerciales.',
          'No garantizamos que el Servicio sea ininterrumpido, seguro, libre de errores o disponible en un momento o lugar determinado.',
        ],
      },
      {
        title: '5. Servicios y contenido de terceros',
        paragraphs: [
          'El Servicio puede incluir enlaces, integraciones, datos, contenido o funcionalidad proporcionados por terceros. Los servicios y contenido de terceros están controlados por sus respectivos proveedores y pueden estar sujetos a términos y políticas de privacidad separados.',
          'No controlamos ni somos responsables de los servicios de terceros, el contenido de terceros ni de ninguna pérdida o daño derivado de su uso. Usas los servicios y contenido de terceros bajo tu propio riesgo.',
          'Cualquier información disponible a través del Servicio, incluidas puntuaciones, comparaciones, clasificaciones, recomendaciones, contenido generado u otros resultados, se proporciona únicamente con fines informativos y de entretenimiento generales. No debe considerarse asesoramiento profesional, educativo, financiero, médico, legal, psicológico u otro tipo de asesoramiento experto.',
        ],
      },
      {
        title: '6. Datos y privacidad',
        paragraphs: [
          'Nuestra recopilación y uso de información en relación con el Servicio se describe en nuestra Política de privacidad, si está publicada o proporcionada de otro modo. Al usar el Servicio, entiendes que podemos procesar información según se describe en la Política de privacidad y en la medida razonablemente necesaria para proporcionar, proteger, mantener, analizar y mejorar el Servicio.',
          'Si proporcionas comentarios, sugerencias o ideas sobre el Servicio, nos concedes el derecho de usarlos sin restricción ni compensación para ti.',
        ],
      },
      {
        title: '7. Tarifas y funciones de pago',
        paragraphs: [
          'Algunas partes del Servicio pueden ofrecerse mediante pago o suscripción. Si se ofrecen funciones de pago, el precio, la frecuencia de facturación, los términos de renovación, los métodos de cancelación y las reglas de reembolso se presentarán en el momento de la compra o antes.',
          'Salvo que se indique lo contrario en el momento de la compra, las tarifas no son reembolsables, excepto cuando la ley aplicable lo exija.',
        ],
      },
      {
        title: '8. Terminación',
        paragraphs: [
          'Puedes dejar de usar el Servicio en cualquier momento.',
          'Podemos suspender o terminar tu acceso al Servicio, con o sin previo aviso, si creemos razonablemente que has violado estos Términos, has creado riesgo o exposición legal potencial, has hecho un uso indebido del Servicio o has causado daño a nosotros, a otros usuarios o a terceros.',
          'Tras la terminación, las disposiciones de estos Términos que por su naturaleza deban subsistir permanecerán en vigor, incluidas las disposiciones sobre propiedad, exenciones de garantía, limitación de responsabilidad, indemnización, resolución de disputas y términos legales generales.',
        ],
      },
      {
        title: '9. Exención de garantías',
        paragraphs: [
          'En la máxima medida permitida por la ley aplicable, el Servicio se proporciona «tal cual» y «según disponibilidad». Renunciamos a todas las garantías, ya sean expresas, implícitas, legales o de otro tipo, incluidas las garantías de comerciabilidad, idoneidad para un propósito particular, titularidad, no infracción, exactitud, fiabilidad, disponibilidad, seguridad u operación ininterrumpida.',
          'No garantizamos que el Servicio cumpla tus requisitos, produzca un resultado particular, sea compatible con tu dispositivo o navegador, esté libre de errores o componentes dañinos, o que se corrijan los defectos.',
          'Ninguna declaración, información o consejo, ya sea oral o escrito, obtenido de nosotros o a través del Servicio crea ninguna garantía no expresamente indicada en estos Términos.',
          'Algunas jurisdicciones no permiten ciertas exclusiones de garantía. En esas jurisdicciones, las exclusiones se aplican solo en la medida permitida por la ley.',
        ],
      },
      {
        title: '10. Limitación de responsabilidad',
        paragraphs: [
          'En la máxima medida permitida por la ley aplicable, WhoSmarter y sus propietarios, directores, funcionarios, empleados, contratistas, agentes, afiliados, licenciantes y proveedores de servicios no serán responsables de daños indirectos, incidentales, especiales, consecuentes, ejemplares, punitivos o agravados, ni de la pérdida de beneficios, ingresos, fondo de comercio, datos, contenido, oportunidades de negocio o interrupción del negocio, derivados del Servicio o de estos Términos, ya sea por contrato, agravio, negligencia, responsabilidad estricta, estatuto u otra teoría legal, incluso si se nos ha advertido de la posibilidad de dichos daños.',
          'En la máxima medida permitida por la ley aplicable, nuestra responsabilidad total agregada por todas las reclamaciones derivadas del Servicio o de estos Términos no excederá el mayor de: (a) el importe que nos pagaste por el Servicio durante los tres meses anteriores al evento que dio lugar a la reclamación; o (b) 50 USD.',
          'Las limitaciones de esta sección se aplican incluso si un recurso limitado no cumple su propósito esencial.',
          'Nada en estos Términos excluye o limita la responsabilidad en la medida en que no pueda excluirse o limitarse según la ley aplicable, incluida la responsabilidad por fraude, conducta intencional o cualquier otra responsabilidad que no pueda limitarse legalmente.',
        ],
      },
      {
        title: '11. Indemnización',
        paragraphs: [
          'En la medida permitida por la ley aplicable, aceptas defender, indemnizar y mantener indemne a WhoSmarter y a sus propietarios, directores, funcionarios, empleados, contratistas, agentes, afiliados, licenciantes y proveedores de servicios frente a reclamaciones, responsabilidades, daños, pérdidas y gastos, incluidos honorarios razonables de abogados, derivados de o relacionados con: (a) tu uso o uso indebido del Servicio; (b) tu Contenido del usuario; (c) tu violación de estos Términos; o (d) tu violación de cualquier ley o derecho de terceros.',
        ],
      },
      {
        title: '12. Cumplimiento de la ley',
        paragraphs: [
          'Eres responsable de usar el Servicio de conformidad con todas las leyes y regulaciones que te apliquen. No puedes usar el Servicio si tienes prohibido legalmente recibirlo o usarlo según sanciones, control de exportaciones u otras leyes aplicables.',
          'No puedes usar el Servicio para ningún fin prohibido por la ley aplicable, incluido el desarrollo, diseño, fabricación o producción de armas u otras actividades ilícitas.',
        ],
      },
      {
        title: '13. Ley aplicable y disputas',
        paragraphs: [
          'Estos Términos y cualquier disputa derivada de ellos o del Servicio se regirán por las leyes de la RAE de Hong Kong, sin tener en cuenta las normas de conflicto de leyes.',
          'Los tribunales ubicados en la RAE de Hong Kong tendrán jurisdicción exclusiva sobre las disputas derivadas de estos Términos o del Servicio, excepto cuando la ley de protección al consumidor aplicable exija un foro o ley diferente.',
          'Si eres un consumidor residente en una jurisdicción que te otorga derechos locales obligatorios, nada en estos Términos limita esos derechos.',
        ],
      },
      {
        title: '14. Cambios en estos Términos',
        paragraphs: [
          'Podemos actualizar estos Términos de vez en cuando. Si realizamos cambios materiales, tomaremos medidas razonables para notificar a los usuarios, como publicar los Términos actualizados en el sitio web o proporcionar aviso a través del Servicio.',
          'Los Términos actualizados entrarán en vigor cuando se publiquen, salvo que se indique una fecha posterior. Tu uso continuado del Servicio después de que los Términos actualizados entren en vigor significa que aceptas los Términos actualizados.',
        ],
      },
      {
        title: '15. Términos generales',
        paragraphs: [
          'Estos Términos constituyen el acuerdo completo entre tú y nosotros respecto del Servicio y reemplazan cualquier entendimiento previo o contemporáneo sobre el Servicio.',
          'Si alguna disposición de estos Términos se considera inaplicable, las disposiciones restantes permanecerán en vigor y la disposición inaplicable se modificará en la medida mínima necesaria para hacerla aplicable, cuando la ley lo permita.',
          'Nuestra falta de hacer cumplir cualquier disposición de estos Términos no constituye una renuncia a nuestro derecho de hacerlo más adelante.',
          'No puedes ceder ni transferir tus derechos u obligaciones bajo estos Términos sin nuestro consentimiento previo por escrito. Podemos ceder estos Términos como parte de una fusión, adquisición, reorganización, venta de activos o por operación de ley.',
        ],
      },
    ],
    contactTitle: 'Contacto',
    contactBody: 'Para preguntas sobre estos Términos, contáctanos en:',
    contactEmail: 'support@whosmarter.app',
  },

  fr: {
    pageTitle: 'Conditions d\'utilisation',
    effectiveDate: 'Date d\'entrée en vigueur : 15 juillet 2026',
    intro: [
      'Les présentes Conditions d\'utilisation (« Conditions ») régissent l\'accès et l\'utilisation de l\'application web WhoSmarter, du site, du contenu, des fonctionnalités et des services en ligne associés disponibles sur https://whosmarter.com (collectivement, le « Service »). Le Service est fourni par WhoSmarter (« WhoSmarter », « nous », « notre » ou « nos »).',
      'En accédant au Service ou en l\'utilisant, vous acceptez ces Conditions. Si vous n\'êtes pas d\'accord, n\'utilisez pas le Service.',
      'Ces Conditions s\'appliquent à la version web de WhoSmarter. Elles sont distinctes des conditions des boutiques d\'applications, des règles des plateformes ou des licences d\'applications mobiles pouvant s\'appliquer à toute version mobile du Service.',
    ],
    sections: [
      {
        title: '1. Éligibilité et comptes',
        paragraphs: [
          'Vous ne pouvez utiliser le Service que si vous êtes légalement en mesure de conclure un accord contraignant avec nous et uniquement conformément à ces Conditions et à la loi applicable.',
          'Si le Service permet ou exige la création d\'un compte, vous êtes responsable de l\'exactitude des informations fournies et de la confidentialité de vos identifiants de connexion. Vous êtes responsable de l\'activité effectuée sous votre compte, sauf si cette activité résulte de notre manquement à des mesures de sécurité raisonnables.',
        ],
      },
      {
        title: '2. Droit limité d\'utilisation du Service',
        paragraphs: [
          'Sous réserve de votre respect de ces Conditions, nous vous accordons un droit limité, personnel, révocable, non exclusif et non transférable d\'accéder au Service et de l\'utiliser via un navigateur web à des fins licites.',
          'Nous et nos concédants de licence conservons tous les droits, titres et intérêts relatifs au Service, y compris les logiciels, designs, textes, graphiques, interfaces, marques, logos et autres contenus, à l\'exception des droits expressément accordés dans ces Conditions.',
          'Vous ne pouvez pas :',
        ],
        list: [
          'copier, reproduire, modifier, traduire, adapter ou créer des œuvres dérivées basées sur le Service, sauf si la loi le permet ou si nous l\'autorisons expressément ;',
          'vendre, louer, sous-licencier, distribuer ou mettre le Service à disposition d\'autres personnes en tant que produit autonome ou service concurrent ;',
          'tenter de procéder à une ingénierie inverse, décompiler, désassembler ou découvrir le code source ou les algorithmes sous-jacents, sauf dans la mesure où une telle restriction est interdite par la loi applicable ;',
          'contourner, désactiver ou interférer avec la sécurité, les limites de débit, les contrôles d\'accès ou les restrictions techniques ;',
          'utiliser le scraping, le crawling, l\'extraction automatisée ou des méthodes de collecte en masse, sauf si nous les avons expressément autorisées ;',
          'utiliser le Service d\'une manière qui nuit, perturbe, surcharge ou altère le Service ou les systèmes tiers ;',
          'utiliser le Service pour violer la loi, porter atteinte à des droits, harceler autrui, transmettre du code nuisible ou soumettre du contenu illégal, trompeur, abusif ou nuisible.',
        ],
      },
      {
        title: '3. Contenu utilisateur',
        paragraphs: [
          'Le Service peut vous permettre de soumettre, téléverser, créer, stocker ou partager du texte, des réponses, des informations de profil, des images ou d\'autres éléments (« Contenu utilisateur »). Vous conservez la propriété de votre Contenu utilisateur, sous réserve de la licence ci-dessous.',
          'Vous nous accordez une licence mondiale, non exclusive et sans redevance pour héberger, stocker, reproduire, traiter, afficher, transmettre et utiliser votre Contenu utilisateur dans la mesure raisonnablement nécessaire pour exploiter, maintenir, améliorer, protéger et fournir le Service.',
          'Vous déclarez disposer des droits nécessaires pour fournir votre Contenu utilisateur et que celui-ci ne viole pas ces Conditions, la loi applicable ou les droits de tiers.',
          'Nous pouvons supprimer ou restreindre l\'accès au Contenu utilisateur si nous estimons raisonnablement qu\'il viole ces Conditions, crée un risque juridique ou peut nuire au Service ou à d\'autres utilisateurs.',
        ],
      },
      {
        title: '4. Modifications du Service et disponibilité',
        paragraphs: [
          'Nous pouvons mettre à jour, modifier, suspendre, restreindre ou interrompre toute partie du Service à tout moment. Nous pouvons également fixer des limites d\'utilisation, modifier des fonctionnalités ou supprimer du contenu pour des raisons opérationnelles, de sécurité, juridiques ou commerciales.',
          'Nous ne garantissons pas que le Service sera ininterrompu, sécurisé, exempt d\'erreurs ou disponible à un moment ou un lieu particulier.',
        ],
      },
      {
        title: '5. Services et contenus tiers',
        paragraphs: [
          'Le Service peut inclure des liens, intégrations, données, contenus ou fonctionnalités fournis par des tiers. Les services et contenus tiers sont contrôlés par leurs fournisseurs respectifs et peuvent être soumis à des conditions et politiques de confidentialité distinctes.',
          'Nous ne contrôlons pas et ne sommes pas responsables des services tiers, des contenus tiers ni de toute perte ou dommage résultant de leur utilisation. Vous utilisez les services et contenus tiers à vos propres risques.',
          'Toute information mise à disposition via le Service, y compris les scores, comparaisons, classements, recommandations, contenus générés ou autres résultats, est fournie à des fins d\'information et de divertissement générales uniquement. Elle ne doit pas être considérée comme un conseil professionnel, éducatif, financier, médical, juridique, psychologique ou autre conseil d\'expert.',
        ],
      },
      {
        title: '6. Données et confidentialité',
        paragraphs: [
          'Notre collecte et utilisation des informations en lien avec le Service sont décrites dans notre Politique de confidentialité, si elle est publiée ou fournie. En utilisant le Service, vous comprenez que nous pouvons traiter les informations comme décrit dans la Politique de confidentialité et dans la mesure raisonnablement nécessaire pour fournir, sécuriser, maintenir, analyser et améliorer le Service.',
          'Si vous fournissez des commentaires, suggestions ou idées concernant le Service, vous nous accordez le droit de les utiliser sans restriction ni compensation.',
        ],
      },
      {
        title: '7. Frais et fonctionnalités payantes',
        paragraphs: [
          'Certaines parties du Service peuvent être proposées moyennant des frais ou par abonnement. Si des fonctionnalités payantes sont proposées, les tarifs, la fréquence de facturation, les conditions de renouvellement, les modalités d\'annulation et les règles de remboursement seront présentés au moment de l\'achat ou avant.',
          'Sauf indication contraire au moment de l\'achat, les frais ne sont pas remboursables, sauf si la loi applicable l\'exige.',
        ],
      },
      {
        title: '8. Résiliation',
        paragraphs: [
          'Vous pouvez cesser d\'utiliser le Service à tout moment.',
          'Nous pouvons suspendre ou résilier votre accès au Service, avec ou sans préavis, si nous estimons raisonnablement que vous avez violé ces Conditions, créé un risque ou une exposition juridique potentielle, fait un usage abusif du Service ou causé un préjudice à nous, à d\'autres utilisateurs ou à des tiers.',
          'Après la résiliation, les dispositions de ces Conditions qui, de par leur nature, doivent survivre resteront en vigueur, notamment celles relatives à la propriété, aux exclusions de garantie, à la limitation de responsabilité, à l\'indemnisation, aux litiges et aux dispositions juridiques générales.',
        ],
      },
      {
        title: '9. Exclusion de garanties',
        paragraphs: [
          'Dans toute la mesure permise par la loi applicable, le Service est fourni « en l\'état » et « selon disponibilité ». Nous déclinons toutes garanties, expresses, implicites, légales ou autres, y compris toute garantie de qualité marchande, d\'adéquation à un usage particulier, de titre, de non-contrefaçon, d\'exactitude, de fiabilité, de disponibilité, de sécurité ou de fonctionnement ininterrompu.',
          'Nous ne garantissons pas que le Service répondra à vos exigences, produira un résultat particulier, sera compatible avec votre appareil ou navigateur, sera exempt d\'erreurs ou de composants nuisibles, ou que tout défaut sera corrigé.',
          'Aucune déclaration, information ou conseil, oral ou écrit, obtenu de notre part ou via le Service ne crée de garantie non expressément énoncée dans ces Conditions.',
          'Certaines juridictions n\'autorisent pas certaines exclusions de garantie. Dans ces juridictions, les exclusions s\'appliquent uniquement dans la mesure permise par la loi.',
        ],
      },
      {
        title: '10. Limitation de responsabilité',
        paragraphs: [
          'Dans toute la mesure permise par la loi applicable, WhoSmarter et ses propriétaires, administrateurs, dirigeants, employés, sous-traitants, agents, affiliés, concédants de licence et prestataires de services ne seront pas responsables de tout dommage indirect, accessoire, spécial, consécutif, exemplaire, punitif ou majoré, ni de toute perte de profits, revenus, clientèle, données, contenu, opportunité commerciale ou interruption d\'activité, découlant du Service ou de ces Conditions, que ce soit sur la base d\'un contrat, d\'un délit, d\'une négligence, d\'une responsabilité stricte, d\'une loi ou de toute autre théorie juridique, même si nous avons été informés de la possibilité de tels dommages.',
          'Dans toute la mesure permise par la loi applicable, notre responsabilité totale agrégée pour toutes les réclamations découlant du Service ou de ces Conditions ne dépassera pas le plus élevé des montants suivants : (a) le montant que vous nous avez payé pour le Service au cours des trois mois précédant l\'événement à l\'origine de la réclamation ; ou (b) 50 USD.',
          'Les limitations de cette section s\'appliquent même si un recours limité n\'atteint pas son objectif essentiel.',
          'Rien dans ces Conditions n\'exclut ou ne limite la responsabilité dans la mesure où elle ne peut pas être exclue ou limitée en vertu de la loi applicable, y compris la responsabilité pour fraude, faute intentionnelle ou toute autre responsabilité qui ne peut légalement être limitée.',
        ],
      },
      {
        title: '11. Indemnisation',
        paragraphs: [
          'Dans la mesure permise par la loi applicable, vous acceptez de défendre, indemniser et dégager de toute responsabilité WhoSmarter et ses propriétaires, administrateurs, dirigeants, employés, sous-traitants, agents, affiliés, concédants de licence et prestataires de services contre toute réclamation, responsabilité, dommage, perte et dépense, y compris les honoraires d\'avocat raisonnables, découlant de ou liés à : (a) votre utilisation ou mauvaise utilisation du Service ; (b) votre Contenu utilisateur ; (c) votre violation de ces Conditions ; ou (d) votre violation de toute loi ou droit de tiers.',
        ],
      },
      {
        title: '12. Conformité aux lois',
        paragraphs: [
          'Vous êtes responsable de l\'utilisation du Service conformément à toutes les lois et réglementations qui vous sont applicables. Vous ne pouvez pas utiliser le Service si vous êtes légalement interdit de le recevoir ou de l\'utiliser en vertu de sanctions, de contrôles à l\'exportation ou d\'autres lois applicables.',
          'Vous ne pouvez pas utiliser le Service à des fins interdites par la loi applicable, y compris le développement, la conception, la fabrication ou la production d\'armes ou d\'autres activités illicites.',
        ],
      },
      {
        title: '13. Droit applicable et litiges',
        paragraphs: [
          'Ces Conditions et tout litige découlant de celles-ci ou du Service seront régis par les lois de la RAE de Hong Kong, sans égard aux règles de conflit de lois.',
          'Les tribunaux situés dans la RAE de Hong Kong auront compétence exclusive pour les litiges découlant de ces Conditions ou du Service, sauf lorsque la loi applicable sur la protection des consommateurs exige un autre forum ou un autre droit applicable.',
          'Si vous êtes un consommateur résidant dans une juridiction qui vous accorde des droits locaux impératifs, rien dans ces Conditions ne limite ces droits.',
        ],
      },
      {
        title: '14. Modifications de ces Conditions',
        paragraphs: [
          'Nous pouvons mettre à jour ces Conditions de temps à autre. En cas de modifications importantes, nous prendrons des mesures raisonnables pour informer les utilisateurs, par exemple en publiant les Conditions mises à jour sur le site ou en fournissant un avis via le Service.',
          'Les Conditions mises à jour entreront en vigueur dès leur publication, sauf si une date ultérieure est indiquée. Votre utilisation continue du Service après l\'entrée en vigueur des Conditions mises à jour signifie que vous acceptez les Conditions mises à jour.',
        ],
      },
      {
        title: '15. Dispositions générales',
        paragraphs: [
          'Ces Conditions constituent l\'intégralité de l\'accord entre vous et nous concernant le Service et remplacent tout accord antérieur ou contemporain relatif au Service.',
          'Si une disposition de ces Conditions est jugée inapplicable, les dispositions restantes demeureront en vigueur et la disposition inapplicable sera modifiée dans la mesure minimale nécessaire pour la rendre applicable, lorsque la loi le permet.',
          'Notre manquement à faire respecter une disposition de ces Conditions ne constitue pas une renonciation à notre droit de le faire ultérieurement.',
          'Vous ne pouvez pas céder ou transférer vos droits ou obligations en vertu de ces Conditions sans notre consentement écrit préalable. Nous pouvons céder ces Conditions dans le cadre d\'une fusion, acquisition, réorganisation, vente d\'actifs ou par effet de la loi.',
        ],
      },
    ],
    contactTitle: 'Contact',
    contactBody: 'Pour toute question concernant ces Conditions, contactez-nous à :',
    contactEmail: 'support@whosmarter.app',
  },

  de: {
    pageTitle: 'Nutzungsbedingungen',
    effectiveDate: 'Datum des Inkrafttretens: 15. Juli 2026',
    intro: [
      'Diese Nutzungsbedingungen («Bedingungen») regeln den Zugang zu und die Nutzung der WhoSmarter-Webanwendung, der Website, der Inhalte, der Funktionen und der zugehörigen Online-Dienste unter https://whosmarter.com (zusammen der «Dienst»). Der Dienst wird von WhoSmarter («WhoSmarter», «wir», «uns» oder «unser») bereitgestellt.',
      'Durch den Zugriff auf oder die Nutzung des Dienstes stimmen Sie diesen Bedingungen zu. Wenn Sie nicht einverstanden sind, nutzen Sie den Dienst nicht.',
      'Diese Bedingungen gelten für die Webversion von WhoSmarter. Sie sind getrennt von App-Store-Bedingungen, Plattformregeln oder mobilen App-Lizenzbedingungen, die für eine mobile Version des Dienstes gelten können.',
    ],
    sections: [
      {
        title: '1. Berechtigung und Konten',
        paragraphs: [
          'Sie dürfen den Dienst nur nutzen, wenn Sie rechtlich in der Lage sind, einen verbindlichen Vertrag mit uns abzuschließen, und nur in Übereinstimmung mit diesen Bedingungen und dem geltenden Recht.',
          'Wenn der Dienst die Erstellung eines Kontos erlaubt oder erfordert, sind Sie für die Richtigkeit der von Ihnen bereitgestellten Informationen und für die Vertraulichkeit Ihrer Anmeldedaten verantwortlich. Sie sind für Aktivitäten unter Ihrem Konto verantwortlich, es sei denn, die Aktivität resultiert aus unserem Versäumnis, angemessene Sicherheitsmaßnahmen anzuwenden.',
        ],
      },
      {
        title: '2. Beschränktes Nutzungsrecht',
        paragraphs: [
          'Vorbehaltlich Ihrer Einhaltung dieser Bedingungen gewähren wir Ihnen ein beschränktes, persönliches, widerrufliches, nicht ausschließliches und nicht übertragbares Recht, auf den Dienst über einen Webbrowser zuzugreifen und ihn für Ihre eigenen rechtmäßigen Zwecke zu nutzen.',
          'Wir und unsere Lizenzgeber behalten alle Rechte, Titel und Interessen am Dienst, einschließlich Software, Designs, Text, Grafiken, Schnittstellen, Marken, Logos und anderer Inhalte, mit Ausnahme der in diesen Bedingungen ausdrücklich gewährten Rechte.',
          'Sie dürfen nicht:',
        ],
        list: [
          'den Dienst kopieren, reproduzieren, ändern, übersetzen, anpassen oder davon abgeleitete Werke erstellen, außer soweit gesetzlich erlaubt oder von uns ausdrücklich genehmigt;',
          'den Dienst verkaufen, vermieten, unterlizenzieren, verteilen oder anderen als eigenständiges Produkt oder konkurrierenden Dienst zur Verfügung stellen;',
          'versuchen, Reverse Engineering, Dekompilierung, Disassemblierung oder die Entdeckung von Quellcode oder zugrunde liegenden Algorithmen durchzuführen, außer soweit eine solche Beschränkung nach geltendem Recht unzulässig ist;',
          'Sicherheitsmaßnahmen, Ratenlimits, Zugriffskontrollen oder technische Beschränkungen umgehen, deaktivieren oder beeinträchtigen;',
          'Scraping, Crawling, automatisierte Extraktion oder Massenerfassungsmethoden verwenden, es sei denn, wir haben dies ausdrücklich genehmigt;',
          'den Dienst in einer Weise nutzen, die den Dienst oder Systeme Dritter schädigt, stört, überlastet oder beeinträchtigt;',
          'den Dienst nutzen, um Gesetze zu verletzen, Rechte zu verletzen, andere zu belästigen, schädlichen Code zu übertragen oder rechtswidrige, irreführende, missbräuchliche oder schädliche Inhalte einzureichen.',
        ],
      },
      {
        title: '3. Nutzerinhalte',
        paragraphs: [
          'Der Dienst kann es Ihnen ermöglichen, Text, Antworten, Profilinformationen, Bilder oder andere Materialien («Nutzerinhalte») einzureichen, hochzuladen, zu erstellen, zu speichern oder zu teilen. Sie behalten das Eigentum an Ihren Nutzerinhalten, vorbehaltlich der unten genannten Lizenz.',
          'Sie gewähren uns eine weltweite, nicht ausschließliche, gebührenfreie Lizenz, Ihre Nutzerinhalte zu hosten, zu speichern, zu reproduzieren, zu verarbeiten, anzuzeigen, zu übertragen und zu nutzen, soweit dies zum Betrieb, zur Wartung, Verbesserung, zum Schutz und zur Bereitstellung des Dienstes vernünftigerweise erforderlich ist.',
          'Sie versichern, dass Sie die erforderlichen Rechte zur Bereitstellung Ihrer Nutzerinhalte haben und dass diese nicht gegen diese Bedingungen, geltendes Recht oder Rechte Dritter verstoßen.',
          'Wir können Nutzerinhalte entfernen oder den Zugang einschränken, wenn wir begründet annehmen, dass sie gegen diese Bedingungen verstoßen, rechtliche Risiken bergen oder dem Dienst oder anderen Nutzern schaden könnten.',
        ],
      },
      {
        title: '4. Änderungen des Dienstes und Verfügbarkeit',
        paragraphs: [
          'Wir können jeden Teil des Dienstes jederzeit aktualisieren, ändern, aussetzen, einschränken oder einstellen. Wir können auch Nutzungslimits festlegen, Funktionen ändern oder Inhalte aus betrieblichen, sicherheits-, rechtlichen oder geschäftlichen Gründen entfernen.',
          'Wir garantieren nicht, dass der Dienst ununterbrochen, sicher, fehlerfrei oder zu einem bestimmten Zeitpunkt oder Ort verfügbar ist.',
        ],
      },
      {
        title: '5. Dienste und Inhalte Dritter',
        paragraphs: [
          'Der Dienst kann Links, Integrationen, Daten, Inhalte oder Funktionen Dritter enthalten. Dienste und Inhalte Dritter werden von den jeweiligen Anbietern kontrolliert und können separaten Bedingungen und Datenschutzrichtlinien unterliegen.',
          'Wir kontrollieren Dienste und Inhalte Dritter nicht und sind nicht verantwortlich für Verluste oder Schäden, die aus deren Nutzung entstehen. Sie nutzen Dienste und Inhalte Dritter auf eigenes Risiko.',
          'Alle über den Dienst verfügbaren Informationen, einschließlich Punkte, Vergleiche, Rankings, Empfehlungen, generierte Inhalte oder andere Ausgaben, dienen nur allgemeinen Informations- und Unterhaltungszwecken. Sie sollten nicht als professionelle, bildungsbezogene, finanzielle, medizinische, rechtliche, psychologische oder sonstige Expertenberatung behandelt werden.',
        ],
      },
      {
        title: '6. Daten und Datenschutz',
        paragraphs: [
          'Unsere Erhebung und Nutzung von Informationen im Zusammenhang mit dem Dienst ist in unserer Datenschutzrichtlinie beschrieben, sofern diese veröffentlicht oder anderweitig bereitgestellt wird. Durch die Nutzung des Dienstes verstehen Sie, dass wir Informationen wie in der Datenschutzrichtlinie beschrieben und soweit vernünftigerweise erforderlich verarbeiten können, um den Dienst bereitzustellen, zu sichern, zu warten, zu analysieren und zu verbessern.',
          'Wenn Sie Feedback, Vorschläge oder Ideen zum Dienst bereitstellen, gewähren Sie uns das Recht, diese ohne Einschränkung oder Vergütung zu nutzen.',
        ],
      },
      {
        title: '7. Gebühren und kostenpflichtige Funktionen',
        paragraphs: [
          'Teile des Dienstes können gegen Gebühr oder als Abonnement angeboten werden. Wenn kostenpflichtige Funktionen angeboten werden, werden Preise, Abrechnungshäufigkeit, Verlängerungsbedingungen, Kündigungsmethoden und Erstattungsregeln beim oder vor dem Kauf dargestellt.',
          'Sofern beim Kauf nicht anders angegeben, sind Gebühren nicht erstattungsfähig, außer wenn geltendes Recht dies vorschreibt.',
        ],
      },
      {
        title: '8. Kündigung',
        paragraphs: [
          'Sie können die Nutzung des Dienstes jederzeit einstellen.',
          'Wir können Ihren Zugang zum Dienst mit oder ohne Vorankündigung aussetzen oder beenden, wenn wir begründet annehmen, dass Sie gegen diese Bedingungen verstoßen haben, Risiken oder potenzielle rechtliche Haftung geschaffen haben, den Dienst missbraucht haben oder uns, anderen Nutzern oder Dritten geschadet haben.',
          'Nach der Beendigung bleiben die Bestimmungen dieser Bedingungen in Kraft, die ihrer Natur nach fortbestehen sollen, einschließlich Bestimmungen zu Eigentum, Gewährleistungsausschlüssen, Haftungsbeschränkung, Freistellung, Streitbeilegung und allgemeinen rechtlichen Bedingungen.',
        ],
      },
      {
        title: '9. Gewährleistungsausschluss',
        paragraphs: [
          'Soweit nach geltendem Recht zulässig, wird der Dienst «wie besehen» und «nach Verfügbarkeit» bereitgestellt. Wir lehnen alle Gewährleistungen ab, ob ausdrücklich, stillschweigend, gesetzlich oder anderweitig, einschließlich Gewährleistungen der Marktgängigkeit, Eignung für einen bestimmten Zweck, Eigentum, Nichtverletzung, Genauigkeit, Zuverlässigkeit, Verfügbarkeit, Sicherheit oder ununterbrochenen Betrieb.',
          'Wir gewährleisten nicht, dass der Dienst Ihren Anforderungen entspricht, ein bestimmtes Ergebnis erzielt, mit Ihrem Gerät oder Browser kompatibel ist, frei von Fehlern oder schädlichen Komponenten ist oder dass Mängel behoben werden.',
          'Keine Aussage, Information oder Beratung, mündlich oder schriftlich, die von uns oder über den Dienst erhalten wird, begründet eine Gewährleistung, die nicht ausdrücklich in diesen Bedingungen genannt ist.',
          'In einigen Rechtsordnungen sind bestimmte Gewährleistungsausschlüsse nicht zulässig. In diesen Rechtsordnungen gelten die Ausschlüsse nur in dem gesetzlich zulässigen Umfang.',
        ],
      },
      {
        title: '10. Haftungsbeschränkung',
        paragraphs: [
          'Soweit nach geltendem Recht zulässig, haften WhoSmarter und ihre Eigentümer, Direktoren, leitenden Angestellten, Mitarbeiter, Auftragnehmer, Vertreter, verbundenen Unternehmen, Lizenzgeber und Dienstleister nicht für indirekte, zufällige, besondere, Folge-, exemplarische, Straf- oder erhöhte Schäden oder für entgangenen Gewinn, Umsatz, Goodwill, Daten, Inhalte, Geschäftschancen oder Betriebsunterbrechung, die aus dem Dienst oder diesen Bedingungen entstehen, unabhängig davon, ob sie auf Vertrag, unerlaubter Handlung, Fahrlässigkeit, verschuldensunabhängiger Haftung, Gesetz oder einer anderen Rechtstheorie beruhen, selbst wenn wir auf die Möglichkeit solcher Schäden hingewiesen wurden.',
          'Soweit nach geltendem Recht zulässig, übersteigt unsere gesamte aggregierte Haftung für alle Ansprüche aus dem Dienst oder diesen Bedingungen nicht den höheren Betrag von: (a) dem Betrag, den Sie uns für den Dienst in den drei Monaten vor dem Ereignis, das den Anspruch auslöste, gezahlt haben; oder (b) 50 USD.',
          'Die Beschränkungen in diesem Abschnitt gelten auch dann, wenn ein beschränktes Rechtsmittel seinen wesentlichen Zweck verfehlt.',
          'Nichts in diesen Bedingungen schließt oder beschränkt die Haftung in dem Umfang aus, in dem sie nach geltendem Recht nicht ausgeschlossen oder beschränkt werden kann, einschließlich Haftung für Betrug, vorsätzliches Fehlverhalten oder andere Haftung, die gesetzlich nicht beschränkt werden kann.',
        ],
      },
      {
        title: '11. Freistellung',
        paragraphs: [
          'Soweit nach geltendem Recht zulässig, stimmen Sie zu, WhoSmarter und ihre Eigentümer, Direktoren, leitenden Angestellten, Mitarbeiter, Auftragnehmer, Vertreter, verbundenen Unternehmen, Lizenzgeber und Dienstleister zu verteidigen, freizustellen und schadlos zu halten von Ansprüchen, Verbindlichkeiten, Schäden, Verlusten und Ausgaben, einschließlich angemessener Anwaltskosten, die entstehen aus oder im Zusammenhang stehen mit: (a) Ihrer Nutzung oder missbräuchlichen Nutzung des Dienstes; (b) Ihren Nutzerinhalten; (c) Ihrem Verstoß gegen diese Bedingungen; oder (d) Ihrem Verstoß gegen Gesetze oder Rechte Dritter.',
        ],
      },
      {
        title: '12. Einhaltung von Gesetzen',
        paragraphs: [
          'Sie sind dafür verantwortlich, den Dienst in Übereinstimmung mit allen auf Sie anwendbaren Gesetzen und Vorschriften zu nutzen. Sie dürfen den Dienst nicht nutzen, wenn Ihnen der Erhalt oder die Nutzung nach geltenden Sanktionen, Exportkontrollen oder anderen Gesetzen rechtlich untersagt ist.',
          'Sie dürfen den Dienst nicht für Zwecke nutzen, die nach geltendem Recht verboten sind, einschließlich der Entwicklung, Konstruktion, Herstellung oder Produktion von Waffen oder anderen rechtswidrigen Aktivitäten.',
        ],
      },
      {
        title: '13. Anwendbares Recht und Streitigkeiten',
        paragraphs: [
          'Diese Bedingungen und alle Streitigkeiten, die sich daraus oder aus dem Dienst ergeben, unterliegen den Gesetzen der Sonderverwaltungszone Hongkong, ohne Berücksichtigung von Kollisionsnormen.',
          'Die Gerichte in der Sonderverwaltungszone Hongkong haben ausschließliche Zuständigkeit für Streitigkeiten aus diesen Bedingungen oder dem Dienst, außer wenn geltendes Verbraucherschutzrecht ein anderes Forum oder anwendbares Recht vorschreibt.',
          'Wenn Sie Verbraucher in einer Rechtsordnung sind, die Ihnen zwingende lokale Rechte gewährt, schränkt nichts in diesen Bedingungen diese Rechte ein.',
        ],
      },
      {
        title: '14. Änderungen dieser Bedingungen',
        paragraphs: [
          'Wir können diese Bedingungen von Zeit zu Zeit aktualisieren. Bei wesentlichen Änderungen werden wir angemessene Schritte unternehmen, um Nutzer zu informieren, z. B. durch Veröffentlichung der aktualisierten Bedingungen auf der Website oder durch Mitteilung über den Dienst.',
          'Die aktualisierten Bedingungen treten mit der Veröffentlichung in Kraft, sofern kein späteres Datum angegeben ist. Ihre fortgesetzte Nutzung des Dienstes nach Inkrafttreten der aktualisierten Bedingungen bedeutet, dass Sie die aktualisierten Bedingungen akzeptieren.',
        ],
      },
      {
        title: '15. Allgemeine Bestimmungen',
        paragraphs: [
          'Diese Bedingungen stellen die gesamte Vereinbarung zwischen Ihnen und uns bezüglich des Dienstes dar und ersetzen alle früheren oder gleichzeitigen Absprachen über den Dienst.',
          'Wird eine Bestimmung dieser Bedingungen für nicht durchsetzbar erklärt, bleiben die übrigen Bestimmungen in Kraft, und die nicht durchsetzbare Bestimmung wird in dem minimal erforderlichen Umfang geändert, um sie durchsetzbar zu machen, soweit gesetzlich zulässig.',
          'Unser Versäumnis, eine Bestimmung dieser Bedingungen durchzusetzen, stellt keinen Verzicht auf unser Recht dar, dies später zu tun.',
          'Sie dürfen Ihre Rechte oder Pflichten aus diesen Bedingungen nicht ohne unsere vorherige schriftliche Zustimmung abtreten oder übertragen. Wir können diese Bedingungen im Rahmen einer Fusion, Übernahme, Reorganisation, eines Verkaufs von Vermögenswerten oder kraft Gesetzes abtreten.',
        ],
      },
    ],
    contactTitle: 'Kontakt',
    contactBody: 'Bei Fragen zu diesen Bedingungen kontaktieren Sie uns unter:',
    contactEmail: 'support@whosmarter.app',
  },

  ja: {
    pageTitle: '利用規約',
    effectiveDate: '発効日：2026年7月15日',
    intro: [
      '本利用規約（「本規約」）は、https://whosmarter.com で提供される WhoSmarter のウェブアプリケーション、ウェブサイト、コンテンツ、機能および関連オンラインサービス（総称して「本サービス」）へのアクセスおよび利用を規定します。本サービスは WhoSmarter（「WhoSmarter」「当社」「私たち」または「当方」）が提供します。',
      '本サービスにアクセスまたは利用することにより、お客様は本規約に同意したものとみなされます。同意されない場合は、本サービスを利用しないでください。',
      '本規約は WhoSmarter のウェブ版を対象としています。モバイル版に適用される可能性のあるアプリストアの規約、プラットフォームのルール、モバイルアプリのライセンス条件とは別物です。',
    ],
    sections: [
      {
        title: '1. 利用資格とアカウント',
        paragraphs: [
          'お客様は、当社と法的に拘束力のある契約を締結できる場合に限り、本規約および適用法令に従って本サービスを利用できます。',
          '本サービスでアカウントの作成が可能または必須の場合、お客様は提供する情報の正確性およびログイン認証情報の機密保持について責任を負います。当社が合理的なセキュリティ対策を講じなかった場合を除き、アカウントで行われる活動についてお客様が責任を負います。',
        ],
      },
      {
        title: '2. 本サービスの利用に関する限定的権利',
        paragraphs: [
          'お客様が本規約を遵守することを条件に、当社はお客様に対し、合法的な目的のためにウェブブラウザを通じて本サービスにアクセスし利用する、限定的、個人的、取消可能、非独占的かつ譲渡不能な権利を付与します。',
          '当社および当社のライセンサーは、本規約で明示的に付与された権利を除き、ソフトウェア、デザイン、テキスト、グラフィック、インターフェース、商標、ロゴその他のコンテンツを含む本サービスに関するすべての権利、権原および利益を保持します。',
          'お客様は以下を行ってはなりません：',
        ],
        list: [
          '法令で許可される場合または当社が明示的に許可する場合を除き、本サービスをコピー、複製、変更、翻訳、適応、またはそれに基づく派生物を作成すること；',
          '本サービスを単体製品または競合サービスとして販売、賃貸、リース、サブライセンス、配布、または他者に提供すること；',
          '適用法令で当該制限が禁止される範囲を除き、リバースエンジニアリング、逆コンパイル、逆アセンブル、またはソースコードや基盤アルゴリズムの発見を試みること；',
          'セキュリティ、レート制限、アクセス制御、または技術的制限を回避、無効化、または妨害すること；',
          '当社が明示的に承認していない限り、スクレイピング、クローリング、自動抽出、または一括収集の方法を使用すること；',
          '本サービスまたは第三者のシステムを害し、妨害し、過負荷にし、または機能を損なう方法で本サービスを利用すること；',
          '法令違反、権利侵害、他者への嫌がらせ、有害なコードの送信、または違法、誤解を招く、虐待的、または有害なコンテンツの送信のために本サービスを利用すること。',
        ],
      },
      {
        title: '3. ユーザーコンテンツ',
        paragraphs: [
          '本サービスでは、テキスト、回答、プロフィール情報、画像その他の資料（「ユーザーコンテンツ」）の送信、アップロード、作成、保存、共有が可能な場合があります。お客様は下記ライセンスの対象を除き、ユーザーコンテンツの所有権を保持します。',
          'お客様は、本サービスの運営、維持、改善、保護、提供に合理的に必要な範囲で、ユーザーコンテンツをホスト、保存、複製、処理、表示、送信、利用するための、世界的、非独占的、ロイヤルティフリーのライセンスを当社に付与します。',
          'お客様は、ユーザーコンテンツを提供するために必要な権利を有し、それが本規約、適用法令、または第三者の権利に違反しないことを表明します。',
          '当社は、ユーザーコンテンツが本規約に違反し、法的リスクを生じさせ、または本サービスもしくは他のユーザーに害を及ぼす可能性があると合理的に判断した場合、削除またはアクセスを制限することがあります。',
        ],
      },
      {
        title: '4. サービスの変更と可用性',
        paragraphs: [
          '当社は、本サービスのいずれの部分もいつでも更新、変更、一時停止、制限、または中止することができます。運用上、セキュリティ上、法的、または事業上の理由により、利用制限の設定、機能の変更、コンテンツの削除を行う場合もあります。',
          '当社は、本サービスが中断なく、安全で、エラーがなく、特定の時間または場所で利用可能であることを保証しません。',
        ],
      },
      {
        title: '5. 第三者サービスとコンテンツ',
        paragraphs: [
          '本サービスには、第三者が提供するリンク、連携、データ、コンテンツ、または機能が含まれる場合があります。第三者サービスおよびコンテンツは各提供者が管理し、別個の規約およびプライバシーポリシーの対象となる場合があります。',
          '当社は第三者サービスおよびコンテンツを管理せず、それらの利用に起因する損失または損害について責任を負いません。第三者サービスおよびコンテンツの利用はお客様自身の責任で行ってください。',
          'スコア、比較、ランキング、推奨、生成コンテンツその他の出力を含め、本サービスを通じて提供される情報は、一般的な情報提供および娯楽目的のみです。専門的、教育的、金融、医療、法律、心理その他の専門的助言として扱うべきではありません。',
        ],
      },
      {
        title: '6. データとプライバシー',
        paragraphs: [
          '本サービスに関連する情報の収集および利用については、掲載または提供されている場合、当社のプライバシーポリシーに記載されています。本サービスを利用することにより、お客様は、プライバシーポリシーに記載されたとおり、および本サービスの提供、保護、維持、分析、改善に合理的に必要な範囲で情報が処理されることを理解します。',
          '本サービスに関するフィードバック、提案、アイデアを提供した場合、お客様はそれらを制限なく、かつ補償なしで当社が利用する権利を当社に付与します。',
        ],
      },
      {
        title: '7. 料金と有料機能',
        paragraphs: [
          '本サービスの一部は有料またはサブスクリプションとして提供される場合があります。有料機能が提供される場合、価格、請求頻度、更新条件、解約方法、返金ルールは購入時または購入前に提示されます。',
          '購入時に別段の定めがない限り、料金は適用法令で求められる場合を除き返金不可です。',
        ],
      },
      {
        title: '8. 終了',
        paragraphs: [
          'お客様はいつでも本サービスの利用を停止できます。',
          '当社は、お客様が本規約に違反した、リスクまたは潜在的な法的責任を生じさせた、本サービスを不正利用した、または当社、他のユーザー、第三者に害を与えたと合理的に判断した場合、通知の有無にかかわらず、本サービスへのアクセスを一時停止または終了することができます。',
          '終了後も、所有権、免責、責任制限、補償、紛争、一般条項に関する規定を含め、性質上存続すべき本規約の条項は引き続き有効です。',
        ],
      },
      {
        title: '9. 保証の否認',
        paragraphs: [
          '適用法令で認められる最大限の範囲で、本サービスは「現状有姿」かつ「提供可能な範囲」で提供されます。当社は、商品性、特定目的への適合性、権原、非侵害、正確性、信頼性、可用性、セキュリティ、または中断のない運用に関する保証を含め、明示、黙示、法定その他いかなる保証も否認します。',
          '当社は、本サービスがお客様の要件を満たすこと、特定の結果を生じること、お客様のデバイスまたはブラウザと互換性があること、エラーや有害なコンポーネントがないこと、または欠陥が修正されることを保証しません。',
          '当社または本サービスを通じて口頭または書面で得られたいかなる表明、情報、助言も、本規約で明示的に述べられていない保証を生じさせません。',
          '一部の法域では特定の保証の除外が認められていません。そのような法域では、除外は法令で認められる範囲にのみ適用されます。',
        ],
      },
      {
        title: '10. 責任の制限',
        paragraphs: [
          '適用法令で認められる最大限の範囲で、WhoSmarter およびその所有者、取締役、役員、従業員、請負業者、代理人、関連会社、ライセンサー、サービス提供者は、契約、不法行為、過失、厳格責任、法令その他いかなる法的理論に基づくかを問わず、当社がその可能性を知らされていた場合でも、本サービスまたは本規約に関連して生じる間接的、付随的、特別、結果的、懲罰的、または拡大損害、または利益、収益、のれん、データ、コンテンツ、ビジネス機会、事業中断の損失について責任を負いません。',
          '適用法令で認められる最大限の範囲で、本サービスまたは本規約に関連するすべての請求に対する当社の総責任額は、次のいずれか大きい方を超えません：(a) 請求の原因となった事象の前 3 か月間にお客様が本サービスに支払った金額；または (b) 50米ドル。',
          '本セクションの制限は、限定的な救済がその本質的目的を達成できなかった場合でも適用されます。',
          '本規約のいかなる内容も、詐欺、故意の不正行為、または法的に制限できないその他の責任を含め、適用法令の下で除外または制限できない範囲の責任を除外または制限するものではありません。',
        ],
      },
      {
        title: '11. 補償',
        paragraphs: [
          '適用法令で認められる範囲で、お客様は、(a) 本サービスの利用または不正利用；(b) お客様のユーザーコンテンツ；(c) 本規約への違反；または (d) 法令または第三者の権利への違反に関連して生じる請求、責任、損害、損失、費用（合理的な弁護士費用を含む）から、WhoSmarter およびその所有者、取締役、役員、従業員、請負業者、代理人、関連会社、ライセンサー、サービス提供者を防御し、補償し、免責することに同意します。',
        ],
      },
      {
        title: '12. 法令遵守',
        paragraphs: [
          'お客様は、適用されるすべての法令および規制に従って本サービスを利用する責任を負います。適用される制裁、輸出管理、その他の法令により本サービスの受領または利用が法的に禁止されている場合、本サービスを利用することはできません。',
          'お客様は、武器の開発、設計、製造、生産その他の違法行為を含め、適用法令で禁止される目的のために本サービスを利用してはなりません。',
        ],
      },
      {
        title: '13. 準拠法と紛争',
        paragraphs: [
          '本規約および本規約または本サービスに関連して生じる紛争は、法の抵触に関する規則を除き、香港特別行政区の法令に準拠します。',
          '本規約または本サービスに関連して生じる紛争については、適用される消費者保護法が別の裁判地または準拠法を要求する場合を除き、香港特別行政区にある裁判所が専属的管轄権を有します。',
          'お客様が強行的な地域の権利を付与する法域に居住する消費者である場合、本規約のいかなる内容もそれらの権利を制限しません。',
        ],
      },
      {
        title: '14. 本規約の変更',
        paragraphs: [
          '当社は本規約を随時更新することがあります。重要な変更を行う場合、ウェブサイトへの掲載または本サービスを通じた通知など、合理的な手段でユーザーに通知します。',
          '更新された規約は、別途発効日が示されない限り、掲載時に効力を生じます。更新後も本サービスを利用し続けることは、更新された規約への同意を意味します。',
        ],
      },
      {
        title: '15. 一般条項',
        paragraphs: [
          '本規約は、本サービスに関するお客様と当社との間の完全な合意を構成し、本サービスに関する以前または同時期の了解に取って代わります。',
          '本規約のいずれかの条項が執行不能と判断された場合、残りの条項は引き続き有効であり、執行不能な条項は法令で認められる範囲で執行可能とするために必要最小限の範囲で修正されます。',
          '当社が本規約のいずれかの条項を執行しなかったことは、後日執行する権利の放棄を意味しません。',
          'お客様は、当社の事前の書面による同意なく、本規約に基づく権利または義務を譲渡または移転することはできません。当社は、合併、買収、再編、資産売却、または法令の運用に伴い本規約を譲渡することができます。',
        ],
      },
    ],
    contactTitle: 'お問い合わせ',
    contactBody: '本規約に関するご質問は、以下までご連絡ください：',
    contactEmail: 'support@whosmarter.app',
  },

  ar: {
    pageTitle: 'شروط الاستخدام',
    effectiveDate: 'تاريخ السريان: 15 يوليو 2026',
    intro: [
      'تحكم شروط الاستخدام هذه («الشروط») الوصول إلى تطبيق WhoSmarter على الويب والموقع والمحتوى والميزات والخدمات المتصلة المتاحة على https://whosmarter.com (مجتمعة، «الخدمة») واستخدامها. تقدم الخدمة WhoSmarter («WhoSmarter» أو «نحن» أو «لنا»).',
      'بالوصول إلى الخدمة أو استخدامها، فإنك توافق على هذه الشروط. إذا لم توافق، فلا تستخدم الخدمة.',
      'هذه الشروط مخصصة للنسخة الويب من WhoSmarter. وهي منفصلة عن شروط متاجر التطبيقات أو قواعد المنصات أو تراخيص التطبيقات المحمولة التي قد تنطبق على أي نسخة محمولة من الخدمة.',
    ],
    sections: [
      {
        title: '1. الأهلية والحسابات',
        paragraphs: [
          'يمكنك استخدام الخدمة فقط إذا كنت قادرًا قانونيًا على إبرام اتفاق ملزم معنا ووفقًا لهذه الشروط والقانون المعمول به.',
          'إذا سمحت الخدمة أو تطلبت إنشاء حساب، فأنت مسؤول عن دقة المعلومات التي تقدمها وعن الحفاظ على سرية بيانات تسجيل الدخول. أنت مسؤول عن النشاط الذي يحدث تحت حسابك ما لم ينتج عن فشلنا في اتخاذ تدابير أمنية معقولة.',
        ],
      },
      {
        title: '2. حق محدود في استخدام الخدمة',
        paragraphs: [
          'مع التزامك بهذه الشروط، نمنحك حقًا محدودًا وشخصيًا وقابلًا للإلغاء وغير حصري وغير قابل للتحويل للوصول إلى الخدمة واستخدامها عبر متصفح ويب لأغراضك المشروعة.',
          'نحتفظ نحن ومرخصونا بجميع الحقوق والملكية والمصالح في الخدمة، بما في ذلك البرمجيات والتصاميم والنصوص والرسومات والواجهات والعلامات التجارية والشعارات والمحتوى الآخر، باستثناء الحقوق الممنوحة صراحة في هذه الشروط.',
          'لا يجوز لك:',
        ],
        list: [
          'نسخ أو إعادة إنتاج أو تعديل أو ترجمة أو تكييف أو إنشاء أعمال مشتقة بناءً على الخدمة إلا كما يسمح به القانون أو نسمح به صراحة؛',
          'بيع أو تأجير أو إيجار أو ترخيص من الباطن أو توزيع أو إتاحة الخدمة للآخرين كمنتج مستقل أو خدمة منافسة؛',
          'محاولة الهندسة العكسية أو فك التجميع أو تفكيك أو اكتشاف الشيفرة المصدرية أو الخوارزميات الأساسية، إلا في الحد الذي يحظر فيه القانون المعمول به هذا القيد؛',
          'تجاوز أو تعطيل أو التدخل في الأمان أو حدود المعدل أو ضوابط الوصول أو القيود التقنية؛',
          'استخدام الاستخراج الآلي أو الزحف أو الاستخراج الآلي أو طرق الجمع الجماعي ما لم نصرّح بها صراحة؛',
          'استخدام الخدمة بطريقة تضر أو تعطل أو تُحمّل أو تُضعف الخدمة أو أنظمة الطرف الثالث؛',
          'استخدام الخدمة لانتهاك القانون أو حقوق الآخرين أو مضايقتهم أو نقل شيفرة ضارة أو إرسال محتوى غير قانوني أو مضلل أو مسيء أو ضار.',
        ],
      },
      {
        title: '3. محتوى المستخدم',
        paragraphs: [
          'قد تتيح لك الخدمة إرسال أو تحميل أو إنشاء أو تخزين أو مشاركة نصوص أو إجابات أو معلومات الملف الشخصي أو صور أو مواد أخرى («محتوى المستخدم»). تحتفظ بملكية محتوى المستخدم الخاص بك، مع مراعاة الترخيص أدناه.',
          'تمنحنا ترخيصًا عالميًا غير حصري وخاليًا من الإتاوات لاستضافة وتخزين وإعادة إنتاج ومعالجة وعرض ونقل واستخدام محتوى المستخدم الخاص بك بالقدر اللازوم بشكل معقول لتشغيل الخدمة وصيانتها وتحسينها وحمايتها وتقديمها.',
          'تقر بأن لديك الحقوق اللازمة لتقديم محتوى المستخدم وأنه لا ينتهك هذه الشروط أو القانون المعمول به أو حقوق أي طرف ثالث.',
          'يجوز لنا إزالة محتوى المستخدم أو تقييد الوصول إليه إذا اعتقدنا بشكل معقول أنه ينتهك هذه الشروط أو يخلق مخاطر قانونية أو قد يضر بالخدمة أو المستخدمين الآخرين.',
        ],
      },
      {
        title: '4. تغييرات الخدمة والتوفر',
        paragraphs: [
          'يجوز لنا تحديث أو تعديل أو تعليق أو تقييد أو إيقاف أي جزء من الخدمة في أي وقت. كما يجوز لنا وضع حدود استخدام أو تغيير الميزات أو إزالة المحتوى لأسباب تشغيلية أو أمنية أو قانونية أو تجارية.',
          'لا نضمن أن الخدمة ستكون دون انقطاع أو آمنة أو خالية من الأخطاء أو متاحة في وقت أو مكان معين.',
        ],
      },
      {
        title: '5. خدمات ومحتوى الطرف الثالث',
        paragraphs: [
          'قد تتضمن الخدمة روابط أو تكاملات أو بيانات أو محتوى أو وظائف يقدمها أطراف ثالثة. تخضع خدمات ومحتوى الطرف الثالث لسيطرة مزوديهم وقد تكون خاضعة لشروط وسياسات خصوصية منفصلة.',
          'لا نتحكم في خدمات أو محتوى الطرف الثالث ولسنا مسؤولين عن أي خسارة أو ضرر ينشأ عن استخدامها. تستخدم خدمات ومحتوى الطرف الثالث على مسؤوليتك الخاصة.',
          'أي معلومات متاحة عبر الخدمة، بما في ذلك النقاط والمقارنات والتصنيفات والتوصيات والمحتوى المُولَّد أو المخرجات الأخرى، تُقدَّم لأغراض إعلامية وترفيهية عامة فقط. لا ينبغي اعتبارها نصيحة مهنية أو تعليمية أو مالية أو طبية أو قانونية أو نفسية أو نصيحة خبير أخرى.',
        ],
      },
      {
        title: '6. البيانات والخصوصية',
        paragraphs: [
          'يُوصَف جمعنا لمعلوماتك واستخدامها فيما يتعلق بالخدمة في سياسة الخصوصية الخاصة بنا، إن وُجدت أو قُدِّمت. باستخدامك الخدمة، تفهم أننا قد نعالج المعلومات كما هو موضح في سياسة الخصوصية وبالقدر اللازوم بشكل معقول لتقديم الخدمة وتأمينها وصيانتها وتحليلها وتحسينها.',
          'إذا قدمت ملاحظات أو اقتراحات أو أفكارًا حول الخدمة، فإنك تمنحنا الحق في استخدامها دون قيود أو تعويض لك.',
        ],
      },
      {
        title: '7. الرسوم والميزات المدفوعة',
        paragraphs: [
          'قد تُقدَّم أجزاء من الخدمة مقابل رسوم أو كاشتراك. إذا عُرضت ميزات مدفوعة، فسيُعرض التسعير وتكرار الفوترة وشروط التجديد وطرق الإلغاء وقواعد الاسترداد عند الشراء أو قبله.',
          'ما لم يُذكر خلاف ذلك عند الشراء، الرسوم غير قابلة للاسترداد إلا حيث يقتضي القانون المعمول به.',
        ],
      },
      {
        title: '8. الإنهاء',
        paragraphs: [
          'يمكنك التوقف عن استخدام الخدمة في أي وقت.',
          'يجوز لنا تعليق أو إنهاء وصولك إلى الخدمة، مع إشعار أو دونه، إذا اعتقدنا بشكل معقول أنك انتهكت هذه الشروط أو خلقت مخاطر أو تعرضًا قانونيًا محتملًا أو أسأت استخدام الخدمة أو ألحقت ضررًا بنا أو بالمستخدمين الآخرين أو بأطراف ثالثة.',
          'بعد الإنهاء، تبقى أحكام هذه الشروط التي يجب بحكم طبيعتها أن تستمر سارية، بما في ذلك أحكام الملكية وإخلاء المسؤولية عن الضمانات وتحديد المسؤولية والتعويض والنزاعات والأحكام القانونية العامة.',
        ],
      },
      {
        title: '9. إخلاء المسؤولية عن الضمانات',
        paragraphs: [
          'إلى أقصى حد يسمح به القانون المعمول به، تُقدَّم الخدمة «كما هي» و«حسب التوفر». نتنصل من جميع الضمانات، صريحة أو ضمنية أو قانونية أو غير ذلك، بما في ذلك ضمانات القابلية للتسويق والملاءمة لغرض معين والملكية وعدم الانتهاك والدقة والموثوقية والتوفر والأمان أو التشغيل دون انقطاع.',
          'لا نضمن أن الخدمة ستلبي متطلباتك أو تحقق نتيجة معينة أو تكون متوافقة مع جهازك أو متصفحك أو خالية من الأخطاء أو المكونات الضارة أو أن أي عيوب ستُصحَّح.',
          'لا يُنشئ أي بيان أو معلومات أو نصيحة، شفهية أو مكتوبة، نحصل عليها منا أو عبر الخدمة أي ضمان غير منصوص عليه صراحة في هذه الشروط.',
          'لا تسمح بعض الولايات القضائية باستبعادات ضمان معينة. في تلك الولايات، تنطبق الاستبعادات فقط بالقدر المسموح به قانونًا.',
        ],
      },
      {
        title: '10. تحديد المسؤولية',
        paragraphs: [
          'إلى أقصى حد يسمح به القانون المعمول به، لن تكون WhoSmarter ومالكوها ومديروها ومسؤولوها وموظفوها ومقاولوها ووكلاؤها والشركات التابعة لها ومرخصوها ومقدمو خدماتها مسؤولين عن أي أضرار غير مباشرة أو عرضية أو خاصة أو تبعية أو نموذجية أو عقابية أو معززة، أو عن فقدان الأرباح أو الإيرادات أو السمعة أو البيانات أو المحتوى أو فرص العمل أو انقطاع الأعمال، الناشئة عن الخدمة أو هذه الشروط، سواء على أساس عقد أو ضرر أو إهمال أو مسؤولية مطلقة أو قانون أو أي نظرية قانونية أخرى، حتى لو أُبلغنا بإمكانية حدوث مثل هذه الأضرار.',
          'إلى أقصى حد يسمح به القانون المعمول به، لن تتجاوز مسؤوليتنا الإجمالية المجمعة عن جميع المطالبات الناشئة عن الخدمة أو هذه الشروط الأكبر من: (أ) المبلغ الذي دفعته لنا مقابل الخدمة خلال الأشهر الثلاثة السابقة للحدث الذي أدى إلى المطالبة؛ أو (ب) 50 دولارًا أمريكيًا.',
          'تنطبق القيود في هذا القسم حتى إذا فشل تعويض محدود في تحقيق غرضه الجوهري.',
          'لا يستبعد أي شيء في هذه الشروط أو يحد من المسؤولية بالقدر الذي لا يمكن استبعاده أو تحديده بموجب القانون المعمول به، بما في ذلك المسؤولية عن الاحتيال أو سوء السلوك المتعمد أو أي مسؤولية أخرى لا يمكن تحديدها قانونًا.',
        ],
      },
      {
        title: '11. التعويض',
        paragraphs: [
          'بالقدر المسموح به بموجب القانون المعمول به، توافق على الدفاع عن WhoSmarter ومالكيها ومديريها ومسؤوليها وموظفيها ومقاوليها ووكلائها والشركات التابعة لها ومرخصيها ومقدمي خدماتها وتعويضهم وإبراء ذمتهم من أي مطالبات أو التزامات أو أضرار أو خسائر ونفقات، بما في ذلك أتعاب المحاماة المعقولة، الناشئة عن أو المتعلقة بـ: (أ) استخدامك أو إساءة استخدامك للخدمة؛ (ب) محتوى المستخدم الخاص بك؛ (ج) انتهاكك لهذه الشروط؛ أو (د) انتهاكك لأي قانون أو حق طرف ثالث.',
        ],
      },
      {
        title: '12. الامتثال للقوانين',
        paragraphs: [
          'أنت مسؤول عن استخدام الخدمة وفقًا لجميع القوانين واللوائح التي تنطبق عليك. لا يجوز لك استخدام الخدمة إذا كان ممنوعًا عليك قانونًا تلقيها أو استخدامها بموجب العقوبات أو ضوابط التصدير أو قوانين أخرى معمول بها.',
          'لا يجوز لك استخدام الخدمة لأي غرض محظور بموجب القانون المعمول به، بما في ذلك تطوير أو تصميم أو تصنيع أو إنتاج الأسلحة أو أنشطة غير قانونية أخرى.',
        ],
      },
      {
        title: '13. القانون الحاكم والنزاعات',
        paragraphs: [
          'تخضع هذه الشروط وأي نزاع ينشأ عنها أو عن الخدمة لقوانين منطقة هونغ كونغ الإدارية الخاصة، دون مراعاة قواعد تنازع القوانين.',
          'تتمتع المحاكم الواقعة في منطقة هونغ كونغ الإدارية الخاصة بالاختصاص الحصري للنزاعات الناشئة عن هذه الشروط أو الخدمة، إلا حيث يتطلب قانون حماية المستهلك المعمول به منتدى أو قانونًا حاكمًا مختلفًا.',
          'إذا كنت مستهلكًا مقيمًا في ولاية قضائية تمنحك حقوقًا محلية إلزامية، فلا يحد أي شيء في هذه الشروط من تلك الحقوق.',
        ],
      },
      {
        title: '14. تغييرات هذه الشروط',
        paragraphs: [
          'قد نحدّث هذه الشروط من وقت لآخر. إذا أجرينا تغييرات جوهرية، سنتخذ خطوات معقولة لإخطار المستخدمين، مثل نشر الشروط المحدّثة على الموقع أو تقديم إشعار عبر الخدمة.',
          'تصبح الشروط المحدّثة سارية عند النشر ما لم يُذكر تاريخ سريان لاحق. استمرارك في استخدام الخدمة بعد سريان الشروط المحدّثة يعني قبولك للشروط المحدّثة.',
        ],
      },
      {
        title: '15. أحكام عامة',
        paragraphs: [
          'تشكل هذه الشروط الاتفاق الكامل بينك وبيننا بشأن الخدمة وتحل محل أي تفاهمات سابقة أو معاصرة حول الخدمة.',
          'إذا تبين أن أي حكم من هذه الشروط غير قابل للتنفيذ، تبقى الأحكام المتبقية سارية، ويُعدَّل الحكم غير القابل للتنفيذ بالحد الأدنى اللازم لجعله قابلًا للتنفيذ حيث يسمح القانون بذلك.',
          'لا يُعدّ فشلنا في إنفاذ أي حكم من هذه الشروط تنازلاً عن حقنا في القيام بذلك لاحقًا.',
          'لا يجوز لك التنازل عن حقوقك أو التزاماتك بموجب هذه الشروط أو نقلها دون موافقتنا الخطية المسبقة. يجوز لنا التنازل عن هذه الشروط كجزء من اندماج أو استحواذ أو إعادة تنظيم أو بيع أصول أو بموجب القانون.',
        ],
      },
    ],
    contactTitle: 'التواصل',
    contactBody: 'للأسئلة حول هذه الشروط، تواصل معنا على:',
    contactEmail: 'support@whosmarter.app',
  },
};

export type TermsLocale = keyof typeof terms;
