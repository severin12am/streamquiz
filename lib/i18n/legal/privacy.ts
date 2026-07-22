// ============================================================
// WhoSmarter — Privacy Policy content (per-locale)
//
// Adapted from the shared legal page (iOS) for the web build:
//   - covers web + mobile apps (not iOS-only)
//   - notes Google sign-in for hosts (email + basic profile)
//   - permissions are granted/revoked in the browser or device
//   - Google added to third-party services
//
// Rendered by app/privacy/page.tsx. Falls back to `en` for any
// locale not listed here.
// ============================================================

export const privacy = {
  en: {
    pageTitle: 'Privacy Policy & Support',
    lastUpdated: 'Last updated: June 24, 2026',
    tagline: 'Real-time multiplayer quiz with AI questions',

    introTitle: 'Privacy Policy',
    intro:
      'WhoSmarter ("we", "us", or "our") respects your privacy. This policy explains how we collect, use, and protect your information when you use WhoSmarter on the web or in our mobile apps.',

    collectTitle: 'Information We Collect',
    collectIntro: 'Depending on how you use the service, we may collect:',
    collectItem1:
      'Anonymous game data (topics chosen, answers, scores, transcripts during rounds)',
    collectItem2: 'Device information and usage analytics (non-identifiable)',
    collectItem3:
      'Camera and microphone input — only when you enable video or voice mode (processed in real time, not stored as recordings)',
    collectItem4:
      'Speech-to-text transcripts (temporary, used only for answer judging)',
    collectItem5:
      'If you create a quiz as a host and sign in with Google, we receive your email address and basic profile information from Google for authentication only',
    collectNote:
      'Guests can join games without creating an account. Host accounts are used only to create quizzes and manage access to AI features.',

    useTitle: 'How We Use Your Information',
    useItem1: 'Run real-time synchronized games across devices',
    useItem2: 'Score answers (local matching + optional AI judging)',
    useItem3: 'Enable optional peer-to-peer video and audio (WebRTC)',
    useItem4: 'Generate AI questions and help judge voice answers',
    useItem5: 'Authenticate hosts who sign in with Google',

    permissionsTitle: 'Permissions Requested',
    permissions:
      'Camera and microphone access are optional. On the web, you can grant or revoke them in your browser or device settings. Speech recognition is only active during voice-answer rounds.',

    thirdPartyTitle: 'Third-Party Services',
    thirdPartyIntro: 'We use trusted third-party services to operate the product:',
    thirdPartyItem1:
      'Supabase — stores anonymous game state and enables realtime sync',
    thirdPartyItem2:
      'OpenRouter / AI models — temporary processing for question generation and answer judging (inputs are anonymized where possible)',
    thirdPartyItem3:
      'RevenueCat — handles subscriptions for creators (only if you purchase)',
    thirdPartyItem4:
      'Google — sign-in for hosts who choose to authenticate with Google',
    thirdPartyItem5:
      'Stripe — processes subscription payments for web hosts (only if you subscribe on whosmarter.com); we never see or store your card details',
    thirdPartyNote:
      'We do not sell your data. Data is retained only as long as needed for the game session and related service operation.',

    rightsTitle: 'Your Rights',
    rights:
      'You can revoke camera and microphone permissions at any time in your browser or device settings. For data deletion requests or questions, contact us using the details below.',

    supportTitle: 'Support & Contact',
    supportIntro: 'Need help with WhoSmarter?',
    supportEmailLabel: 'Email Support',
    supportEmail: 'support@whosmarter.com',
    supportReply: 'We usually reply within 24–48 hours.',
    supportWebsiteLabel: 'Website',
    supportWebsiteHint: 'Play the web version and see the latest updates.',
    supportFooter:
      'This page serves as our Privacy Policy and support contact for WhoSmarter on the web.',
  },

  ru: {
    pageTitle: 'Политика конфиденциальности и поддержка',
    lastUpdated: 'Последнее обновление: 24 июня 2026',
    tagline: 'Мультиплеерная викторина в реальном времени с вопросами от ИИ',

    introTitle: 'Политика конфиденциальности',
    intro:
      'WhoSmarter («мы», «нас» или «наш») уважает вашу конфиденциальность. Эта политика объясняет, как мы собираем, используем и защищаем вашу информацию при использовании WhoSmarter в веб-версии или в наших мобильных приложениях.',

    collectTitle: 'Какие данные мы собираем',
    collectIntro: 'В зависимости от того, как вы используете сервис, мы можем собирать:',
    collectItem1:
      'Анонимные игровые данные (выбранные темы, ответы, счёт, расшифровки речи во время раундов)',
    collectItem2:
      'Информацию об устройстве и аналитику использования (без идентификации личности)',
    collectItem3:
      'Данные с камеры и микрофона — только если вы включаете видео или голосовой режим (обрабатываются в реальном времени, записи не сохраняются)',
    collectItem4:
      'Расшифровки речи (временные, используются только для проверки ответов)',
    collectItem5:
      'Если вы создаёте викторину как ведущий и входите через Google, мы получаем ваш email и базовую информацию профиля от Google только для аутентификации',
    collectNote:
      'Гости могут присоединяться к играм без регистрации. Аккаунт ведущего нужен только для создания викторин и доступа к функциям ИИ.',

    useTitle: 'Как мы используем ваши данные',
    useItem1: 'Для синхронизированных игр в реальном времени на разных устройствах',
    useItem2: 'Для подсчёта очков (локальное сопоставление + опциональная проверка ИИ)',
    useItem3: 'Для опционального видео и аудио между игроками (WebRTC)',
    useItem4: 'Для генерации вопросов ИИ и проверки голосовых ответов',
    useItem5: 'Для аутентификации ведущих, которые входят через Google',

    permissionsTitle: 'Запрашиваемые разрешения',
    permissions:
      'Доступ к камере и микрофону необязателен. В браузере вы можете выдать или отозвать разрешения в настройках браузера или устройства. Распознавание речи активно только во время голосовых раундов.',

    thirdPartyTitle: 'Сторонние сервисы',
    thirdPartyIntro: 'Мы используем надёжные сторонние сервисы для работы продукта:',
    thirdPartyItem1:
      'Supabase — хранит анонимное состояние игры и обеспечивает синхронизацию в реальном времени',
    thirdPartyItem2:
      'OpenRouter / модели ИИ — временная обработка для генерации вопросов и проверки ответов (данные по возможности анонимизируются)',
    thirdPartyItem3:
      'RevenueCat — обрабатывает подписки для создателей (только при покупке)',
    thirdPartyItem4:
      'Google — вход для ведущих, которые выбирают аутентификацию через Google',
    thirdPartyItem5:
      'Stripe — обрабатывает оплату подписок для веб-ведущих (только если вы подписываетесь на whosmarter.com); данные карты мы не видим и не храним',
    thirdPartyNote:
      'Мы не продаём ваши данные. Данные хранятся только столько, сколько нужно для игровой сессии и работы сервиса.',

    rightsTitle: 'Ваши права',
    rights:
      'Вы можете в любой момент отозвать доступ к камере и микрофону в настройках браузера или устройства. Для запросов на удаление данных или по другим вопросам свяжитесь с нами по контактам ниже.',

    supportTitle: 'Поддержка и контакты',
    supportIntro: 'Нужна помощь с WhoSmarter?',
    supportEmailLabel: 'Email поддержки',
    supportEmail: 'support@whosmarter.com',
    supportReply: 'Обычно отвечаем в течение 24–48 часов.',
    supportWebsiteLabel: 'Сайт',
    supportWebsiteHint: 'Играйте в веб-версии и следите за обновлениями.',
    supportFooter:
      'Эта страница является политикой конфиденциальности и контактом поддержки WhoSmarter в веб-версии.',
  },

  es: {
    pageTitle: 'Política de privacidad y soporte',
    lastUpdated: 'Última actualización: 24 de junio de 2026',
    tagline: 'Concurso multijugador en tiempo real con preguntas de IA',

    introTitle: 'Política de privacidad',
    intro:
      'WhoSmarter («nosotros», «nos» o «nuestro») respeta tu privacidad. Esta política explica cómo recopilamos, usamos y protegemos tu información cuando usas WhoSmarter en la web o en nuestras aplicaciones móviles.',

    collectTitle: 'Información que recopilamos',
    collectIntro: 'Según cómo uses el servicio, podemos recopilar:',
    collectItem1:
      'Datos anónimos de la partida (temas elegidos, respuestas, puntuaciones, transcripciones durante las rondas)',
    collectItem2: 'Información del dispositivo y analítica de uso (no identificable)',
    collectItem3:
      'Entrada de cámara y micrófono — solo si activas el modo vídeo o voz (procesada en tiempo real, sin guardar grabaciones)',
    collectItem4:
      'Transcripciones de voz a texto (temporales, solo para evaluar respuestas)',
    collectItem5:
      'Si creas un concurso como anfitrión e inicias sesión con Google, recibimos tu correo electrónico e información básica del perfil de Google solo para autenticación',
    collectNote:
      'Los invitados pueden unirse sin crear una cuenta. La cuenta de anfitrión solo se usa para crear concursos y acceder a funciones de IA.',

    useTitle: 'Cómo usamos tu información',
    useItem1: 'Ejecutar partidas sincronizadas en tiempo real entre dispositivos',
    useItem2: 'Puntuar respuestas (coincidencia local + evaluación opcional con IA)',
    useItem3: 'Habilitar vídeo y audio entre pares opcional (WebRTC)',
    useItem4: 'Generar preguntas con IA y ayudar a evaluar respuestas de voz',
    useItem5: 'Autenticar anfitriones que inician sesión con Google',

    permissionsTitle: 'Permisos solicitados',
    permissions:
      'El acceso a cámara y micrófono es opcional. En la web, puedes concederlo o revocarlo en la configuración del navegador o del dispositivo. El reconocimiento de voz solo está activo durante rondas de respuesta por voz.',

    thirdPartyTitle: 'Servicios de terceros',
    thirdPartyIntro: 'Usamos servicios de terceros de confianza para operar el producto:',
    thirdPartyItem1:
      'Supabase — almacena el estado anónimo del juego y permite sincronización en tiempo real',
    thirdPartyItem2:
      'OpenRouter / modelos de IA — procesamiento temporal para generar preguntas y evaluar respuestas (entradas anonimizadas cuando es posible)',
    thirdPartyItem3:
      'RevenueCat — gestiona suscripciones para creadores (solo si compras)',
    thirdPartyItem4:
      'Google — inicio de sesión para anfitriones que eligen autenticarse con Google',
    thirdPartyItem5:
      'Stripe — procesa los pagos de suscripción de los anfitriones web (solo si te suscribes en whosmarter.com); nunca vemos ni almacenamos los datos de tu tarjeta',
    thirdPartyNote:
      'No vendemos tus datos. Los datos se conservan solo el tiempo necesario para la sesión de juego y el funcionamiento del servicio.',

    rightsTitle: 'Tus derechos',
    rights:
      'Puedes revocar los permisos de cámara y micrófono en cualquier momento en la configuración del navegador o del dispositivo. Para solicitudes de eliminación de datos o consultas, contáctanos con los datos siguientes.',

    supportTitle: 'Soporte y contacto',
    supportIntro: '¿Necesitas ayuda con WhoSmarter?',
    supportEmailLabel: 'Correo de soporte',
    supportEmail: 'support@whosmarter.com',
    supportReply: 'Solemos responder en 24–48 horas.',
    supportWebsiteLabel: 'Sitio web',
    supportWebsiteHint: 'Juega la versión web y consulta las novedades.',
    supportFooter:
      'Esta página es nuestra política de privacidad y contacto de soporte para WhoSmarter en la web.',
  },

  fr: {
    pageTitle: 'Politique de confidentialité et assistance',
    lastUpdated: 'Dernière mise à jour : 24 juin 2026',
    tagline: 'Quiz multijoueur en temps réel avec des questions générées par IA',

    introTitle: 'Politique de confidentialité',
    intro:
      'WhoSmarter (« nous », « notre ») respecte votre vie privée. Cette politique explique comment nous collectons, utilisons et protégeons vos informations lorsque vous utilisez WhoSmarter sur le web ou dans nos applications mobiles.',

    collectTitle: 'Informations que nous collectons',
    collectIntro: 'Selon votre utilisation du service, nous pouvons collecter :',
    collectItem1:
      'Des données de jeu anonymes (sujets choisis, réponses, scores, transcriptions pendant les manches)',
    collectItem2:
      'Des informations sur l’appareil et des analyses d’utilisation (non identifiables)',
    collectItem3:
      'Des entrées caméra et micro — uniquement si vous activez le mode vidéo ou vocal (traitées en temps réel, sans enregistrement stocké)',
    collectItem4:
      'Des transcriptions voix-texte (temporaires, utilisées uniquement pour juger les réponses)',
    collectItem5:
      'Si vous créez un quiz en tant qu’hôte et vous connectez avec Google, nous recevons votre adresse e-mail et des informations de profil de base de Google uniquement pour l’authentification',
    collectNote:
      'Les invités peuvent rejoindre sans créer de compte. Le compte hôte sert uniquement à créer des quiz et accéder aux fonctionnalités IA.',

    useTitle: 'Comment nous utilisons vos informations',
    useItem1: 'Faire fonctionner des parties synchronisées en temps réel entre appareils',
    useItem2: 'Attribuer les scores (correspondance locale + jugement IA optionnel)',
    useItem3: 'Activer la vidéo et l’audio peer-to-peer optionnels (WebRTC)',
    useItem4: 'Générer des questions IA et aider à juger les réponses vocales',
    useItem5: 'Authentifier les hôtes qui se connectent avec Google',

    permissionsTitle: 'Autorisations demandées',
    permissions:
      'L’accès à la caméra et au micro est optionnel. Sur le web, vous pouvez l’accorder ou le révoquer dans les paramètres du navigateur ou de l’appareil. La reconnaissance vocale n’est active que pendant les manches à réponse vocale.',

    thirdPartyTitle: 'Services tiers',
    thirdPartyIntro:
      'Nous utilisons des services tiers de confiance pour faire fonctionner le produit :',
    thirdPartyItem1:
      'Supabase — stocke l’état anonyme du jeu et permet la synchronisation en temps réel',
    thirdPartyItem2:
      'OpenRouter / modèles IA — traitement temporaire pour la génération de questions et le jugement des réponses (entrées anonymisées lorsque possible)',
    thirdPartyItem3:
      'RevenueCat — gère les abonnements pour les créateurs (uniquement en cas d’achat)',
    thirdPartyItem4:
      'Google — connexion pour les hôtes qui choisissent l’authentification Google',
    thirdPartyItem5:
      'Stripe — traite les paiements d’abonnement des hôtes web (uniquement si vous vous abonnez sur whosmarter.com) ; nous ne voyons ni ne stockons jamais vos données de carte',
    thirdPartyNote:
      'Nous ne vendons pas vos données. Les données ne sont conservées que le temps nécessaire à la session de jeu et au fonctionnement du service.',

    rightsTitle: 'Vos droits',
    rights:
      'Vous pouvez révoquer les autorisations caméra et micro à tout moment dans les paramètres du navigateur ou de l’appareil. Pour toute demande de suppression de données ou question, contactez-nous via les coordonnées ci-dessous.',

    supportTitle: 'Assistance et contact',
    supportIntro: 'Besoin d’aide avec WhoSmarter ?',
    supportEmailLabel: 'E-mail d’assistance',
    supportEmail: 'support@whosmarter.com',
    supportReply: 'Nous répondons généralement sous 24 à 48 heures.',
    supportWebsiteLabel: 'Site web',
    supportWebsiteHint: 'Jouez sur le web et consultez les dernières mises à jour.',
    supportFooter:
      'Cette page sert de politique de confidentialité et de contact d’assistance pour WhoSmarter sur le web.',
  },

  de: {
    pageTitle: 'Datenschutz & Support',
    lastUpdated: 'Zuletzt aktualisiert: 24. Juni 2026',
    tagline: 'Echtzeit-Multiplayer-Quiz mit KI-Fragen',

    introTitle: 'Datenschutzerklärung',
    intro:
      'WhoSmarter („wir“, „uns“ oder „unser“) respektiert Ihre Privatsphäre. Diese Richtlinie erklärt, wie wir Ihre Informationen erfassen, nutzen und schützen, wenn Sie WhoSmarter im Web oder in unseren mobilen Apps verwenden.',

    collectTitle: 'Welche Informationen wir erfassen',
    collectIntro: 'Je nach Nutzung des Dienstes können wir Folgendes erfassen:',
    collectItem1:
      'Anonyme Spieldaten (gewählte Themen, Antworten, Punkte, Transkripte während der Runden)',
    collectItem2: 'Geräteinformationen und Nutzungsanalysen (nicht identifizierbar)',
    collectItem3:
      'Kamera- und Mikrofoneingaben — nur wenn Sie Video- oder Sprachmodus aktivieren (Echtzeitverarbeitung, keine gespeicherten Aufnahmen)',
    collectItem4:
      'Sprache-zu-Text-Transkripte (temporär, nur zur Antwortbewertung)',
    collectItem5:
      'Wenn Sie als Gastgeber ein Quiz erstellen und sich mit Google anmelden, erhalten wir Ihre E-Mail-Adresse und grundlegende Profilinformationen von Google nur zur Authentifizierung',
    collectNote:
      'Gäste können ohne Konto beitreten. Das Gastgeberkonto dient nur zum Erstellen von Quiz und zum Zugriff auf KI-Funktionen.',

    useTitle: 'Wie wir Ihre Informationen nutzen',
    useItem1: 'Echtzeit-synchronisierte Spiele über Geräte hinweg betreiben',
    useItem2: 'Antworten bewerten (lokaler Abgleich + optionale KI-Bewertung)',
    useItem3: 'Optionales Peer-to-Peer-Video und -Audio aktivieren (WebRTC)',
    useItem4: 'KI-Fragen generieren und Sprachantworten bewerten',
    useItem5: 'Gastgeber authentifizieren, die sich mit Google anmelden',

    permissionsTitle: 'Angeforderte Berechtigungen',
    permissions:
      'Kamera- und Mikrofonzugriff sind optional. Im Web können Sie Berechtigungen in Browser- oder Geräteeinstellungen erteilen oder widerrufen. Spracherkennung ist nur während Sprachantwort-Runden aktiv.',

    thirdPartyTitle: 'Drittanbieter-Dienste',
    thirdPartyIntro:
      'Wir nutzen vertrauenswürdige Drittanbieter-Dienste zum Betrieb des Produkts:',
    thirdPartyItem1:
      'Supabase — speichert anonymen Spielstatus und ermöglicht Echtzeit-Sync',
    thirdPartyItem2:
      'OpenRouter / KI-Modelle — temporäre Verarbeitung für Fragenerstellung und Antwortbewertung (Eingaben werden nach Möglichkeit anonymisiert)',
    thirdPartyItem3:
      'RevenueCat — verwaltet Abonnements für Ersteller (nur bei Kauf)',
    thirdPartyItem4:
      'Google — Anmeldung für Gastgeber, die sich mit Google authentifizieren',
    thirdPartyItem5:
      'Stripe — verarbeitet Abonnementzahlungen für Web-Gastgeber (nur bei einem Abo auf whosmarter.com); wir sehen oder speichern deine Kartendaten nie',
    thirdPartyNote:
      'Wir verkaufen Ihre Daten nicht. Daten werden nur so lange aufbewahrt, wie es für die Spielsitzung und den Betrieb des Dienstes erforderlich ist.',

    rightsTitle: 'Ihre Rechte',
    rights:
      'Sie können Kamera- und Mikrofonberechtigungen jederzeit in Browser- oder Geräteeinstellungen widerrufen. Für Löschanfragen oder Fragen kontaktieren Sie uns über die unten stehenden Angaben.',

    supportTitle: 'Support & Kontakt',
    supportIntro: 'Brauchen Sie Hilfe mit WhoSmarter?',
    supportEmailLabel: 'Support-E-Mail',
    supportEmail: 'support@whosmarter.com',
    supportReply: 'Wir antworten in der Regel innerhalb von 24–48 Stunden.',
    supportWebsiteLabel: 'Website',
    supportWebsiteHint: 'Spielen Sie die Webversion und sehen Sie die neuesten Updates.',
    supportFooter:
      'Diese Seite dient als Datenschutzerklärung und Support-Kontakt für WhoSmarter im Web.',
  },

  ja: {
    pageTitle: 'プライバシーポリシーとサポート',
    lastUpdated: '最終更新：2026年6月24日',
    tagline: 'AI問題のリアルタイムマルチプレイヤークイズ',

    introTitle: 'プライバシーポリシー',
    intro:
      'WhoSmarter（「当社」）は、お客様のプライバシーを尊重します。本ポリシーは、Web版またはモバイルアプリで WhoSmarter をご利用いただく際に、当社がどのように情報を収集・利用・保護するかを説明します。',

    collectTitle: '収集する情報',
    collectIntro: 'サービスの利用方法に応じて、以下を収集する場合があります：',
    collectItem1:
      '匿名のゲームデータ（選択したトピック、回答、スコア、ラウンド中の文字起こし）',
    collectItem2: 'デバイス情報および利用状況の分析（個人を特定しない）',
    collectItem3:
      'カメラとマイクの入力 — ビデオまたは音声モードを有効にした場合のみ（リアルタイム処理、録画は保存しません）',
    collectItem4: '音声テキスト変換の文字起こし（一時的、回答判定のみに使用）',
    collectItem5:
      'ホストとしてクイズを作成し Google でサインインする場合、認証目的のみ Google からメールアドレスと基本的なプロフィール情報を受け取ります',
    collectNote:
      'ゲストはアカウント作成なしで参加できます。ホストアカウントは、クイズ作成と AI 機能へのアクセスのみに使用されます。',

    useTitle: '情報の利用目的',
    useItem1: 'デバイス間でリアルタイムに同期されたゲームを実行するため',
    useItem2: '回答を採点するため（ローカル照合 + 任意の AI 判定）',
    useItem3: '任意のピアツーピア映像・音声（WebRTC）を有効にするため',
    useItem4: 'AI 問題を生成し、音声回答の判定を支援するため',
    useItem5: 'Google でサインインするホストを認証するため',

    permissionsTitle: '要求する権限',
    permissions:
      'カメラとマイクへのアクセスは任意です。Web では、ブラウザまたはデバイスの設定で許可・取り消しができます。音声認識は、音声回答ラウンド中のみ有効です。',

    thirdPartyTitle: '第三者サービス',
    thirdPartyIntro: '当社は製品運営のために信頼できる第三者サービスを利用します：',
    thirdPartyItem1: 'Supabase — 匿名のゲーム状態を保存し、リアルタイム同期を提供',
    thirdPartyItem2:
      'OpenRouter / AI モデル — 問題生成と回答判定の一時処理（可能な限り入力を匿名化）',
    thirdPartyItem3:
      'RevenueCat — クリエイター向けサブスクリプションの処理（購入時のみ）',
    thirdPartyItem4: 'Google — Google 認証を選択するホストのサインイン',
    thirdPartyItem5:
      'Stripe — ウェブホストのサブスクリプション決済を処理（whosmarter.comで登録した場合のみ）。カード情報を当社が見たり保存したりすることはありません',
    thirdPartyNote:
      '当社はお客様のデータを販売しません。データはゲームセッションおよびサービス運営に必要な期間のみ保持します。',

    rightsTitle: 'お客様の権利',
    rights:
      'カメラとマイクの権限は、ブラウザまたはデバイスの設定でいつでも取り消せます。データ削除の依頼やお問い合わせは、下記の連絡先までご連絡ください。',

    supportTitle: 'サポートとお問い合わせ',
    supportIntro: 'WhoSmarter についてお困りですか？',
    supportEmailLabel: 'サポートメール',
    supportEmail: 'support@whosmarter.com',
    supportReply: '通常 24〜48 時間以内に返信します。',
    supportWebsiteLabel: 'ウェブサイト',
    supportWebsiteHint: 'Web 版でプレイし、最新情報をご確認ください。',
    supportFooter:
      '本ページは、Web 版 WhoSmarter のプライバシーポリシーおよびサポート連絡先です。',
  },

  ar: {
    pageTitle: 'سياسة الخصوصية والدعم',
    lastUpdated: 'آخر تحديث: 24 يونيو 2026',
    tagline: 'مسابقة جماعية في الوقت الفعلي مع أسئلة بالذكاء الاصطناعي',

    introTitle: 'سياسة الخصوصية',
    intro:
      'تحترم WhoSmarter («نحن») خصوصيتك. توضّح هذه السياسة كيف نجمع معلوماتك ونستخدمها ونحميها عند استخدامك WhoSmarter على الويب أو في تطبيقاتنا المحمولة.',

    collectTitle: 'المعلومات التي نجمعها',
    collectIntro: 'بحسب طريقة استخدامك للخدمة، قد نجمع:',
    collectItem1:
      'بيانات لعب مجهولة (المواضيع المختارة، الإجابات، النقاط، النصوص أثناء الجولات)',
    collectItem2: 'معلومات الجهاز وتحليلات الاستخدام (غير قابلة للتعريف)',
    collectItem3:
      'مدخلات الكاميرا والميكروفون — فقط عند تفعيل وضع الفيديو أو الصوت (تُعالَج في الوقت الفعلي دون حفظ تسجيلات)',
    collectItem4:
      'نصوص تحويل الكلام إلى نص (مؤقتة، تُستخدم فقط للتحقق من الإجابات)',
    collectItem5:
      'إذا أنشأت مسابقة كمضيف وسجّلت الدخول عبر Google، نتلقى بريدك الإلكتروني ومعلومات الملف الأساسية من Google لأغراض المصادقة فقط',
    collectNote:
      'يمكن للضيوف الانضمام دون إنشاء حساب. يُستخدم حساب المضيف فقط لإنشاء المسابقات والوصول إلى ميزات الذكاء الاصطناعي.',

    useTitle: 'كيف نستخدم معلوماتك',
    useItem1: 'تشغيل ألعاب متزامنة في الوقت الفعلي عبر الأجهزة',
    useItem2: 'تسجيل النقاط (مطابقة محلية + تحكيم اختياري بالذكاء الاصطناعي)',
    useItem3: 'تمكين الفيديو والصوت بين الأقران (WebRTC) اختياريًا',
    useItem4: 'إنشاء أسئلة بالذكاء الاصطناعي والمساعدة في تحكيم الإجابات الصوتية',
    useItem5: 'مصادقة المضيفين الذين يسجلون الدخول عبر Google',

    permissionsTitle: 'الأذونات المطلوبة',
    permissions:
      'الوصول إلى الكاميرا والميكروفون اختياري. على الويب، يمكنك منح الأذونات أو سحبها من إعدادات المتصفح أو الجهاز. التعرف على الكلام نشط فقط أثناء جولات الإجابة الصوتية.',

    thirdPartyTitle: 'خدمات الطرف الثالث',
    thirdPartyIntro: 'نستخدم خدمات طرف ثالث موثوقة لتشغيل المنتج:',
    thirdPartyItem1:
      'Supabase — يخزّن حالة اللعب المجهولة ويمكّن المزامنة في الوقت الفعلي',
    thirdPartyItem2:
      'OpenRouter / نماذج الذكاء الاصطناعي — معالجة مؤقتة لإنشاء الأسئلة وتحكيم الإجابات (إخفاء الهوية حيثما أمكن)',
    thirdPartyItem3: 'RevenueCat — يدير الاشتراكات للمنشئين (فقط عند الشراء)',
    thirdPartyItem4:
      'Google — تسجيل الدخول للمضيفين الذين يختارون المصادقة عبر Google',
    thirdPartyItem5:
      'Stripe — يعالج دفعات الاشتراك للمضيفين على الويب (فقط إذا اشتركت على whosmarter.com)؛ لا نرى أو نخزن بيانات بطاقتك أبدًا',
    thirdPartyNote:
      'لا نبيع بياناتك. تُحفظ البيانات فقط طالما كان ذلك ضروريًا لجلسة اللعب وتشغيل الخدمة.',

    rightsTitle: 'حقوقك',
    rights:
      'يمكنك سحب أذونات الكاميرا والميكروفون في أي وقت من إعدادات المتصفح أو الجهاز. لطلبات حذف البيانات أو الاستفسارات، تواصل معنا عبر التفاصيل أدناه.',

    supportTitle: 'الدعم والتواصل',
    supportIntro: 'هل تحتاج مساعدة مع WhoSmarter؟',
    supportEmailLabel: 'بريد الدعم',
    supportEmail: 'support@whosmarter.com',
    supportReply: 'نرد عادةً خلال 24–48 ساعة.',
    supportWebsiteLabel: 'الموقع',
    supportWebsiteHint: 'العب النسخة على الويب واطّلع على آخر التحديثات.',
    supportFooter:
      'تُعد هذه الصفحة سياسة الخصوصية ووسيلة التواصل للدعم لـ WhoSmarter على الويب.',
  },
} as const;

export type PrivacyLocale = keyof typeof privacy;
export type PrivacyStrings = (typeof privacy)[PrivacyLocale];
