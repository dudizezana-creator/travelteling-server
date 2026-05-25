// ============================================================================
// Travelteling — Reflective Questions Database
// ----------------------------------------------------------------------------
// First-person, intimate questions for processing a shared journey.
// Each question is tagged with:
//   - stage:    GROUNDING / DEEP / INTEGRATION / RETROSPECTIVE
//   - category: HOME, MOMENTS, PEOPLE, INNER, CHAOS, PRESENCE, DREAMS,
//               CONNECTION, RETRO
// Titles in HE (primary) + EN. Other langs fall back to EN.
// ============================================================================

const STAGES = {
  GROUNDING:     'GROUNDING',      // soft landing — sensory, here & now
  DEEP:          'DEEP',           // exposed depth — emotional processing
  INTEGRATION:   'INTEGRATION',    // takeaway — translate to real life
  RETROSPECTIVE: 'RETROSPECTIVE',  // closing reflection
};

const CATEGORIES = {
  HOME:       'HOME',         // 🏠 חזרה הביתה
  MOMENTS:    'MOMENTS',      // 💎 רגעים בלתי נשכחים
  PEOPLE:     'PEOPLE',       // 👥 אנשים שפגשנו בדרך
  INNER:      'INNER',        // 🌱 שינוי וריפוי פנימי
  CHAOS:      'CHAOS',        // 🌪 התמודדות ושחרור שליטה
  PRESENCE:   'PRESENCE',     // 🧘 נוכחות וחיבור פנימי
  DREAMS:     'DREAMS',       // ✨ חלומות ומבט קדימה
  CONNECTION: 'CONNECTION',   // 🤲 השתקפויות בקשר
  RETRO:      'RETRO',        // 🧭 רטרוספקטיבה וסיכום
};

const CATEGORY_META = {
  HOME:       { emoji: '🏠', he: 'חזרה הביתה',         en: 'Coming Home' },
  MOMENTS:    { emoji: '💎', he: 'רגעים בלתי נשכחים',   en: 'Unforgettable Moments' },
  PEOPLE:     { emoji: '👥', he: 'אנשים שפגשנו בדרך',   en: 'People We Met' },
  INNER:      { emoji: '🌱', he: 'שינוי וריפוי פנימי',  en: 'Inner Change & Healing' },
  CHAOS:      { emoji: '🌪', he: 'התמודדות ושחרור',     en: 'Letting Go of Control' },
  PRESENCE:   { emoji: '🧘', he: 'נוכחות וחיבור פנימי', en: 'Presence & Inner Connection' },
  DREAMS:     { emoji: '✨', he: 'חלומות ומבט קדימה',   en: 'Dreams & What\'s Next' },
  CONNECTION: { emoji: '🤲', he: 'השתקפויות בקשר',     en: 'Reflections on Our Bond' },
  RETRO:      { emoji: '🧭', he: 'רטרוספקטיבה',         en: 'Looking Back' },
};

// Helper to build a question quickly
const q = (id, stage, category, he, en) => ({
  id, stage, category,
  title: {
    he, en,
    // Other languages fall back to EN until translated by native speakers
    es: en, fr: en, de: en, pt: en, ar: en, ja: en, ko: en,
  },
});

// ============================================================================
// THE QUESTION BANK
// ============================================================================

const REFLECTIVE_QUESTIONS = [

  // ── 🌱 GROUNDING — light landing, sensory, here-now ────────────────────────
  q('g01', STAGES.GROUNDING, CATEGORIES.MOMENTS,
    'מה היה הרגע הכי משמח וטהור שחוויתי במסע הזה?',
    'What was the purest moment of joy I felt on this journey?'),

  q('g02', STAGES.GROUNDING, CATEGORIES.MOMENTS,
    'מתי הרגשתי הכי חי ונוכח במסע הזה?',
    'When did I feel most alive and present on this journey?'),

  q('g03', STAGES.GROUNDING, CATEGORIES.MOMENTS,
    'איזה רגע ספציפי אני פשוט לא מוכן לשכוח לעולם?',
    'What specific moment am I simply not willing to ever forget?'),

  q('g04', STAGES.GROUNDING, CATEGORIES.PEOPLE,
    'איזה אדם שפגשתי בדרך לא אשכח לעולם, ולמה?',
    'Which person I met along the way will I never forget — and why?'),

  q('g05', STAGES.GROUNDING, CATEGORIES.PEOPLE,
    'איזה משפט שמישהו אמר לי במסע הזה נחרט לי עמוק בזיכרון?',
    'What sentence someone said to me on this journey has stayed etched in my memory?'),

  q('g06', STAGES.GROUNDING, CATEGORIES.PRESENCE,
    'מתי במהלך המסע הרגשתי שהגוף והתודעה שלי סוף סוף מסונכרנים ונושמים באותו קצב?',
    'When on this journey did I feel my body and mind finally syncing, breathing the same rhythm?'),

  q('g07', STAGES.GROUNDING, CATEGORIES.PRESENCE,
    'איזו תחושה פיזית של חופש או שחרור חוויתי כאן, שאני מתחייב להמשיך לתרגל גם בבית?',
    'What physical sensation of freedom or release did I experience here that I commit to keep practicing at home?'),


  // ── 🌊 DEEP — exposed depth, emotional processing ──────────────────────────
  q('d01', STAGES.DEEP, CATEGORIES.MOMENTS,
    'מה היה הרגע הכי קשה שלי במסע, ומה הוא לימד אותי על עצמי?',
    'What was my hardest moment on the journey — and what did it teach me about myself?'),

  q('d02', STAGES.DEEP, CATEGORIES.INNER,
    'איזה חשש סחבתי איתי לפני הטיול, ומה גיליתי עליו עכשיו?',
    'What fear was I carrying before the trip — and what have I discovered about it now?'),

  q('d03', STAGES.DEEP, CATEGORIES.INNER,
    'מה גיליתי על עצמי שלא ידעתי קודם?',
    'What did I discover about myself that I didn\'t know before?'),

  q('d04', STAGES.DEEP, CATEGORIES.INNER,
    'אם המסע הזה פתח בי איזה פצע או כאב ישן, איך אני בוחר לטפל בו עכשיו במקום לברוח ממנו?',
    'If this journey opened an old wound in me, how am I choosing to tend to it now instead of running from it?'),

  q('d05', STAGES.DEEP, CATEGORIES.INNER,
    'באיזה חלק בחיים (או בעצמי) התאהבתי פה מחדש?',
    'What part of my life (or myself) did I fall in love with again here?'),

  q('d06', STAGES.DEEP, CATEGORIES.INNER,
    'איזו אמת פשוטה על החיים התבהרה לי פתאום, ואני רוצה לחקור אותה הלאה?',
    'What simple truth about life suddenly became clear to me, that I want to keep exploring?'),

  q('d07', STAGES.DEEP, CATEGORIES.CHAOS,
    'מתי במהלך המסע איבדתי שליטה על הסיטואציה, ואיך מצאתי בתוך הכאוס הזה את העוגן הפנימי שלי?',
    'When during the journey did I lose control of the situation — and how did I find my inner anchor inside that chaos?'),

  q('d08', STAGES.DEEP, CATEGORIES.CHAOS,
    'איזה שריון או מגננה שעטיתי על עצמי נסדק או נשר לגמרי בדרכים?',
    'What armor or defense I had been wearing cracked, or fell away entirely, somewhere along the way?'),

  q('d09', STAGES.DEEP, CATEGORIES.CHAOS,
    'מה הדבר שהכי ניסיתי להסתיר מעצמי (או מהשותפים שלי) בתחילת הטיול, ועכשיו אני מרגיש בטוח לתת לו מקום?',
    'What did I try hardest to hide from myself (or from the people with me) at the start — and now feel safe enough to give it space?'),

  q('d10', STAGES.DEEP, CATEGORIES.CHAOS,
    'איפה הרגשתי שאני מתאמץ מדי, ומתי סוף סוף הסכמתי פשוט להרפות ולתת לדברים לקרות?',
    'Where did I feel myself trying too hard — and when did I finally agree to let go and let things happen?'),

  q('d11', STAGES.DEEP, CATEGORIES.HOME,
    'איזה חלק בעצמי הישן אני מחבק, ועם זאת ממש לא רוצה לפגוש שוב כשאחזור?',
    'Which part of my old self am I embracing — and yet really don\'t want to meet again when I get back?'),

  q('d12', STAGES.DEEP, CATEGORIES.HOME,
    'איזה דפוס ישן הגן עליי פעם בשגרה, אבל במסע הזה הבנתי שאני פשוט כבר לא זקוק לו?',
    'What old pattern once protected me in my daily life, that on this journey I realized I simply no longer need?'),

  q('d13', STAGES.DEEP, CATEGORIES.HOME,
    'על איזה פחד שסחבתי איתי מהבית אני יכול עכשיו להסתכל, להגיד לו תודה, ולהשאיר אותו כאן?',
    'What fear I brought from home can I now look at, thank, and leave behind?'),

  q('d14', STAGES.DEEP, CATEGORIES.PRESENCE,
    'איזה קול פנימי שלי, שבדרך כלל מושתק בתוך הרעש של השגרה, הצלחתי סוף סוף לשמוע בבירור?',
    'What inner voice of mine, usually drowned out by daily noise, did I finally manage to hear clearly?'),

  q('d15', STAGES.DEEP, CATEGORIES.PEOPLE,
    'ממי שפגשתי כאן למדתי משהו חדש על עצמי?',
    'From whom I met here did I learn something new about myself?'),

  q('d16', STAGES.DEEP, CATEGORIES.PEOPLE,
    'איזה אדם שפגשתי הזכיר לי בדיוק מי אני רוצה להיות?',
    'Which person I met reminded me exactly who I want to be?'),

  q('d17', STAGES.DEEP, CATEGORIES.MOMENTS,
    'באיזה רגע הסתכלתי על מי שאיתי וראיתי אותו פתאום באור חדש?',
    'In what moment did I look at the person beside me and suddenly see them in a new light?'),

  q('d18', STAGES.DEEP, CATEGORIES.CONNECTION,
    'באיזה רגע מדויק הרגשתי הכי קרוב למי שאיתי במסע הזה?',
    'In what precise moment did I feel closest to the person with me on this journey?'),

  q('d19', STAGES.DEEP, CATEGORIES.CONNECTION,
    'מתי נתתי לעצמי להיות מובל ופשוט לסמוך על מי שלצידי, ואיך זה הרגיש לי בבטן?',
    'When did I let myself be led and simply trust the person beside me — and how did that feel in my gut?'),

  q('d20', STAGES.DEEP, CATEGORIES.CONNECTION,
    'באיזה רגע הרגשתי שהנוכחות של מי שאיתי הייתה בדיוק התרופה שהייתי צריך?',
    'In what moment did I feel the presence of the person with me was exactly the medicine I needed?'),

  q('d21', STAGES.DEEP, CATEGORIES.CONNECTION,
    'איזה קושי שלי פגש קושי של השותף שלי למסע, ואיך צמחנו משם במקום להתרסק?',
    'What difficulty of mine met a difficulty of my journey-partner — and how did we grow from there instead of falling apart?'),

  q('d22', STAGES.DEEP, CATEGORIES.CONNECTION,
    'על איזה רגע של קצר בתקשורת בינינו אני מוכן עכשיו להסתכל בחמלה, ולסלוח לעצמי ולו?',
    'What moment of miscommunication between us am I now ready to look at with compassion, and forgive myself and them?'),

  q('d23', STAGES.DEEP, CATEGORIES.CONNECTION,
    'מה למדתי על השותפים שלי למסע שלא ידעתי קודם?',
    'What did I learn about the people I journeyed with that I didn\'t know before?'),


  // ── 🌅 INTEGRATION — translating to real life ──────────────────────────────
  q('i01', STAGES.INTEGRATION, CATEGORIES.HOME,
    'מה הדבר שהכי מפחיד אותי לקראת החזרה הביתה ולשגרה?',
    'What scares me most about coming back home, back to the routine?'),

  q('i02', STAGES.INTEGRATION, CATEGORIES.HOME,
    'איזה הרגל מהמסע הזה אני מתחייב לאמץ לתוך החיים שלי?',
    'What habit from this journey am I committing to bring into my life?'),

  q('i03', STAGES.INTEGRATION, CATEGORIES.HOME,
    'מה הסיפור שאספר לעצמי בעוד שנה על המסע הזה?',
    'What story will I tell myself a year from now about this journey?'),

  q('i04', STAGES.INTEGRATION, CATEGORIES.HOME,
    'אם הייתי יכול לקחת רק דבר אחד מהמסע הזה במזוודה שלי — מה הוא היה?',
    'If I could take only one thing from this journey in my suitcase — what would it be?'),

  q('i05', STAGES.INTEGRATION, CATEGORIES.DREAMS,
    'איך המסע הזה השפיע על החלומות שלי קדימה?',
    'How has this journey shaped my dreams going forward?'),

  q('i06', STAGES.INTEGRATION, CATEGORIES.DREAMS,
    'אם זמן וכסף לא היו מגבלה — איפה הייתי מוצא את עצמי עכשיו?',
    'If time and money were no obstacle — where would I find myself right now?'),

  q('i07', STAGES.INTEGRATION, CATEGORIES.DREAMS,
    'מה אני חולם לעשות עכשיו, שלא העזתי אפילו לחלום עליו לפני שיצאנו?',
    'What do I dream of doing now that I didn\'t even dare to dream of before we left?'),

  q('i08', STAGES.INTEGRATION, CATEGORIES.DREAMS,
    'איזה מסע חדש (פנימי או חיצוני) כבר מתחיל לקרוא לי?',
    'What new journey (inner or outer) is already starting to call me?'),

  q('i09', STAGES.INTEGRATION, CATEGORIES.PRESENCE,
    'מה המרחב השקט שמצאתי פה, שאני חייב לפנות לו זמן גם כשהלו"ז בבית יתחיל ללחוץ?',
    'What quiet space did I find here that I must make time for, even when the schedule at home starts to press?'),

  q('i10', STAGES.INTEGRATION, CATEGORIES.CONNECTION,
    'מה אני הכי מעריך במי שאיתי עכשיו, אחרי כל מה שעברנו יחד?',
    'What do I most appreciate about the person beside me now, after everything we\'ve been through together?'),

  q('i11', STAGES.INTEGRATION, CATEGORIES.CONNECTION,
    'מה אני רוצה שנשמור בקשר שלנו מהמסע הזה גם בתוך השגרה בבית?',
    'What do I want us to keep in our connection from this journey, even inside daily life at home?'),

  q('i12', STAGES.INTEGRATION, CATEGORIES.CONNECTION,
    'איך הדינמיקה והקשר שלנו השתנו וצמחו יחד בדרכים?',
    'How has our dynamic and our bond shifted and grown together on the road?'),


  // ── 🧭 RETROSPECTIVE — final reflection ────────────────────────────────────
  q('r01', STAGES.RETROSPECTIVE, CATEGORIES.RETRO,
    'אם המסע הזה היה ספר — איזה שם הייתי נותן לו?',
    'If this journey were a book — what title would I give it?'),

  q('r02', STAGES.RETROSPECTIVE, CATEGORIES.RETRO,
    'מה הייתה ההפתעה הכי גדולה שגיליתי במסע הזה?',
    'What was the biggest surprise I discovered on this journey?'),

  q('r03', STAGES.RETROSPECTIVE, CATEGORIES.RETRO,
    'אם הייתי יכול לפגוש עכשיו את עצמי שלפני הטיול — מה הייתי לוחש לו באוזן?',
    'If I could meet my pre-trip self right now — what would I whisper in their ear?'),
];

// ============================================================================
// SELECTION ALGORITHM
// ----------------------------------------------------------------------------
// Given a desired session length (5/8/12) and selected categories,
// build an emotional arc: GROUNDING → DEEP → INTEGRATION → RETROSPECTIVE.
// ============================================================================

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Default stage distribution per session length
function getStageBudget(totalQuestions) {
  if (totalQuestions <= 5) return { GROUNDING: 1, DEEP: 2, INTEGRATION: 1, RETROSPECTIVE: 1 };
  if (totalQuestions <= 8) return { GROUNDING: 2, DEEP: 3, INTEGRATION: 2, RETROSPECTIVE: 1 };
  if (totalQuestions <= 12) return { GROUNDING: 2, DEEP: 5, INTEGRATION: 3, RETROSPECTIVE: 2 };
  return { GROUNDING: 3, DEEP: 7, INTEGRATION: 4, RETROSPECTIVE: 2 };
}

/**
 * Pick questions for a session — distributed across 4 stages.
 * @param {string[]} selectedCategories - subset of CATEGORIES keys, or empty/null for all
 * @param {number} totalQuestions - desired count (5/8/12)
 * @returns {Array} ordered questions: grounding first, then deep, then integration, then retro
 */
function pickQuestionsForSession(selectedCategories, totalQuestions = 8) {
  const budget = getStageBudget(totalQuestions);
  const cats = (selectedCategories && selectedCategories.length > 0)
    ? selectedCategories
    : Object.keys(CATEGORIES);

  // RETROSPECTIVE is always included regardless of category selection (closure questions)
  const allowedCats = new Set([...cats, CATEGORIES.RETRO]);

  const pool = REFLECTIVE_QUESTIONS.filter(
    (q) => allowedCats.has(q.category)
  );

  const byStage = {
    GROUNDING:     shuffle(pool.filter((q) => q.stage === STAGES.GROUNDING)),
    DEEP:          shuffle(pool.filter((q) => q.stage === STAGES.DEEP)),
    INTEGRATION:   shuffle(pool.filter((q) => q.stage === STAGES.INTEGRATION)),
    RETROSPECTIVE: shuffle(REFLECTIVE_QUESTIONS.filter((q) => q.stage === STAGES.RETROSPECTIVE)),
  };

  const selected = [];
  ['GROUNDING', 'DEEP', 'INTEGRATION', 'RETROSPECTIVE'].forEach((stage) => {
    const want = budget[stage];
    const fromStage = byStage[stage].slice(0, want);
    // If not enough in this stage, supplement from DEEP pool to keep total
    selected.push(...fromStage);
  });

  // If we ended up short (small category selection), top up from any remaining
  if (selected.length < totalQuestions) {
    const used = new Set(selected.map((q) => q.id));
    const remaining = shuffle(pool.filter((q) => !used.has(q.id)));
    selected.push(...remaining.slice(0, totalQuestions - selected.length));
  }

  return selected.slice(0, totalQuestions);
}

// Localise a question — pluck the title for the requested language
function localiseQuestion(question, lang) {
  const safeLang = ['he', 'en', 'es', 'fr', 'de', 'pt', 'ar', 'ja', 'ko'].includes(lang) ? lang : 'en';
  return {
    id: question.id,
    stage: question.stage,
    category: question.category,
    title: question.title[safeLang] || question.title.en,
  };
}

module.exports = {
  STAGES,
  CATEGORIES,
  CATEGORY_META,
  REFLECTIVE_QUESTIONS,
  pickQuestionsForSession,
  localiseQuestion,
};
