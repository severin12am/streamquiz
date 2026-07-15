// ============================================================
// WhoSmarter — Refund Policy (per-locale, web subscriptions)
// Rendered by app/refund-policy/page.tsx. Falls back to `en`.
// ============================================================

export type RefundSection = {
  title: string;
  paragraphs: string[];
  list?: string[];
};

export type RefundDoc = {
  pageTitle: string;
  effectiveDate: string;
  intro: string[];
  sections: RefundSection[];
  contactTitle: string;
  contactBody: string;
  contactEmail: string;
};

export const refund: Record<string, RefundDoc> = {
  en: {
    pageTitle: 'Refund Policy',
    effectiveDate: 'Effective date: July 15, 2026',
    intro: [
      'This Refund Policy applies to paid subscriptions and other paid features purchased through the WhoSmarter website at https://whosmarter.com (the "Service").',
      'WhoSmarter offers a digital subscription that unlocks a higher quiz-creation limit for hosts. Access is delivered immediately after a successful payment. Joining games as a guest remains free.',
    ],
    sections: [
      {
        title: 'General policy',
        paragraphs: [
          'Except where required by applicable law, all fees are final and non-refundable once a subscription or paid feature has been activated.',
          'We do not provide refunds for partial billing periods, unused quiz credits, change of mind, or because you no longer need the Service.',
        ],
      },
      {
        title: 'Limited exceptions',
        paragraphs: [
          'We may, at our sole discretion, issue a refund or account credit only in the following situations:',
        ],
        list: [
          'Duplicate charge — you were billed twice for the same subscription period.',
          'Technical failure — a verified payment was processed but your paid access did not activate within a reasonable time and we cannot fix it promptly.',
          'Accidental purchase — you contact us within 48 hours of purchase, no paid quiz was created after that purchase, and you have not materially used the paid quota.',
        ],
      },
      {
        title: 'How to request a refund',
        paragraphs: [
          'Email support@whosmarter.app from the address linked to your account (or the email used at checkout). Include your account email, the purchase date, the amount charged, and a brief explanation.',
          'We may ask for additional information to verify the transaction. Approved refunds are processed to the original payment method where possible; timing depends on your bank or payment provider.',
        ],
      },
      {
        title: 'Subscriptions and cancellation',
        paragraphs: [
          'You may cancel your subscription at any time through the account or billing settings shown at purchase. Cancellation stops future renewals; it does not entitle you to a refund for the current billing period.',
          'After cancellation, paid access continues until the end of the period already paid for, then the free tier applies.',
        ],
      },
      {
        title: 'Chargebacks and disputes',
        paragraphs: [
          'If you have a billing problem, contact us first at support@whosmarter.app so we can resolve it. Initiating a chargeback or payment dispute without contacting us may result in suspension of paid access while the case is reviewed.',
        ],
      },
      {
        title: 'Changes',
        paragraphs: [
          'We may update this Refund Policy from time to time. The effective date at the top of this page will change when we do. Continued use of paid features after an update means you accept the revised policy.',
        ],
      },
    ],
    contactTitle: 'Contact',
    contactBody: 'Questions about billing or refunds:',
    contactEmail: 'support@whosmarter.app',
  },

  ru: {
    pageTitle: 'Политика возвратов',
    effectiveDate: 'Дата вступления в силу: 15 июля 2026 г.',
    intro: [
      'Эта Политика возвратов применяется к платным подпискам и другим платным функциям, приобретённым на сайте WhoSmarter по адресу https://whosmarter.com («Сервис»).',
      'WhoSmarter предоставляет цифровую подписку с увеличенным лимитом создания викторин для ведущих. Доступ предоставляется сразу после успешной оплаты. Участие в играх как гость остаётся бесплатным.',
    ],
    sections: [
      {
        title: 'Общие положения',
        paragraphs: [
          'За исключением случаев, предусмотренных применимым законодательством, все платежи являются окончательными и не подлежат возврату после активации подписки или платной функции.',
          'Мы не возвращаем средства за неиспользованную часть периода, неиспользованные квоты викторин, из-за изменения решения или если Сервис вам больше не нужен.',
        ],
      },
      {
        title: 'Ограниченные исключения',
        paragraphs: [
          'По нашему усмотрению мы можем оформить возврат или зачёт на счёт только в следующих случаях:',
        ],
        list: [
          'Двойное списание — вы были дважды оплачены за один и тот же период подписки.',
          'Технический сбой — оплата прошла, но платный доступ не активировался в разумный срок, и мы не можем быстро это исправить.',
          'Случайная покупка — вы обращаетесь в течение 48 часов после покупки, после неё не было создано ни одной платной викторины, и вы существенно не использовали платную квоту.',
        ],
      },
      {
        title: 'Как запросить возврат',
        paragraphs: [
          'Напишите на support@whosmarter.app с адреса, привязанного к аккаунту (или указанного при оплате). Укажите email аккаунта, дату покупки, сумму и краткое описание причины.',
          'Мы можем запросить дополнительные данные для проверки транзакции. Одобренные возвраты по возможности отправляются на исходный способ оплаты; срок зависит от банка или платёжного провайдера.',
        ],
      },
      {
        title: 'Подписка и отмена',
        paragraphs: [
          'Вы можете отменить подписку в любой момент через настройки аккаунта или оплаты, указанные при покупке. Отмена останавливает будущие продления, но не даёт права на возврат за текущий оплаченный период.',
          'После отмены платный доступ сохраняется до конца уже оплаченного периода, затем действует бесплатный тариф.',
        ],
      },
      {
        title: 'Чарджбэки и споры',
        paragraphs: [
          'При проблемах с оплатой сначала свяжитесь с нами на support@whosmarter.app. Инициирование чарджбэка или спора без обращения к нам может привести к приостановке платного доступа на время рассмотрения.',
        ],
      },
      {
        title: 'Изменения',
        paragraphs: [
          'Мы можем обновлять эту Политику возвратов. Дата вступления в силу в начале страницы изменится при обновлении. Продолжение использования платных функций после изменений означает принятие новой редакции.',
        ],
      },
    ],
    contactTitle: 'Контакты',
    contactBody: 'Вопросы по оплате и возвратам:',
    contactEmail: 'support@whosmarter.app',
  },

  es: {
    pageTitle: 'Política de reembolsos',
    effectiveDate: 'Fecha de entrada en vigor: 15 de julio de 2026',
    intro: [
      'Esta Política de reembolsos se aplica a suscripciones de pago y otras funciones de pago adquiridas en el sitio web de WhoSmarter en https://whosmarter.com (el «Servicio»).',
      'WhoSmarter ofrece una suscripción digital que desbloquea un límite mayor de creación de concursos para anfitriones. El acceso se entrega inmediatamente tras un pago correcto. Unirse a juegos como invitado sigue siendo gratis.',
    ],
    sections: [
      {
        title: 'Política general',
        paragraphs: [
          'Salvo cuando la ley aplicable lo exija, todas las tarifas son finales y no reembolsables una vez activada una suscripción o función de pago.',
          'No reembolsamos periodos parciales, créditos de concursos no usados, cambios de opinión ni el hecho de que ya no necesites el Servicio.',
        ],
      },
      {
        title: 'Excepciones limitadas',
        paragraphs: [
          'Podemos, a nuestra entera discreción, emitir un reembolso o crédito en cuenta solo en estas situaciones:',
        ],
        list: [
          'Cargo duplicado — se te cobró dos veces el mismo periodo de suscripción.',
          'Fallo técnico — se procesó un pago verificado pero el acceso de pago no se activó en un plazo razonable y no podemos corregirlo con prontitud.',
          'Compra accidental — nos contactas en las 48 horas posteriores a la compra, no se creó ningún concurso de pago después de ella y no usaste de forma relevante la cuota de pago.',
        ],
      },
      {
        title: 'Cómo solicitar un reembolso',
        paragraphs: [
          'Envía un email a support@whosmarter.app desde la dirección vinculada a tu cuenta (o la usada en el pago). Incluye el email de la cuenta, la fecha de compra, el importe y una breve explicación.',
          'Podemos pedir información adicional para verificar la transacción. Los reembolsos aprobados se procesan al método de pago original cuando sea posible; el plazo depende de tu banco o proveedor de pago.',
        ],
      },
      {
        title: 'Suscripciones y cancelación',
        paragraphs: [
          'Puedes cancelar tu suscripción en cualquier momento mediante la configuración de cuenta o facturación mostrada al comprar. La cancelación detiene renovaciones futuras; no da derecho a reembolso del periodo de facturación actual.',
          'Tras la cancelación, el acceso de pago continúa hasta el final del periodo ya pagado; luego aplica el nivel gratuito.',
        ],
      },
      {
        title: 'Contracargos y disputas',
        paragraphs: [
          'Si tienes un problema de facturación, contáctanos primero en support@whosmarter.app. Iniciar un contracargo o disputa de pago sin contactarnos puede suponer la suspensión del acceso de pago mientras se revisa el caso.',
        ],
      },
      {
        title: 'Cambios',
        paragraphs: [
          'Podemos actualizar esta Política de reembolsos. La fecha de entrada en vigor en la parte superior cambiará cuando lo hagamos. El uso continuado de funciones de pago tras una actualización implica la aceptación de la política revisada.',
        ],
      },
    ],
    contactTitle: 'Contacto',
    contactBody: 'Preguntas sobre facturación o reembolsos:',
    contactEmail: 'support@whosmarter.app',
  },

  fr: {
    pageTitle: 'Politique de remboursement',
    effectiveDate: 'Date d’entrée en vigueur : 15 juillet 2026',
    intro: [
      'Cette Politique de remboursement s’applique aux abonnements payants et autres fonctionnalités payantes achetés sur le site WhoSmarter à l’adresse https://whosmarter.com (le « Service »).',
      'WhoSmarter propose un abonnement numérique qui débloque une limite accrue de création de quiz pour les hôtes. L’accès est fourni immédiatement après un paiement réussi. Rejoindre des parties en tant qu’invité reste gratuit.',
    ],
    sections: [
      {
        title: 'Politique générale',
        paragraphs: [
          'Sauf lorsque la loi applicable l’exige, tous les frais sont définitifs et non remboursables une fois qu’un abonnement ou une fonctionnalité payante a été activé(e).',
          'Nous ne remboursons pas les périodes partielles, les crédits de quiz non utilisés, un changement d’avis ou le fait que vous n’ayez plus besoin du Service.',
        ],
      },
      {
        title: 'Exceptions limitées',
        paragraphs: [
          'Nous pouvons, à notre seule discrétion, accorder un remboursement ou un crédit de compte uniquement dans les situations suivantes :',
        ],
        list: [
          'Double facturation — vous avez été débité deux fois pour la même période d’abonnement.',
          'Défaillance technique — un paiement vérifié a été traité mais l’accès payant ne s’est pas activé dans un délai raisonnable et nous ne pouvons pas corriger rapidement.',
          'Achat accidentel — vous nous contactez dans les 48 heures suivant l’achat, aucun quiz payant n’a été créé après celui-ci et vous n’avez pas utilisé de manière significative le quota payant.',
        ],
      },
      {
        title: 'Comment demander un remboursement',
        paragraphs: [
          'Envoyez un e-mail à support@whosmarter.app depuis l’adresse liée à votre compte (ou celle utilisée lors du paiement). Indiquez l’e-mail du compte, la date d’achat, le montant facturé et une brève explication.',
          'Nous pouvons demander des informations supplémentaires pour vérifier la transaction. Les remboursements approuvés sont traités vers le moyen de paiement d’origine lorsque c’est possible ; les délais dépendent de votre banque ou prestataire de paiement.',
        ],
      },
      {
        title: 'Abonnements et résiliation',
        paragraphs: [
          'Vous pouvez résilier votre abonnement à tout moment via les paramètres de compte ou de facturation indiqués lors de l’achat. La résiliation arrête les renouvellements futurs ; elle ne donne pas droit au remboursement de la période de facturation en cours.',
          'Après résiliation, l’accès payant continue jusqu’à la fin de la période déjà payée, puis le niveau gratuit s’applique.',
        ],
      },
      {
        title: 'Rétrofacturations et litiges',
        paragraphs: [
          'En cas de problème de facturation, contactez-nous d’abord à support@whosmarter.app. Lancer une rétrofacturation ou un litige de paiement sans nous contacter peut entraîner la suspension de l’accès payant pendant l’examen du dossier.',
        ],
      },
      {
        title: 'Modifications',
        paragraphs: [
          'Nous pouvons mettre à jour cette Politique de remboursement. La date d’entrée en vigueur en haut de page sera modifiée le cas échéant. L’utilisation continue des fonctionnalités payantes après une mise à jour vaut acceptation de la politique révisée.',
        ],
      },
    ],
    contactTitle: 'Contact',
    contactBody: 'Questions sur la facturation ou les remboursements :',
    contactEmail: 'support@whosmarter.app',
  },

  de: {
    pageTitle: 'Rückerstattungsrichtlinie',
    effectiveDate: 'Gültig ab: 15. Juli 2026',
    intro: [
      'Diese Rückerstattungsrichtlinie gilt für kostenpflichtige Abonnements und andere kostenpflichtige Funktionen, die über die WhoSmarter-Website unter https://whosmarter.com (der „Dienst“) erworben wurden.',
      'WhoSmarter bietet ein digitales Abonnement, das ein höheres Limit für die Quiz-Erstellung durch Gastgeber freischaltet. Der Zugang wird unmittelbar nach erfolgreicher Zahlung bereitgestellt. Der Beitritt zu Spielen als Gast bleibt kostenlos.',
    ],
    sections: [
      {
        title: 'Allgemeine Regelung',
        paragraphs: [
          'Sofern geltendes Recht nichts anderes vorschreibt, sind alle Gebühren endgültig und nicht erstattungsfähig, sobald ein Abonnement oder eine kostenpflichtige Funktion aktiviert wurde.',
          'Wir erstatten keine anteiligen Abrechnungszeiträume, ungenutzte Quiz-Guthaben, Meinungsänderungen oder den Umstand, dass du den Dienst nicht mehr benötigst.',
        ],
      },
      {
        title: 'Begrenzte Ausnahmen',
        paragraphs: [
          'Wir können nach alleinigem Ermessen eine Rückerstattung oder Gutschrift nur in folgenden Fällen gewähren:',
        ],
        list: [
          'Doppelabbuchung — du wurdest zweimal für denselben Abonnementzeitraum belastet.',
          'Technischer Ausfall — eine verifizierte Zahlung wurde verarbeitet, aber der kostenpflichtige Zugang wurde nicht innerhalb angemessener Zeit aktiviert und wir können es nicht umgehend beheben.',
          'Versehentlicher Kauf — du kontaktierst uns innerhalb von 48 Stunden nach dem Kauf, es wurde danach kein kostenpflichtiges Quiz erstellt und du hast das kostenpflichtige Kontingent nicht wesentlich genutzt.',
        ],
      },
      {
        title: 'So beantragst du eine Rückerstattung',
        paragraphs: [
          'Schreibe an support@whosmarter.app von der mit deinem Konto verknüpften Adresse (oder der beim Checkout verwendeten). Gib Kontoe-Mail, Kaufdatum, Betrag und eine kurze Begründung an.',
          'Wir können zusätzliche Informationen zur Verifizierung anfordern. Genehmigte Rückerstattungen werden nach Möglichkeit an die ursprüngliche Zahlungsmethode zurückgebucht; die Dauer hängt von Bank oder Zahlungsanbieter ab.',
        ],
      },
      {
        title: 'Abonnements und Kündigung',
        paragraphs: [
          'Du kannst dein Abonnement jederzeit über die beim Kauf angezeigten Konto- oder Abrechnungseinstellungen kündigen. Die Kündigung stoppt künftige Verlängerungen; sie berechtigt nicht zur Rückerstattung des laufenden Abrechnungszeitraums.',
          'Nach der Kündigung bleibt der kostenpflichtige Zugang bis zum Ende des bereits bezahlten Zeitraums bestehen, danach gilt das kostenlose Kontingent.',
        ],
      },
      {
        title: 'Rückbuchungen und Streitigkeiten',
        paragraphs: [
          'Bei Abrechnungsproblemen kontaktiere uns zuerst unter support@whosmarter.app. Eine Rückbuchung oder Zahlungsstreitigkeit ohne vorherige Kontaktaufnahme kann zur Aussetzung des kostenpflichtigen Zugangs während der Prüfung führen.',
        ],
      },
      {
        title: 'Änderungen',
        paragraphs: [
          'Wir können diese Rückerstattungsrichtlinie von Zeit zu Zeit aktualisieren. Das Gültigkeitsdatum oben auf der Seite ändert sich entsprechend. Die weitere Nutzung kostenpflichtiger Funktionen nach einer Aktualisierung gilt als Zustimmung zur überarbeiteten Richtlinie.',
        ],
      },
    ],
    contactTitle: 'Kontakt',
    contactBody: 'Fragen zu Abrechnung oder Rückerstattungen:',
    contactEmail: 'support@whosmarter.app',
  },

  ja: {
    pageTitle: '返金ポリシー',
    effectiveDate: '発効日：2026年7月15日',
    intro: [
      '本返金ポリシーは、https://whosmarter.com の WhoSmarter ウェブサイト（「サービス」）で購入した有料サブスクリプションおよびその他の有料機能に適用されます。',
      'WhoSmarter は、ホスト向けにクイズ作成上限を引き上げるデジタルサブスクリプションを提供します。支払い成功後、すぐにアクセスが付与されます。ゲストとしての参加は引き続き無料です。',
    ],
    sections: [
      {
        title: '基本方針',
        paragraphs: [
          '適用法で義務付けられている場合を除き、サブスクリプションまたは有料機能が有効化された後の料金は原則として返金不可です。',
          '請求期間の一部、未使用のクイズ枠、気が変わった場合、サービスが不要になった場合などによる返金は行いません。',
        ],
      },
      {
        title: '限定的な例外',
        paragraphs: [
          '当社の単独の裁量により、次の場合に限り返金またはアカウントクレジットを行うことがあります：',
        ],
        list: [
          '二重請求 — 同じサブスクリプション期間に対して二回請求された場合。',
          '技術的障害 — 支払いは確認されたが、合理的な時間内に有料アクセスが有効化されず、当社が速やかに修正できない場合。',
          '誤購入 — 購入後48時間以内に連絡があり、購入後に有料クイズが作成されておらず、有料枠を実質的に使用していない場合。',
        ],
      },
      {
        title: '返金の申請方法',
        paragraphs: [
          'アカウントに紐づくメールアドレス（またはチェックアウト時のメール）から support@whosmarter.app までご連絡ください。アカウントメール、購入日、請求額、簡単な理由を記載してください。',
          '取引確認のため追加情報をお願いする場合があります。承認された返金は可能な限り元の支払い方法に処理されます。着金時期は銀行または決済事業者により異なります。',
        ],
      },
      {
        title: 'サブスクリプションと解約',
        paragraphs: [
          '購入時に表示されるアカウントまたは請求設定から、いつでもサブスクリプションを解約できます。解約は今後の更新を停止しますが、現在の請求期間の返金権は生じません。',
          '解約後も、既に支払った期間の終了までは有料アクセスが継続し、その後は無料枠が適用されます。',
        ],
      },
      {
        title: 'チャージバックと紛争',
        paragraphs: [
          '請求に問題がある場合は、まず support@whosmarter.app までご連絡ください。当社に連絡せずチャージバックや支払い紛争を開始した場合、審査中は有料アクセスを停止することがあります。',
        ],
      },
      {
        title: '変更',
        paragraphs: [
          '本返金ポリシーは随時更新される場合があります。ページ上部の発効日が更新されます。更新後も有料機能を利用し続けることは、改定版への同意を意味します。',
        ],
      },
    ],
    contactTitle: 'お問い合わせ',
    contactBody: '請求または返金に関するご質問：',
    contactEmail: 'support@whosmarter.app',
  },

  ar: {
    pageTitle: 'سياسة الاسترداد',
    effectiveDate: 'تاريخ السريان: 15 يوليو 2026',
    intro: [
      'تنطبق سياسة الاسترداد هذه على الاشتراكات المدفوعة والميزات المدفوعة الأخرى المشتراة عبر موقع WhoSmarter على https://whosmarter.com («الخدمة»).',
      'يوفر WhoSmarter اشتراكًا رقميًا يزيد حد إنشاء المسابقات للمضيفين. يُمنح الوصول فورًا بعد الدفع الناجح. الانضمام إلى الألعاب كضيف يظل مجانيًا.',
    ],
    sections: [
      {
        title: 'السياسة العامة',
        paragraphs: [
          'ما لم يقتضِ القانون المعمول به خلاف ذلك، جميع الرسوم نهائية وغير قابلة للاسترداد بمجرد تفعيل الاشتراك أو الميزة المدفوعة.',
          'لا نسترد المبالغ عن فترات فوترة جزئية، أو أرصدة مسابقات غير مستخدمة، أو تغيير الرأي، أو عدم الحاجة إلى الخدمة.',
        ],
      },
      {
        title: 'استثناءات محدودة',
        paragraphs: [
          'يجوز لنا، وفق تقديرنا وحده، إصدار استرداد أو رصيد في الحساب فقط في الحالات التالية:',
        ],
        list: [
          'خصم مكرر — تم خصم المبلغ مرتين لنفس فترة الاشتراك.',
          'عطل تقني — تمت معالجة دفعة مؤكدة لكن الوصول المدفوع لم يُفعَّل خلال وقت معقول ولا يمكننا إصلاح ذلك بسرعة.',
          'شراء بالخطأ — تتواصل معنا خلال 48 ساعة من الشراء، ولم تُنشأ مسابقة مدفوعة بعدها، ولم تستخدم الحصة المدفوعة بشكل جوهري.',
        ],
      },
      {
        title: 'كيفية طلب الاسترداد',
        paragraphs: [
          'راسل support@whosmarter.app من البريد المرتبط بحسابك (أو المستخدم عند الدفع). اذكر بريد الحساب وتاريخ الشراء والمبلغ وشرحًا موجزًا.',
          'قد نطلب معلومات إضافية للتحقق من المعاملة. تُعالَج المبالغ المستردة المعتمدة إلى طريقة الدفع الأصلية حيثما أمكن؛ يعتمد التوقيت على البنك أو مزود الدفع.',
        ],
      },
      {
        title: 'الاشتراكات والإلغاء',
        paragraphs: [
          'يمكنك إلغاء اشتراكك في أي وقت عبر إعدادات الحساب أو الفوترة المعروضة عند الشراء. الإلغاء يوقف التجديدات المستقبلية ولا يمنح استردادًا للفترة الحالية.',
          'بعد الإلغاء، يستمر الوصول المدفوع حتى نهاية الفترة المدفوعة، ثم يُطبَّق المستوى المجاني.',
        ],
      },
      {
        title: 'استردادات البنوك والنزاعات',
        paragraphs: [
          'إذا واجهت مشكلة في الفوترة، تواصل معنا أولًا على support@whosmarter.app. بدء نزاع دفع أو استرداد بنكي دون التواصل معنا قد يؤدي إلى تعليق الوصول المدفوع أثناء المراجعة.',
        ],
      },
      {
        title: 'التغييرات',
        paragraphs: [
          'قد نحدّث سياسة الاسترداد هذه من وقت لآخر. يتغير تاريخ السريان أعلى الصفحة عند التحديث. استمرار استخدام الميزات المدفوعة بعد التحديث يعني قبول السياسة المنقحة.',
        ],
      },
    ],
    contactTitle: 'التواصل',
    contactBody: 'أسئلة حول الفوترة أو الاسترداد:',
    contactEmail: 'support@whosmarter.app',
  },
};

export type RefundLocale = keyof typeof refund;
