// ============================================================
// WhoSmarter — first-visit onboarding copy (per-locale)
//
// Short “how it works” walkthrough on the home page for signed-out
// first-time visitors. Falls back to `en` for any locale not listed.
// ============================================================

export const onboarding = {
  en: {
    title: 'How it works',
    skip: 'Skip',
    back: 'Back',
    next: 'Next',
    done: 'Got it',
    cameraSettingCta: 'Tap this switch to turn video off in More',
    steps: [
      {
        title: 'What is WhoSmarter?',
        body: 'WhoSmarter is a live quiz for up to 6 players. Type a topic, AI writes the questions, and everyone answers together from a phone or computer. You’ll sign in with Google when you’re ready to create.\n\nIf you don’t want video, open More and turn off Player cameras — the switch looks like this:',
      },
      {
        title: 'Invite friends',
        body: 'Share the link or QR code. Up to 5 friends join free from a phone or computer — no account needed.',
      },
      {
        title: 'Play together',
        body: 'Everyone answers at the same time. Correct answers earn points — then see who wins.',
      },
      {
        title: 'Adjust settings',
        body: 'Open More to change difficulty, number of questions, answer time, game mode, multiple choice, and invite-only. If you don’t want video, turn off Player cameras there.',
      },
      {
        title: 'Special categories',
        body: 'Beyond free-text topics, you can also drop a PDF under More — the quiz is built from that document, with topic and difficulty turned off.',
      },
      {
        title: 'Open games',
        body: 'Don’t have friends to play with? Browse open games and join a public quiz that’s waiting for players — or turn off Invite only so yours appears in that list.',
      },
    ],
  },

  ru: {
    title: 'Как это работает',
    skip: 'Пропустить',
    back: 'Назад',
    next: 'Далее',
    done: 'Понятно',
    cameraSettingCta: 'Нажмите переключатель, чтобы выключить видео в «Ещё»',
    steps: [
      {
        title: 'Что такое WhoSmarter?',
        body: 'WhoSmarter — живая викторина до 6 игроков. Введите тему, ИИ напишет вопросы, и все отвечают вместе с телефона или компьютера. Войдите через Google, когда будете готовы создать игру.\n\nЕсли видео не нужно, откройте «Ещё» и выключите «Камеры игроков» — переключатель выглядит так:',
      },
      {
        title: 'Пригласите друзей',
        body: 'Поделитесь ссылкой или QR-кодом. До 5 друзей заходят бесплатно с телефона или компьютера — аккаунт не нужен.',
      },
      {
        title: 'Играйте вместе',
        body: 'Все отвечают одновременно. За правильные ответы начисляются очки — потом видно, кто победил.',
      },
      {
        title: 'Настройте параметры',
        body: 'В разделе «Ещё» можно изменить сложность, число вопросов, время на ответ, режим игры, варианты ответов и приватность. Если видео не нужно, выключите «Камеры игроков».',
      },
      {
        title: 'Особые категории',
        body: 'Кроме свободной темы в «Ещё» можно загрузить PDF — викторина строится по документу, тема и сложность отключаются.',
      },
      {
        title: 'Открытые игры',
        body: 'Нет друзей, с кем сыграть? Загляните в открытые игры и присоединитесь к публичной викторине, где ждут игроков — или отключите «Только по ссылке», чтобы ваша игра появилась в этом списке.',
      },
    ],
  },

  es: {
    title: 'Cómo funciona',
    skip: 'Omitir',
    back: 'Atrás',
    next: 'Siguiente',
    done: 'Entendido',
    cameraSettingCta: 'Toca este interruptor para apagar el vídeo en Más',
    steps: [
      {
        title: '¿Qué es WhoSmarter?',
        body: 'WhoSmarter es un concurso en directo para hasta 6 jugadores. Escribe un tema, la IA genera las preguntas y todos responden juntos desde el móvil o el ordenador. Iniciarás sesión con Google cuando quieras crear la partida.\n\nSi no quieres vídeo, abre Más y desactiva Cámaras de jugadores — el interruptor se ve así:',
      },
      {
        title: 'Invita a amigos',
        body: 'Comparte el enlace o el código QR. Hasta 5 amigos se unen gratis desde el móvil o el ordenador — sin cuenta.',
      },
      {
        title: 'Jugad juntos',
        body: 'Todos responden a la vez. Las respuestas correctas suman puntos — luego veréis quién gana.',
      },
      {
        title: 'Ajusta los ajustes',
        body: 'Abre Más para cambiar dificultad, número de preguntas, tiempo, modo de juego, opción múltiple y si es solo por invitación. Si no quieres vídeo, desactiva Cámaras de jugadores ahí.',
      },
      {
        title: 'Categorías especiales',
        body: 'Además de temas libres, en Más puedes soltar un PDF — el concurso se crea a partir del documento, con tema y dificultad desactivados.',
      },
      {
        title: 'Partidas abiertas',
        body: '¿No tienes amigos con quienes jugar? Explora las partidas abiertas y únete a un concurso público que espera jugadores — o desactiva Solo por invitación para que el tuyo aparezca en esa lista.',
      },
    ],
  },

  fr: {
    title: 'Comment ça marche',
    skip: 'Passer',
    back: 'Retour',
    next: 'Suivant',
    done: 'Compris',
    cameraSettingCta: 'Touchez ce bouton pour couper la vidéo dans Plus',
    steps: [
      {
        title: 'Qu’est-ce que WhoSmarter\u00a0?',
        body: 'WhoSmarter est un quiz en direct jusqu’à 6 joueurs. Saisissez un sujet, l’IA rédige les questions, et tout le monde répond ensemble depuis un téléphone ou un ordinateur. Vous vous connecterez avec Google quand vous serez prêt à créer.\n\nSi vous ne voulez pas de vidéo, ouvrez Plus et désactivez Caméras des joueurs — le bouton ressemble à ceci\u00a0:',
      },
      {
        title: 'Invitez vos amis',
        body: 'Partagez le lien ou le QR code. Jusqu’à 5 amis rejoignent gratuitement depuis un téléphone ou un ordinateur — sans compte.',
      },
      {
        title: 'Jouez ensemble',
        body: 'Tout le monde répond en même temps. Les bonnes réponses rapportent des points — puis on voit qui gagne.',
      },
      {
        title: 'Ajustez les réglages',
        body: 'Ouvrez Plus pour régler difficulté, nombre de questions, temps, mode de jeu, QCM et invitation uniquement. Si vous ne voulez pas de vidéo, désactivez Caméras des joueurs.',
      },
      {
        title: 'Catégories spéciales',
        body: 'Au-delà des sujets libres, vous pouvez aussi déposer un PDF dans Plus — le quiz est généré à partir du document, sans sujet ni difficulté.',
      },
      {
        title: 'Parties ouvertes',
        body: 'Pas d’amis avec qui jouer ? Parcourez les parties ouvertes et rejoignez un quiz public qui attend des joueurs — ou désactivez Sur invitation uniquement pour que le vôtre apparaisse dans cette liste.',
      },
    ],
  },

  de: {
    title: 'So funktioniert’s',
    skip: 'Überspringen',
    back: 'Zurück',
    next: 'Weiter',
    done: 'Verstanden',
    cameraSettingCta: 'Tippe diesen Schalter, um Video unter Mehr auszuschalten',
    steps: [
      {
        title: 'Was ist WhoSmarter?',
        body: 'WhoSmarter ist ein Live-Quiz für bis zu 6 Spieler. Gib ein Thema ein, die KI schreibt die Fragen, und alle antworten gemeinsam am Handy oder Computer. Mit Google anmelden, wenn du bereit bist zu erstellen.\n\nWenn du kein Video willst, öffne Mehr und schalte Spieler-Kameras aus — der Schalter sieht so aus:',
      },
      {
        title: 'Freunde einladen',
        body: 'Teile den Link oder QR-Code. Bis zu 5 Freunde treten kostenlos per Handy oder Computer bei — ohne Konto.',
      },
      {
        title: 'Zusammen spielen',
        body: 'Alle antworten gleichzeitig. Richtige Antworten bringen Punkte — danach seht ihr, wer gewinnt.',
      },
      {
        title: 'Einstellungen anpassen',
        body: 'Unter Mehr stellst du Schwierigkeit, Fragenanzahl, Antwortzeit, Spielmodus, Multiple Choice und Einladung ein. Wenn du kein Video willst, schalte Spieler-Kameras aus.',
      },
      {
        title: 'Spezialkategorien',
        body: 'Neben freien Themen kannst du unter Mehr auch ein PDF ablegen — das Quiz entsteht aus dem Dokument, Thema und Schwierigkeit sind aus.',
      },
      {
        title: 'Offene Spiele',
        body: 'Keine Freunde zum Spielen? Durchsuche offene Spiele und tritt einem öffentlichen Quiz bei, das auf Spieler wartet — oder schalte Nur per Einladung aus, damit deines in der Liste erscheint.',
      },
    ],
  },

  ja: {
    title: '使い方',
    skip: 'スキップ',
    back: '戻る',
    next: '次へ',
    done: 'わかった',
    cameraSettingCta: 'このスイッチをタップすると「その他」で映像がオフになります',
    steps: [
      {
        title: 'WhoSmarterとは',
        body: 'WhoSmarterは最大6人のライブクイズです。トピックを入力するとAIが問題を作り、スマホやPCから一緒に答えます。作成するときにGoogleでサインインします。\n\n映像が不要なら「その他」を開いて「プレイヤーカメラ」をオフにしてください。スイッチはこんな見た目です：',
      },
      {
        title: '友達を招待',
        body: 'リンクやQRコードを共有。最大5人がスマホやPCから無料で参加 — アカウント不要です。',
      },
      {
        title: '一緒にプレイ',
        body: '全員が同時に回答。正解でポイントが入り、勝者が決まります。',
      },
      {
        title: '設定を調整',
        body: '「その他」から難易度、問題数、回答時間、ゲームモード、選択式、招待のみを変更できます。映像が不要なら「プレイヤーカメラ」をオフにしてください。',
      },
      {
        title: '特別カテゴリ',
        body: '自由入力のトピック以外に、「もっと」からPDFをドロップできます — その文書からクイズが作られ、トピックと難易度はオフになります。',
      },
      {
        title: 'オープンゲーム',
        body: '一緒に遊ぶ友達がいない？オープンゲームから参加待ちの公開クイズに入れます。または「招待のみ」をオフにすると、自分のクイズが一覧に表示されます。',
      },
    ],
  },

  ar: {
    title: 'كيف يعمل',
    skip: 'تخطي',
    back: 'رجوع',
    next: 'التالي',
    done: 'حسنًا',
    cameraSettingCta: 'المس هذا المفتاح لإيقاف الفيديو من «المزيد»',
    steps: [
      {
        title: 'ما هو WhoSmarter؟',
        body: 'WhoSmarter مسابقة مباشرة لما يصل إلى 6 لاعبين. اكتب موضوعًا، يكتب الذكاء الاصطناعي الأسئلة، ويجيب الجميع معًا من الهاتف أو الكمبيوتر. ستسجّل الدخول عبر Google عندما تكون جاهزًا للإنشاء.\n\nإذا لا تريد فيديو، افتح «المزيد» وأوقف «كاميرات اللاعبين» — المفتاح يبدو هكذا:',
      },
      {
        title: 'ادعُ الأصدقاء',
        body: 'شارك الرابط أو رمز QR. ينضم حتى 5 أصدقاء مجانًا من الهاتف أو الكمبيوتر — بلا حساب.',
      },
      {
        title: 'العبوا معًا',
        body: 'الجميع يجيب في الوقت نفسه. الإجابات الصحيحة تمنح نقاطًا — ثم ترون من يفوز.',
      },
      {
        title: 'اضبط الإعدادات',
        body: 'افتح «المزيد» لتعديل الصعوبة وعدد الأسئلة ووقت الإجابة ووضع اللعب والاختيار من متعدد والدعوة فقط. إذا لا تريد فيديو، أوقف «كاميرات اللاعبين» هناك.',
      },
      {
        title: 'فئات خاصة',
        body: 'إلى جانب المواضيع الحرة، يمكنك أيضًا إسقاط ملف PDF ضمن «المزيد» — تُبنى المسابقة من المستند مع إيقاف الموضوع والصعوبة.',
      },
      {
        title: 'الألعاب المفتوحة',
        body: 'ليس لديك أصدقاء للعب معهم؟ تصفّح الألعاب المفتوحة وانضم إلى مسابقة عامة تنتظر لاعبين — أو أوقف «بدعوة فقط» ليظهر لعبتك في تلك القائمة.',
      },
    ],
  },
} as const;

export type OnboardingLocale = keyof typeof onboarding;
