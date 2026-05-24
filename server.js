const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
const PORT = process.env.PORT || 3001;

const STATE = { LOBBY: 'LOBBY', VOTING: 'VOTING', RESULTS: 'RESULTS', SUMMARY: 'SUMMARY' };
const TRIP_TYPES = ['FAMILY', 'COUPLES', 'FRIENDS_TRIP', 'GOLDEN_AGE', 'YOUNG_ADULTS'];
const SUPPORTED_LANGS = ['en', 'he', 'es', 'fr', 'de', 'pt', 'ar', 'ja', 'ko'];

// ---------------------------------------------------------------------------
// Persistent stats
// ---------------------------------------------------------------------------
const STATS_FILE = path.join(__dirname, 'stats.json');
function loadStats() {
  const defaults = { gamesStarted: 0, gamesCompleted: 0, totalPlayers: 0, langBreakdown: {}, questionStats: {} };
  try { return { ...defaults, ...JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')) }; }
  catch { return defaults; }
}
function saveStats(s) {
  try { fs.writeFileSync(STATS_FILE, JSON.stringify(s, null, 2)); } catch (e) { console.error('[stats]', e.message); }
}
const globalStats = loadStats();

// ---------------------------------------------------------------------------
// Question bank — all questions × 9 languages
// ---------------------------------------------------------------------------
const ALL_QUESTIONS = [
  // ── FUN / PEOPLE ──────────────────────────────────────────────────────────
  {
    id: 'q01', suitableFor: ['FAMILY','COUPLES','FRIENDS_TRIP','GOLDEN_AGE'], type: 'PEOPLE', isDeep: false,
    title: {
      en: "Who's most likely to be up first tomorrow morning?",
      he: 'מי יהיה הראשון על הרגליים מחר בבוקר?',
      es: '¿Quién va a despertarse primero mañana?',
      fr: 'Qui va se lever le premier demain matin?',
      de: 'Wer steht morgen früh als Erstes auf?',
      pt: 'Quem acorda primeiro amanhã de manhã?',
      ar: 'مَن منكم سيصحى أولاً غداً الصبح؟',
      ja: '明日の朝、一番早く起きるのは誰だろう？',
      ko: '내일 아침에 제일 먼저 일어날 사람은 누구야?',
    },
  },
  {
    id: 'q02', suitableFor: ['FAMILY','FRIENDS_TRIP','GOLDEN_AGE'], type: 'PEOPLE', isDeep: false,
    title: {
      en: "Who complains the most about the food?",
      he: 'מי הכי מקטר על האוכל?',
      es: '¿Quién es el más quejón con la comida?',
      fr: 'Qui se plaint le plus de la bouffe?',
      de: 'Wer meckert am meisten über das Essen?',
      pt: 'Quem mais reclama da comida?',
      ar: 'مَن منكم الأكثر تذمراً من الأكل؟',
      ja: '食べ物に一番文句を言うのは誰？',
      ko: '음식에 대해 제일 많이 투덜대는 사람은 누구야?',
    },
  },
  {
    id: 'q03', suitableFor: ['FRIENDS_TRIP','COUPLES','FAMILY'], type: 'PEOPLE', isDeep: false,
    title: {
      en: "Who pulled off the biggest blunder on this trip?",
      he: 'מי עשה את השטות הגדולה ביותר בטיול?',
      es: '¿Quién metió la pata más grande en este viaje?',
      fr: 'Qui a fait la plus grosse gaffe du voyage?',
      de: 'Wer hat auf dieser Reise den dicksten Bock geschossen?',
      pt: 'Quem fez a maior cagada da viagem?',
      ar: 'مَن ارتكب أكبر فضيحة في الرحلة؟',
      ja: '旅でいちばん大きなやらかしをしたのは誰？',
      ko: '이 여행에서 가장 큰 실수를 저지른 사람은 누구야?',
    },
  },
  {
    id: 'q04', suitableFor: ['FAMILY','COUPLES','FRIENDS_TRIP','GOLDEN_AGE'], type: 'PEOPLE', isDeep: false,
    title: {
      en: "Who'd make the best tour guide out of all of you?",
      he: 'מי מביניכם היה מדריך טיולים מושלם?',
      es: '¿Quién de ustedes sería el mejor guía turístico?',
      fr: 'Qui ferait le meilleur guide touristique parmi vous?',
      de: 'Wer wäre von euch der beste Reiseführer?',
      pt: 'Quem da turma seria o melhor guia turístico?',
      ar: 'مَن منكم يصلح مرشداً سياحياً مثالياً؟',
      ja: 'みんなの中で、一番いいガイドになれそうなのは誰？',
      ko: '여러분 중에서 누가 최고의 여행 가이드가 될 것 같아?',
    },
  },
  {
    id: 'q05', suitableFor: ['FAMILY','COUPLES','FRIENDS_TRIP','GOLDEN_AGE'], type: 'PEOPLE', isDeep: false,
    title: {
      en: "Who's most paranoid about losing their passport?",
      he: 'מי הכי פרנואיד לגבי הדרכון שלו?',
      es: '¿Quién le tiene más miedo a perder el pasaporte?',
      fr: "Qui flippe le plus à l'idée de perdre son passeport?",
      de: 'Wer hat am meisten Angst seinen Pass zu verlieren?',
      pt: 'Quem fica mais apavorado com a ideia de perder o passaporte?',
      ar: 'مَن الأكثر هلعاً من فقدان جواز سفره؟',
      ja: 'パスポートをなくすことを一番気にしているのは誰？',
      ko: '여권 잃어버릴까봐 제일 불안해하는 사람은 누구야?',
    },
  },
  {
    id: 'q06', suitableFor: ['FAMILY','COUPLES','FRIENDS_TRIP','GOLDEN_AGE'], type: 'PEOPLE', isDeep: false,
    title: {
      en: "Who can fall asleep anywhere on a trip?",
      he: 'מי מצליח להירדם בכל מצב בנסיעה?',
      es: '¿Quién se queda dormido en cualquier parte del viaje?',
      fr: "Qui s'endort partout pendant les voyages?",
      de: 'Wer schläft überall ein, egal wo?',
      pt: 'Quem consegue dormir em qualquer lugar durante a viagem?',
      ar: 'مَن يقدر ينام في أي مكان أثناء السفر؟',
      ja: '旅中、どこでも寝れちゃうのは誰？',
      ko: '여행 중에 어디서든 잘 수 있는 사람은 누구야?',
    },
  },
  {
    id: 'q07', suitableFor: ['COUPLES','FRIENDS_TRIP','GOLDEN_AGE'], type: 'PEOPLE', isDeep: false,
    title: {
      en: "Who can't stop taking selfies?",
      he: 'מי לא מפסיק לצלם סלפים?',
      es: '¿Quién no para de hacerse selfies?',
      fr: "Qui ne peut pas s'arrêter de se prendre en selfie?",
      de: 'Wer kann es nicht lassen, ständig Selfies zu machen?',
      pt: 'Quem não para de tirar selfie?',
      ar: 'مَن لا يتوقف عن التقاط السيلفي؟',
      ja: 'セルフィーが止まらないのは誰？',
      ko: '셀카 찍는 걸 멈추지 못하는 사람은 누구야?',
    },
  },
  {
    id: 'q08', suitableFor: ['FRIENDS_TRIP','FAMILY','COUPLES'], type: 'PEOPLE', isDeep: false,
    title: {
      en: "Who's the most tight-fisted with money on the trip?",
      he: 'מי הכי קמצן עם הכסף בטיול?',
      es: '¿Quién es el más agarrado con el dinero en el viaje?',
      fr: 'Qui est le plus radin du voyage?',
      de: 'Wer ist auf der Reise am knauserigsten mit Geld?',
      pt: 'Quem é o mais pão-duro da viagem?',
      ar: 'مَن الأكثر بخلاً بالمصاريف في الرحلة؟',
      ja: '旅でいちばんケチなのは誰？',
      ko: '여행에서 돈을 제일 아끼는 사람은 누구야?',
    },
  },
  {
    id: 'q09', suitableFor: ['FAMILY','COUPLES','FRIENDS_TRIP','GOLDEN_AGE'], type: 'PEOPLE', isDeep: false,
    title: {
      en: "Who lifts the group's spirits when everyone's running on empty?",
      he: 'מי מרים את הקבוצה כשכולם שבורים?',
      es: '¿Quién sube la energía del grupo cuando todos están agotados?',
      fr: "Qui remonte le moral quand tout le monde est à plat?",
      de: 'Wer hebt die Stimmung, wenn alle am Ende sind?',
      pt: 'Quem anima a galera quando todo mundo tá destruído?',
      ar: 'مَن يرفع معنويات المجموعة لما الكل تعبان؟',
      ja: 'みんなが疲れ果てたとき、グループを元気づけるのは誰？',
      ko: '다들 지쳐있을 때 그룹 분위기를 살려주는 사람은 누구야?',
    },
  },
  {
    id: 'q10', suitableFor: ['FAMILY','COUPLES','FRIENDS_TRIP'], type: 'PEOPLE', isDeep: false,
    title: {
      en: "Who's obsessed with the itinerary — and who just goes with the flow?",
      he: 'מי האובססיבי על הלו"ז ומי הולך עם הזרם?',
      es: '¿Quién es el obsesionado con el itinerario y quién prefiere improvisar?',
      fr: "Qui est obsédé par le programme et qui préfère improviser?",
      de: 'Wer ist besessen vom Reiseplan — und wer geht einfach mit dem Flow?',
      pt: 'Quem é obcecado com o roteiro e quem prefere ir na onda?',
      ar: 'مَن المهووس بجدول الرحلة ومن يفضل الارتجال؟',
      ja: 'スケジュール管理が好きなのと、行き当たりばったりが好きなのは誰と誰？',
      ko: '일정에 집착하는 사람과 그냥 흘러가는 대로 사는 사람은 누구야?',
    },
  },
  // ── FUN / TEXT ────────────────────────────────────────────────────────────
  {
    id: 'q11', suitableFor: ['FAMILY','COUPLES','FRIENDS_TRIP','GOLDEN_AGE'], type: 'TEXT', isDeep: false,
    title: {
      en: 'Describe this trip in one word — go!',
      he: 'תאר/י את הטיול הזה במילה אחת — קדימה!',
      es: '¡Describe este viaje en una sola palabra, ya!',
      fr: 'Décris ce voyage en un seul mot — allez!',
      de: 'Beschreib diese Reise in einem Wort — los!',
      pt: 'Descreva essa viagem em uma palavra — vai!',
      ar: 'صِف هذه الرحلة بكلمة واحدة فقط!',
      ja: 'この旅を一言で表すなら？',
      ko: '이 여행을 한 단어로 표현한다면?',
    },
  },
  {
    id: 'q12', suitableFor: ['FAMILY','FRIENDS_TRIP','GOLDEN_AGE'], type: 'TEXT', isDeep: false,
    title: {
      en: "What's the weirdest thing you've seen on this trip?",
      he: 'מה הכי ביזאר שראיתם בטיול?',
      es: '¿Cuál es la cosa más rara que viste en este viaje?',
      fr: "La chose la plus bizarre que t'as vue dans ce voyage, c'est quoi?",
      de: 'Was ist das Seltsamste, das ihr auf dieser Reise gesehen habt?',
      pt: 'Qual foi a coisa mais esquisita que você viu nessa viagem?',
      ar: 'إيش أغرب شيء شفته في الرحلة؟',
      ja: 'この旅で見た、いちばんヘンなものって何？',
      ko: '이 여행에서 본 것 중 가장 이상한 게 뭐야?',
    },
  },
  {
    id: 'q13', suitableFor: ['FAMILY','COUPLES','FRIENDS_TRIP'], type: 'TEXT', isDeep: false,
    title: {
      en: 'If this trip were a movie, what genre would it be?',
      he: 'אם הטיול הזה היה סרט — מה הז׳אנר שלו?',
      es: 'Si este viaje fuera una película, ¿de qué género sería?',
      fr: 'Si ce voyage était un film, ce serait quel genre?',
      de: 'Wenn diese Reise ein Film wäre — welches Genre?',
      pt: 'Se essa viagem fosse um filme, qual seria o gênero?',
      ar: 'لو كانت الرحلة فيلم، شو نوعه؟',
      ja: 'この旅が映画だったら、ジャンルは何だと思う？',
      ko: '이 여행이 영화라면 장르가 뭐일 것 같아?',
    },
  },
  {
    id: 'q14', suitableFor: ['FAMILY','COUPLES','FRIENDS_TRIP','GOLDEN_AGE'], type: 'TEXT', isDeep: false,
    title: {
      en: 'If you could start this trip all over, what would you do differently?',
      he: 'אם הייתם מתחילים את הטיול מחדש — מה הייתם עושים אחרת?',
      es: 'Si pudieras empezar el viaje de cero, ¿qué cambiarías?',
      fr: 'Si vous pouviez repartir de zéro, vous feriez quoi autrement?',
      de: 'Wenn ihr von vorne anfangen könntet — was würdet ihr anders machen?',
      pt: 'Se vocês pudessem começar a viagem do zero, o que fariam diferente?',
      ar: 'لو قدرتم تبدأون الرحلة من أولها، شو غيّرتم؟',
      ja: 'もし旅をやり直せるなら、何を変える？',
      ko: '이 여행을 처음부터 다시 할 수 있다면 뭘 다르게 할 것 같아?',
    },
  },
  {
    id: 'q15', suitableFor: ['FAMILY','COUPLES','FRIENDS_TRIP','GOLDEN_AGE'], type: 'TEXT', isDeep: false,
    title: {
      en: "What's the tastiest thing you've eaten on this trip?",
      he: 'מה הכי טעים שנכנס לכם לפה בטיול?',
      es: '¿Qué es lo más rico que te comiste en el viaje?',
      fr: "Quel a été le meilleur truc que t'as mangé dans ce voyage?",
      de: 'Was war das Leckerste, das ihr auf der Reise gegessen habt?',
      pt: 'Qual foi a coisa mais gostosa que você comeu na viagem?',
      ar: 'إيش أحلى شيء أكلته في الرحلة؟',
      ja: '旅でいちばん美味しかったものって何？',
      ko: '이 여행에서 먹은 것 중 제일 맛있었던 게 뭐야?',
    },
  },
  // ── DEEP / PEOPLE ─────────────────────────────────────────────────────────
  {
    id: 'q16', suitableFor: ['FAMILY','COUPLES','FRIENDS_TRIP','GOLDEN_AGE'], type: 'PEOPLE', isDeep: true,
    title: {
      en: "Who do you think has changed the most since the trip started?",
      he: 'מי לדעתך הכי השתנה מאז שיצאנו לדרך?',
      es: '¿Quién crees que ha cambiado más desde que empezó el viaje?',
      fr: 'Qui tu penses a le plus changé depuis le début du voyage?',
      de: 'Wer hat sich seit Reisebeginn am meisten verändert?',
      pt: 'Quem você acha que mais mudou desde que a viagem começou?',
      ar: 'مَن تعتقد أنه تغيّر أكثر منذ بداية الرحلة؟',
      ja: '旅が始まってから、いちばん変わったのは誰だと思う？',
      ko: '여행이 시작된 이후 가장 많이 변한 사람은 누구인 것 같아?',
    },
  },
  {
    id: 'q17', suitableFor: ['FAMILY','COUPLES','GOLDEN_AGE'], type: 'PEOPLE', isDeep: true,
    title: {
      en: 'Who gave you the warmest, most heartfelt moment on this trip?',
      he: 'מי נתן לך את הרגע הכי חם ללב בטיול?',
      es: '¿Quién te dio el momento más especial y emotivo del viaje?',
      fr: "Qui t'a offert le moment le plus touchant du voyage?",
      de: 'Wer hat dir den herzlichsten Moment der Reise geschenkt?',
      pt: 'Quem te deu o momento mais especial e emotivo da viagem?',
      ar: 'مَن أعطاك أدفأ لحظة في الرحلة؟',
      ja: '旅でいちばん心が温まる瞬間をくれたのは誰？',
      ko: '이 여행에서 가장 따뜻한 순간을 선물해준 사람은 누구야?',
    },
  },
  {
    id: 'q18', suitableFor: ['FRIENDS_TRIP','COUPLES','FAMILY'], type: 'PEOPLE', isDeep: true,
    title: {
      en: "Who's the least ready to go back home?",
      he: 'מי מביניכם הכי לא רוצה שזה ייגמר?',
      es: '¿Quién es el que menos ganas tiene de volver a casa?',
      fr: "Qui a le moins envie de rentrer à la maison?",
      de: 'Wer will am wenigsten nach Hause zurück?',
      pt: "Quem tá com menos vontade de voltar pra casa?",
      ar: 'مَن الأقل رغبةً في العودة للبيت؟',
      ja: '家に帰るのが一番嫌なのは誰？',
      ko: '집에 돌아가기 제일 싫은 사람은 누구야?',
    },
  },
  {
    id: 'q19', suitableFor: ['FAMILY','GOLDEN_AGE','COUPLES'], type: 'PEOPLE', isDeep: true,
    title: {
      en: "Who do you think will still be telling stories about this trip in 30 years?",
      he: 'מי לדעתך יספר על הטיול הזה בעוד 30 שנה?',
      es: '¿Quién seguirá contando historias de este viaje dentro de 30 años?',
      fr: 'Qui parlera encore de ce voyage dans 30 ans?',
      de: 'Wer erzählt in 30 Jahren noch von dieser Reise?',
      pt: 'Quem ainda vai contar histórias dessa viagem daqui a 30 anos?',
      ar: 'مَن سيظل يحكي عن هذه الرحلة بعد 30 سنة؟',
      ja: '30年後もこの旅の話をしていそうなのは誰？',
      ko: '30년 후에도 이 여행 이야기를 하고 있을 사람은 누구야?',
    },
  },
  {
    id: 'q20', suitableFor: ['FAMILY','COUPLES','FRIENDS_TRIP','GOLDEN_AGE'], type: 'PEOPLE', isDeep: true,
    title: {
      en: 'Who had your back the most on this trip?',
      he: 'מי היה הגב שלך הכי חזק בטיול?',
      es: '¿Quién fue tu mayor apoyo durante el viaje?',
      fr: "Qui a été ton plus grand soutien pendant le voyage?",
      de: 'Wer hat dir am meisten den Rücken gestärkt auf der Reise?',
      pt: 'Quem foi seu maior apoio na viagem?',
      ar: 'مَن كان يسندك أكثر في الرحلة؟',
      ja: '旅でいちばん自分の背中を支えてくれたのは誰？',
      ko: '이 여행에서 당신 뒤를 가장 든든하게 받쳐준 사람은 누구야?',
    },
  },
  // ── DEEP / TEXT ───────────────────────────────────────────────────────────
  {
    id: 'q21', suitableFor: ['FAMILY','COUPLES','FRIENDS_TRIP','GOLDEN_AGE'], type: 'TEXT', isDeep: true,
    title: {
      en: 'What was the toughest moment of this trip for you?',
      he: 'מה הרגע שבו הכי התקשית בטיול?',
      es: '¿Cuál fue el momento más duro del viaje para ti?',
      fr: "Quel a été le moment le plus dur du voyage pour toi?",
      de: 'Was war der härteste Moment dieser Reise für dich?',
      pt: 'Qual foi o momento mais difícil da viagem pra você?',
      ar: 'إيش أصعب لحظة مررت فيها في الرحلة؟',
      ja: '旅でいちばんきつかった瞬間って何？',
      ko: '이 여행에서 당신에게 가장 힘들었던 순간이 뭐야?',
    },
  },
  {
    id: 'q22', suitableFor: ['FAMILY','COUPLES','FRIENDS_TRIP','GOLDEN_AGE'], type: 'TEXT', isDeep: true,
    title: {
      en: 'What did you miss most from home?',
      he: 'מה הכי חיסרת מהבית?',
      es: '¿Qué fue lo que más extrañaste de casa?',
      fr: "Qu'est-ce qui t'a le plus manqué de chez toi?",
      de: 'Was hast du am meisten von zu Hause vermisst?',
      pt: 'O que você sentiu mais falta de casa?',
      ar: 'إيش أكثر شيء اشتقت له من البيت؟',
      ja: '家からいちばん恋しかったものって何？',
      ko: '집에서 가장 그리웠던 게 뭐야?',
    },
  },
  {
    id: 'q23', suitableFor: ['FAMILY','COUPLES','FRIENDS_TRIP','GOLDEN_AGE'], type: 'TEXT', isDeep: true,
    title: {
      en: 'What did this trip reveal about yourself?',
      he: 'מה הטיול הזה גילה לך על עצמך?',
      es: '¿Qué descubriste de ti mismo en este viaje?',
      fr: "Qu'est-ce que ce voyage t'a révélé sur toi-même?",
      de: 'Was hat dir diese Reise über dich selbst offenbart?',
      pt: 'O que essa viagem te revelou sobre você mesmo?',
      ar: 'إيش كشفت لك هذه الرحلة عن نفسك؟',
      ja: 'この旅で自分について気づいたこと、何かある？',
      ko: '이 여행이 너 자신에 대해 뭘 알려줬어?',
    },
  },
  {
    id: 'q24', suitableFor: ['FRIENDS_TRIP','COUPLES'], type: 'TEXT', isDeep: true,
    title: {
      en: 'What will you tell your closest friends about this trip?',
      he: 'מה תחפור לחברים שלך על הטיול?',
      es: '¿Qué vas a contarles a tus amigos más cercanos del viaje?',
      fr: "Qu'est-ce que tu vas raconter à tes meilleurs amis sur ce voyage?",
      de: 'Was wirst du deinen engsten Freunden über diese Reise erzählen?',
      pt: 'O que você vai contar pros seus amigos mais chegados sobre a viagem?',
      ar: 'إيش بتقول لأصحابك المقربين عن الرحلة؟',
      ja: '親しい友達にこの旅の話をするなら、何を一番語る？',
      ko: '가장 친한 친구들한테 이 여행에 대해 뭘 얘기할 것 같아?',
    },
  },
  {
    id: 'q25', suitableFor: ['FAMILY','COUPLES','FRIENDS_TRIP','GOLDEN_AGE'], type: 'TEXT', isDeep: true,
    title: {
      en: "What's the one moment from this trip you'd freeze in time if you could?",
      he: 'איזה רגע מהטיול הזה היית רוצה לקפוא בזמן?',
      es: '¿Qué momento de este viaje congelarías en el tiempo si pudieras?',
      fr: 'Quel moment de ce voyage tu voudrais figer dans le temps?',
      de: 'Welchen Moment dieser Reise würdest du einfrieren, wenn du könntest?',
      pt: 'Qual momento dessa viagem você congelaria no tempo se pudesse?',
      ar: 'أي لحظة في الرحلة كنت تتمنى لو تجمّدها للأبد؟',
      ja: 'この旅のどの瞬間を、できれば時間を止めて残したい？',
      ko: '이 여행에서 시간을 멈춰 영원히 간직하고 싶은 순간이 뭐야?',
    },
  },

  // ── BONUS FUN / PEOPLE ────────────────────────────────────────────────────
  {
    id: 'q26', suitableFor: ['FAMILY','COUPLES','FRIENDS_TRIP','GOLDEN_AGE'], type: 'PEOPLE', isDeep: false,
    title: {
      en: 'Who\'s most likely to get completely lost?',
      he: 'מי הכי סביר שייאבד בדרך?',
      es: '¿Quién es el que más fácilmente se pierde?',
      fr: 'Qui est le plus susceptible de se perdre complètement?',
      de: 'Wer verirrt sich am schnellsten?',
      pt: 'Quem é o que mais fácil se perde?',
      ar: 'مَن الأكثر عرضةً للضياع؟',
      ja: '迷子になりやすいのは誰？',
      ko: '길 잃을 가능성이 제일 높은 사람은 누구야?',
    },
  },
  {
    id: 'q27', suitableFor: ['FAMILY','COUPLES','FRIENDS_TRIP','GOLDEN_AGE'], type: 'PEOPLE', isDeep: false,
    title: {
      en: 'Who\'d last longest on a deserted island?',
      he: 'מי ישרוד הכי הרבה על אי בודד?',
      es: '¿Quién sobreviviría más tiempo en una isla desierta?',
      fr: 'Qui survivrait le plus longtemps sur une île déserte?',
      de: 'Wer würde auf einer einsamen Insel am längsten durchhalten?',
      pt: 'Quem sobreviveria mais tempo numa ilha deserta?',
      ar: 'مَن سيصمد أطول على جزيرة مهجورة؟',
      ja: '無人島でいちばん長く生き残れそうなのは誰？',
      ko: '무인도에서 가장 오래 버틸 수 있는 사람은 누구야?',
    },
  },
  {
    id: 'q28', suitableFor: ['FAMILY','COUPLES','FRIENDS_TRIP','GOLDEN_AGE'], type: 'PEOPLE', isDeep: false,
    title: {
      en: 'Who\'s best at communicating when no one speaks the local language?',
      he: 'מי הכי טוב לתקשר כשאף אחד לא מדבר את השפה?',
      es: '¿Quién se arregla mejor cuando nadie habla el idioma local?',
      fr: 'Qui se débrouille le mieux quand personne ne parle la langue locale?',
      de: 'Wer kommt am besten zurecht, wenn niemand die Landessprache spricht?',
      pt: 'Quem se vira melhor quando ninguém fala o idioma local?',
      ar: 'مَن يتكيّف أفضل لما ما حدا يعرف اللغة المحلية؟',
      ja: '現地の言葉が通じないとき、いちばんうまく対応するのは誰？',
      ko: '현지 언어를 아무도 못할 때 제일 잘 통하는 사람은 누구야?',
    },
  },
  {
    id: 'q29', suitableFor: ['FAMILY','COUPLES','FRIENDS_TRIP','GOLDEN_AGE'], type: 'PEOPLE', isDeep: false,
    title: {
      en: 'Who\'ll eat literally anything on this trip?',
      he: 'מי מוכן לאכול כל דבר בטיול — אפילו משהו מפחיד?',
      es: '¿Quién es capaz de comerlo todo, aunque sea raro?',
      fr: 'Qui est prêt à tout manger, même les trucs bizarres?',
      de: 'Wer isst alles, egal wie seltsam es aussieht?',
      pt: 'Quem come qualquer coisa, mesmo que seja esquisito?',
      ar: 'مَن يأكل أي شيء حتى لو كان غريباً؟',
      ja: '見た目がどんなに怪しくても何でも食べるのは誰？',
      ko: '아무리 이상하게 생겨도 뭐든 먹을 수 있는 사람은 누구야?',
    },
  },
  {
    id: 'q30', suitableFor: ['FAMILY','COUPLES','FRIENDS_TRIP'], type: 'PEOPLE', isDeep: false,
    title: {
      en: 'Who\'s most likely to make a new local friend wherever you go?',
      he: 'מי הכי סביר לקשור חברות עם מישהו מקומי?',
      es: '¿Quién tiene más facilidad para hacerse amigo de alguien del lugar?',
      fr: 'Qui a le plus de facilité à se lier d\'amitié avec les habitants?',
      de: 'Wer freundet sich am schnellsten mit Einheimischen an?',
      pt: 'Quem tem mais facilidade em fazer amizade com as pessoas daqui?',
      ar: 'مَن يصادق المحليين بأسرع وقت؟',
      ja: '地元の人と友達になるのが一番得意なのは誰？',
      ko: '어딜 가든 현지인과 친구가 될 것 같은 사람은 누구야?',
    },
  },
  {
    id: 'q31', suitableFor: ['FAMILY','COUPLES','FRIENDS_TRIP','GOLDEN_AGE'], type: 'PEOPLE', isDeep: false,
    title: {
      en: 'Who\'s the navigator — and who\'s hopeless without GPS?',
      he: 'מי הנביגטור של הקבוצה — ומי אבוד בלי GPS?',
      es: '¿Quién tiene mejor sentido de la orientación y quién está perdido sin el GPS?',
      fr: 'Qui a le meilleur sens de l\'orientation et qui est perdu sans GPS?',
      de: 'Wer hat den besten Orientierungssinn — und wer ist ohne GPS aufgeschmissen?',
      pt: 'Quem tem melhor senso de direção e quem tá perdido sem GPS?',
      ar: 'مَن الأفضل في تحديد الاتجاهات ومَن يتوه بدون GPS؟',
      ja: '方向感覚が一番いいのは誰で、GPSなしでは詰むのは誰？',
      ko: '방향감각이 제일 좋은 사람과 GPS 없으면 못 사는 사람은 누구야?',
    },
  },

  // ── BONUS FUN / TEXT ──────────────────────────────────────────────────────
  {
    id: 'q32', suitableFor: ['FAMILY','COUPLES','FRIENDS_TRIP','GOLDEN_AGE'], type: 'TEXT', isDeep: false,
    title: {
      en: 'What was the funniest moment of the whole trip?',
      he: 'מה הרגע הכי מצחיק שהיה בטיול?',
      es: '¿Cuál fue el momento más gracioso de todo el viaje?',
      fr: 'Quel a été le moment le plus drôle de tout le voyage?',
      de: 'Was war der lustigste Moment der ganzen Reise?',
      pt: 'Qual foi o momento mais engraçado de toda a viagem?',
      ar: 'إيش أضحك لحظة في كل الرحلة؟',
      ja: '旅でいちばん笑ったのはどの瞬間？',
      ko: '이 여행에서 제일 웃겼던 순간이 뭐야?',
    },
  },
  {
    id: 'q33', suitableFor: ['FAMILY','COUPLES','FRIENDS_TRIP','GOLDEN_AGE'], type: 'TEXT', isDeep: false,
    title: {
      en: 'What was the best call you made on this trip?',
      he: 'מה ההחלטה הכי טובה שלקחתם בטיול?',
      es: '¿Cuál fue la mejor decisión que tomaron en el viaje?',
      fr: 'Quelle a été la meilleure décision que vous avez prise?',
      de: 'Was war die beste Entscheidung, die ihr auf der Reise getroffen habt?',
      pt: 'Qual foi a melhor decisão que vocês tomaram na viagem?',
      ar: 'إيش أفضل قرار اتخذتموه في الرحلة؟',
      ja: '旅でいちばん正解だった判断って何？',
      ko: '이 여행에서 내린 결정 중 제일 잘한 결정이 뭐야?',
    },
  },
  {
    id: 'q34', suitableFor: ['FAMILY','COUPLES','FRIENDS_TRIP','GOLDEN_AGE'], type: 'TEXT', isDeep: false,
    title: {
      en: 'What object or souvenir best captures the spirit of this trip?',
      he: 'איזה חפץ או מזכרת מייצג הכי טוב את הטיול הזה?',
      es: '¿Qué objeto o recuerdo representa mejor el espíritu de este viaje?',
      fr: 'Quel objet ou souvenir représente le mieux l\'esprit de ce voyage?',
      de: 'Welches Objekt oder Souvenir verkörpert diese Reise am besten?',
      pt: 'Qual objeto ou lembrança representa melhor o espírito dessa viagem?',
      ar: 'أي شيء أو هدية تذكارية تعكس روح هذه الرحلة أكثر؟',
      ja: 'この旅の雰囲気を一番よく表すものやお土産って何？',
      ko: '이 여행의 분위기를 가장 잘 담고 있는 물건이나 기념품이 뭐야?',
    },
  },
  {
    id: 'q35', suitableFor: ['FAMILY','COUPLES','FRIENDS_TRIP','GOLDEN_AGE'], type: 'TEXT', isDeep: false,
    title: {
      en: 'If you could\'ve brought one person who wasn\'t here — who and why?',
      he: 'אם יכולת להביא עוד בן אדם אחד שלא היה בטיול — מי ולמה?',
      es: 'Si pudieras haber traído a alguien que no vino, ¿a quién y por qué?',
      fr: 'Si tu pouvais avoir amené quelqu\'un qui n\'était pas là, qui et pourquoi?',
      de: 'Wenn du jemanden mitgenommen hättest, der nicht dabei war — wen und warum?',
      pt: 'Se você pudesse ter trazido alguém que não veio, quem e por quê?',
      ar: 'لو كنت تقدر تجيب معك شخص ما كانش معكم، مَن ولماذا؟',
      ja: '一緒に来られなかった人を連れてこれたとしたら、誰？なんで？',
      ko: '이 여행에 없었던 사람을 한 명 데려올 수 있었다면 누구야? 왜?',
    },
  },

  // ── BONUS DEEP / PEOPLE ───────────────────────────────────────────────────
  {
    id: 'q36', suitableFor: ['FAMILY','COUPLES','FRIENDS_TRIP','GOLDEN_AGE'], type: 'PEOPLE', isDeep: true,
    title: {
      en: 'Who surprised you the most on this trip?',
      he: 'מי הפתיע אותך הכי הרבה בטיול?',
      es: '¿Quién te sorprendió más durante el viaje?',
      fr: 'Qui t\'a le plus surpris pendant ce voyage?',
      de: 'Wer hat dich auf dieser Reise am meisten überrascht?',
      pt: 'Quem te surpreendeu mais durante a viagem?',
      ar: 'مَن أدهشك أكثر في هذه الرحلة؟',
      ja: '旅でいちばん自分を驚かせてくれたのは誰？',
      ko: '이 여행에서 당신을 가장 놀라게 한 사람은 누구야?',
    },
  },
  {
    id: 'q37', suitableFor: ['FAMILY','COUPLES','FRIENDS_TRIP','GOLDEN_AGE'], type: 'PEOPLE', isDeep: true,
    title: {
      en: 'Who would you travel with again in a heartbeat?',
      he: 'עם מי הייתם יוצאים לטיול נוסף בלי להסס?',
      es: '¿Con quién volverías a viajar sin dudarlo?',
      fr: 'Avec qui tu repartirais en voyage sans hésiter?',
      de: 'Mit wem würdest du sofort wieder auf Reisen gehen?',
      pt: 'Com quem você viajaria de novo sem hesitar?',
      ar: 'مَن تسافر معه مجدداً بدون تفكير؟',
      ja: '迷わずもう一度一緒に旅したいのは誰？',
      ko: '망설임 없이 다시 여행을 떠나고 싶은 사람은 누구야?',
    },
  },
  {
    id: 'q38', suitableFor: ['FRIENDS_TRIP','FAMILY','COUPLES'], type: 'PEOPLE', isDeep: true,
    title: {
      en: 'Who would you trust most if things went seriously wrong?',
      he: 'במי הכי הייתה בוטח אם משהו היה הולך קשה?',
      es: '¿En quién confiarías más si las cosas se pusieran feas de verdad?',
      fr: 'En qui tu ferais le plus confiance si les choses tournaient vraiment mal?',
      de: 'Wem würdest du am meisten vertrauen, wenn es wirklich ernst wird?',
      pt: 'Em quem você confiaria mais se a coisa ficasse feia de verdade?',
      ar: 'بمَن تثق أكثر لو صارت مشكلة حقيقية؟',
      ja: '本当にまずい状況になったとき、一番信頼できるのは誰？',
      ko: '진짜 위기 상황이 됐을 때 가장 믿을 수 있는 사람은 누구야?',
    },
  },

  // ── BONUS DEEP / TEXT ─────────────────────────────────────────────────────
  {
    id: 'q39', suitableFor: ['FAMILY','COUPLES','FRIENDS_TRIP','GOLDEN_AGE'], type: 'TEXT', isDeep: true,
    title: {
      en: 'In one sentence — what does traveling mean to you?',
      he: 'במשפט אחד — מה המשמעות של לטייל בשבילך?',
      es: 'En una frase, ¿qué significa viajar para ti?',
      fr: 'En une phrase — voyager, pour toi, c\'est quoi?',
      de: 'In einem Satz — was bedeutet Reisen für dich?',
      pt: 'Em uma frase — o que viajar significa pra você?',
      ar: 'بجملة واحدة — إيش يعني لك السفر؟',
      ja: '一文で言うと、旅って自分にとってどういう意味がある？',
      ko: '한 문장으로 — 여행이 당신에게 무슨 의미야?',
    },
  },
  {
    id: 'q40', suitableFor: ['FAMILY','COUPLES','FRIENDS_TRIP','GOLDEN_AGE'], type: 'TEXT', isDeep: true,
    title: {
      en: 'What from this trip will change the way you see the world?',
      he: 'מה מהטיול הזה ישנה לך את הדרך שבה אתה רואה את העולם?',
      es: '¿Qué de este viaje cambiará la forma en que ves el mundo?',
      fr: 'Qu\'est-ce que ce voyage va changer dans ta façon de voir le monde?',
      de: 'Was von dieser Reise wird verändern, wie du die Welt siehst?',
      pt: 'O que dessa viagem vai mudar a forma como você vê o mundo?',
      ar: 'إيش من هذه الرحلة سيغيّر طريقة نظرتك للعالم؟',
      ja: 'この旅の何かが、自分の世界の見方を変えそう？',
      ko: '이 여행에서 뭔가 당신의 세계관을 바꿀 것 같은 게 있어?',
    },
  },
  {
    id: 'q41', suitableFor: ['FAMILY','COUPLES','FRIENDS_TRIP','GOLDEN_AGE'], type: 'TEXT', isDeep: true,
    title: {
      en: 'What was the most meaningful conversation you had on this trip?',
      he: 'מה הייתה השיחה הכי משמעותית שהייתה לך בטיול הזה?',
      es: '¿Cuál fue la conversación más significativa que tuviste en el viaje?',
      fr: 'Quelle a été la conversation la plus importante que t\'as eue dans ce voyage?',
      de: 'Was war das tiefste Gespräch, das du auf dieser Reise geführt hast?',
      pt: 'Qual foi a conversa mais significativa que você teve nessa viagem?',
      ar: 'إيش أهم محادثة جرت معك في هذه الرحلة؟',
      ja: 'この旅でいちばん心に残った会話って何だった？',
      ko: '이 여행에서 가장 의미 있었던 대화가 뭐야?',
    },
  },
  {
    id: 'q42', suitableFor: ['COUPLES'], type: 'TEXT', isDeep: true,
    title: {
      en: 'What did this trip reveal about your relationship?',
      he: 'מה הטיול הזה גילה על הזוגיות שלכם?',
      es: '¿Qué reveló este viaje sobre vuestra relación?',
      fr: 'Qu\'est-ce que ce voyage a révélé sur votre relation?',
      de: 'Was hat diese Reise über eure Beziehung enthüllt?',
      pt: 'O que essa viagem revelou sobre a relação de vocês?',
      ar: 'إيش كشفت لك الرحلة عن علاقتكم؟',
      ja: 'この旅で、二人の関係について何が見えてきた？',
      ko: '이 여행이 두 사람의 관계에 대해 뭘 드러냈어?',
    },
  },
  {
    id: 'q43', suitableFor: ['FAMILY','GOLDEN_AGE'], type: 'TEXT', isDeep: true,
    title: {
      en: 'What family memory does this trip bring up for you?',
      he: 'איזה זיכרון משפחתי הטיול הזה מעלה לך?',
      es: '¿Qué recuerdo de familia te trae este viaje?',
      fr: 'Quel souvenir de famille ce voyage t\'évoque?',
      de: 'Welche Familienerinnerung weckt diese Reise in dir?',
      pt: 'Que lembrança de família essa viagem te traz?',
      ar: 'إيش ذكريات عائلية تجلبها هذه الرحلة في بالك؟',
      ja: 'この旅で、思い出す家族の記憶は何かある？',
      ko: '이 여행이 떠올리게 하는 가족 추억이 있어?',
    },
  },

  // ── YOUNG ADULTS / PEOPLE — FUN ───────────────────────────────────────────
  {
    id: 'q44', suitableFor: ['YOUNG_ADULTS'], type: 'PEOPLE', isDeep: false,
    title: {
      en: 'Who in the group is getting married first — place your bets!',
      he: 'מי בקבוצה יתחתן ראשון — מי מהמר?',
      es: '¿Quién de la panda se casa primero? ¡Apuesten!',
      fr: 'Qui se marie en premier dans le groupe — faites vos paris!',
      de: 'Wer heiratet als Erstes in der Gruppe — worauf wettet ihr?',
      pt: 'Quem da galera vai se casar primeiro — aposte!',
      ar: 'مَن في المجموعة سيتزوج أولاً — هاتوا رهاناتكم!',
      ja: 'グループで一番最初に結婚しそうなのは誰？賭けてみて！',
      ko: '그룹에서 제일 먼저 결혼할 사람은 누구야? 배팅해봐!',
    },
  },
  {
    id: 'q45', suitableFor: ['YOUNG_ADULTS'], type: 'PEOPLE', isDeep: false,
    title: {
      en: 'Who do you think will be killing it career-wise in 10 years?',
      he: 'מי לדעתך יהיה הכי מצליח בקריירה בעוד 10 שנים?',
      es: '¿Quién crees que le estará pegando duro en su carrera en 10 años?',
      fr: 'Qui selon toi sera au top de sa carrière dans 10 ans?',
      de: 'Wer rockt in 10 Jahren karrieremäßig am meisten?',
      pt: 'Quem você acha que vai arrasar na carreira em 10 anos?',
      ar: 'مَن تتوقع أنه سيكون الأنجح مهنياً بعد 10 سنوات؟',
      ja: '10年後、キャリアで一番活躍してそうなのは誰？',
      ko: '10년 후에 커리어에서 제일 잘 나갈 것 같은 사람은 누구야?',
    },
  },
  {
    id: 'q46', suitableFor: ['YOUNG_ADULTS','FRIENDS_TRIP'], type: 'PEOPLE', isDeep: false,
    title: {
      en: 'Who\'s packing up and moving abroad?',
      he: 'מי מביניכם יעשה עלייה לחו"ל?',
      es: '¿Quién se va a vivir al extranjero?',
      fr: 'Qui va s\'exiler à l\'étranger?',
      de: 'Wer macht den Abflug ins Ausland?',
      pt: 'Quem vai dar o mochilão e morar fora?',
      ar: 'مَن سيحزم حقائبه ويهاجر للخارج؟',
      ja: '海外に移住しそうなのは誰？',
      ko: '짐 싸서 해외로 이민갈 것 같은 사람은 누구야?',
    },
  },
  {
    id: 'q47', suitableFor: ['YOUNG_ADULTS'], type: 'PEOPLE', isDeep: false,
    title: {
      en: 'Who\'s going to start their own startup or business?',
      he: 'מי מביניכם יפתח סטארטאפ או עסק משלו?',
      es: '¿Quién va a montar su propio negocio o startup?',
      fr: 'Qui va lancer son propre business ou startup?',
      de: 'Wer startet sein eigenes Startup oder Business?',
      pt: 'Quem vai abrir seu próprio negócio ou startup?',
      ar: 'مَن سيبدأ مشروعه التجاري أو الناشئ الخاص؟',
      ja: 'スタートアップや自分のビジネスを始めそうなのは誰？',
      ko: '스타트업이나 자기 사업을 시작할 것 같은 사람은 누구야?',
    },
  },
  {
    id: 'q48', suitableFor: ['YOUNG_ADULTS','FRIENDS_TRIP'], type: 'PEOPLE', isDeep: false,
    title: {
      en: 'Who\'s going to have the most passport stamps in the next 5 years?',
      he: 'למי יהיה הכי הרבה חותמות בדרכון בחמש השנים הקרובות?',
      es: '¿Quién va a tener más sellos en el pasaporte en los próximos 5 años?',
      fr: 'Qui va avoir le plus de tampons dans son passeport dans les 5 prochaines années?',
      de: 'Wer wird in den nächsten 5 Jahren die meisten Stempel im Pass haben?',
      pt: 'Quem vai ter mais carimbos no passaporte nos próximos 5 anos?',
      ar: 'مَن سيكون لديه أكثر الختمات في جواز سفره خلال الخمس سنوات القادمة؟',
      ja: '次の5年間でパスポートのスタンプが一番多くなりそうなのは誰？',
      ko: '앞으로 5년간 여권 도장이 제일 많을 것 같은 사람은 누구야?',
    },
  },
  // ── YOUNG ADULTS / TEXT — FUN ─────────────────────────────────────────────
  {
    id: 'q49', suitableFor: ['YOUNG_ADULTS','FRIENDS_TRIP'], type: 'TEXT', isDeep: false,
    title: {
      en: 'What\'s the very first thing you\'re doing the second you get home?',
      he: 'מה הדבר הראשון שאתה עושה ברגע שאתה נוחת בבית?',
      es: '¿Qué es lo primero que vas a hacer nada más llegar a casa?',
      fr: 'La toute première chose que tu fais dès que tu rentres chez toi?',
      de: 'Was ist das Allererste, was du tust, sobald du zu Hause ankommst?',
      pt: 'Qual é a primeira coisa que você faz assim que chegar em casa?',
      ar: 'إيش أول شيء بتعمله لحظة ما توصل البيت؟',
      ja: '家に着いた瞬間、いちばん最初にすることって何？',
      ko: '집에 도착하자마자 제일 먼저 할 것 같은 게 뭐야?',
    },
  },
  {
    id: 'q50', suitableFor: ['YOUNG_ADULTS','FRIENDS_TRIP','COUPLES'], type: 'TEXT', isDeep: false,
    title: {
      en: 'If money was no object, where in the world would you actually live?',
      he: 'אם כסף לא היה עניין — איפה בעולם היית בוחר לחיות?',
      es: 'Si el dinero no fuera un problema, ¿dónde del mundo vivirías?',
      fr: 'Si l\'argent n\'était pas un problème, où dans le monde tu vivrais vraiment?',
      de: 'Wenn Geld keine Rolle spielen würde — wo auf der Welt würdest du wirklich leben?',
      pt: 'Se dinheiro não fosse problema, onde no mundo você moraria?',
      ar: 'لو المال ما كانش مشكلة، وين في العالم تختار تسكن؟',
      ja: 'お金が関係なかったとしたら、世界のどこに住みたい？',
      ko: '돈이 문제가 아니라면 세계 어디에서 살고 싶어?',
    },
  },
  {
    id: 'q51', suitableFor: ['YOUNG_ADULTS'], type: 'TEXT', isDeep: false,
    title: {
      en: 'What\'s the one big thing you want to make happen in the next year?',
      he: 'מה הדבר הגדול אחד שאתה רוצה שיקרה בשנה הקרובה?',
      es: '¿Cuál es la cosa grande que quieres hacer realidad el próximo año?',
      fr: 'Quelle est la grande chose que tu veux faire arriver dans l\'année qui vient?',
      de: 'Was ist die eine große Sache, die du im nächsten Jahr in die Tat umsetzen willst?',
      pt: 'Qual é a grande coisa que você quer fazer acontecer no próximo ano?',
      ar: 'إيش الشيء الكبير الذي تريد أن يتحقق في السنة القادمة؟',
      ja: 'この1年で絶対に実現させたい、一番大きなことって何？',
      ko: '내년에 꼭 이루고 싶은 가장 큰 한 가지가 뭐야?',
    },
  },
  // ── YOUNG ADULTS / PEOPLE — DEEP ─────────────────────────────────────────
  {
    id: 'q52', suitableFor: ['YOUNG_ADULTS','FRIENDS_TRIP'], type: 'PEOPLE', isDeep: true,
    title: {
      en: 'Who proved on this trip they\'re a real, true friend?',
      he: 'מי הוכיח בטיול הזה שהוא חבר אמיתי לגמרי?',
      es: '¿Quién demostró en este viaje que es un amigo de verdad?',
      fr: 'Qui a montré dans ce voyage qu\'il était un vrai ami?',
      de: 'Wer hat auf dieser Reise bewiesen, dass er ein echter Freund ist?',
      pt: 'Quem provou nessa viagem que é um amigo de verdade?',
      ar: 'مَن أثبت في هذه الرحلة أنه صديق حقيقي فعلاً؟',
      ja: '旅を通じて、本当の友達だってことを証明してくれたのは誰？',
      ko: '이 여행에서 진짜 진짜 친구라는 걸 증명한 사람은 누구야?',
    },
  },
  {
    id: 'q53', suitableFor: ['YOUNG_ADULTS','FRIENDS_TRIP'], type: 'PEOPLE', isDeep: true,
    title: {
      en: 'Who do you think will be the most different version of themselves in 10 years?',
      he: 'מי לדעתך יהיה הכי שונה מעצמו בעוד 10 שנים?',
      es: '¿Quién crees que va a ser la versión más diferente de sí mismo en 10 años?',
      fr: 'Qui tu penses sera le plus différent de lui-même dans 10 ans?',
      de: 'Wer wird in 10 Jahren am meisten anders sein als heute?',
      pt: 'Quem você acha que vai ser a versão mais diferente de si mesmo em 10 anos?',
      ar: 'مَن تعتقد أنه سيكون أكثر اختلافاً عن نفسه الحالية بعد 10 سنوات؟',
      ja: '10年後、今といちばん変わってそうなのは誰だと思う？',
      ko: '10년 후에 지금과 가장 많이 달라져 있을 것 같은 사람은 누구야?',
    },
  },
  {
    id: 'q54', suitableFor: ['YOUNG_ADULTS','FRIENDS_TRIP','FAMILY'], type: 'PEOPLE', isDeep: true,
    title: {
      en: 'Who holds the whole group together when things get rough?',
      he: 'מי מחזיק את הקבוצה כולה כשהולך קשה?',
      es: '¿Quién sostiene al grupo entero cuando las cosas se ponen difíciles?',
      fr: 'Qui tient tout le groupe quand ça devient difficile?',
      de: 'Wer hält die ganze Gruppe zusammen, wenn es hart wird?',
      pt: 'Quem segura o grupo inteiro quando as coisas ficam difíceis?',
      ar: 'مَن يجمع المجموعة كلها لما تصير الأمور صعبة؟',
      ja: 'つらくなったとき、グループ全体をまとめてくれるのは誰？',
      ko: '상황이 힘들어졌을 때 그룹 전체를 붙잡아주는 사람은 누구야?',
    },
  },
  // ── YOUNG ADULTS / TEXT — DEEP ────────────────────────────────────────────
  {
    id: 'q55', suitableFor: ['YOUNG_ADULTS'], type: 'TEXT', isDeep: true,
    title: {
      en: 'What scares you most about what comes next in life?',
      he: 'מה הכי מפחיד אותך במה שמחכה לך בהמשך החיים?',
      es: '¿Qué es lo que más te asusta de lo que viene en la vida?',
      fr: 'Qu\'est-ce qui t\'effraie le plus dans ce qui t\'attend dans la vie?',
      de: 'Was macht dir am meisten Angst an dem, was noch kommen wird?',
      pt: 'O que mais te assusta no que vem pela frente na vida?',
      ar: 'إيش يخوّفك أكثر مما هو قادم في حياتك؟',
      ja: 'これから先の人生で、いちばん怖いことって何？',
      ko: '앞으로의 삶에서 가장 두려운 게 뭐야?',
    },
  },
  {
    id: 'q56', suitableFor: ['YOUNG_ADULTS','FRIENDS_TRIP'], type: 'TEXT', isDeep: true,
    title: {
      en: 'In 20 years, what do you want to be remembered for?',
      he: 'בעוד 20 שנה — במה אתה רוצה שיזכרו אותך?',
      es: 'En 20 años, ¿por qué quieres que te recuerden?',
      fr: 'Dans 20 ans, pour quoi tu veux qu\'on se souvienne de toi?',
      de: 'In 20 Jahren — wofür willst du in Erinnerung bleiben?',
      pt: 'Daqui a 20 anos, por que você quer ser lembrado?',
      ar: 'بعد 20 سنة — بماذا تريد أن يتذكرك الناس؟',
      ja: '20年後、どんな人として覚えていてほしい？',
      ko: '20년 후에 어떤 사람으로 기억되고 싶어?',
    },
  },
  {
    id: 'q57', suitableFor: ['YOUNG_ADULTS'], type: 'TEXT', isDeep: true,
    title: {
      en: 'What would you tell your past self before all of this began?',
      he: 'מה היית אומר לעצמך לפני שהכל התחיל?',
      es: '¿Qué le dirías a tu yo del pasado antes de que todo esto empezara?',
      fr: 'Qu\'est-ce que tu dirais à ton ancien moi avant que tout ça commence?',
      de: 'Was würdest du dir selbst sagen, bevor das alles begann?',
      pt: 'O que você diria para o seu eu do passado antes de tudo isso começar?',
      ar: 'إيش تقول لنفسك قبل ما يبدأ كل هذا؟',
      ja: 'これが始まる前の自分に、何を伝えてあげたい？',
      ko: '이 모든 게 시작되기 전의 자신에게 뭐라고 말해주고 싶어?',
    },
  },
  {
    id: 'q58', suitableFor: ['YOUNG_ADULTS','FRIENDS_TRIP','COUPLES'], type: 'TEXT', isDeep: true,
    title: {
      en: 'What\'s the one thing you keep saying you\'ll do — but never actually do?',
      he: 'מה הדבר שאתה כל הזמן אומר שתעשה — ולעולם לא מתחיל?',
      es: '¿Cuál es esa cosa que siempre dices que vas a hacer pero nunca arrancas?',
      fr: 'Quelle est cette chose que tu dis toujours que tu vas faire mais que tu ne commences jamais?',
      de: 'Was sagst du immer, dass du es tun wirst — aber nie anfängst?',
      pt: 'Qual é aquela coisa que você sempre diz que vai fazer mas nunca começa?',
      ar: 'إيش الشيء الذي تقول دائماً إنك ستفعله لكنك لا تبدأ فيه أبداً؟',
      ja: '「いつかやる」ってずっと言い続けてることって何？',
      ko: '항상 할 거라고 말하지만 절대 시작하지 않는 것이 뭐야?',
    },
  },
];

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------
const rooms = {};

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code;
  do { code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''); }
  while (rooms[code]);
  return code;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function filterAndPickQuestions(tripType, includeDeep, maxQuestions) {
  const filtered = ALL_QUESTIONS.filter(
    (q) => q.suitableFor.includes(tripType) && (includeDeep || !q.isDeep),
  );
  return shuffle(filtered).slice(0, maxQuestions);
}

// Localise a question — replace title object with a string for the room's lang
function localiseQuestion(q, lang) {
  const safeLang = SUPPORTED_LANGS.includes(lang) ? lang : 'en';
  return { ...q, title: q.title[safeLang] || q.title.en };
}

function buildRoomSnapshot(room) {
  return {
    code: room.code,
    hostName: room.hostName,
    groupName: room.groupName,
    tripType: room.tripType,
    includeDeep: room.includeDeep,
    maxQuestions: room.maxQuestions,
    state: room.state,
    lang: room.lang,
    participants: room.participants.map(({ socketId, name, groupName }) => ({ socketId, name, groupName })),
    currentQuestionIndex: room.currentQuestionIndex,
    totalQuestions: room.questions.length,
  };
}

function computePeopleResults(room, votes) {
  const tally = {};
  room.participants.forEach(({ socketId, name, groupName }) => { tally[socketId] = { socketId, name, groupName, count: 0 }; });
  const crossGroupVotes = [];
  votes.forEach(({ voterName, voterGroup, value }) => {
    (value || []).forEach((targetId) => {
      if (!tally[targetId]) return;
      tally[targetId].count += 1;
      if (voterGroup && tally[targetId].groupName && voterGroup !== tally[targetId].groupName) {
        crossGroupVotes.push({ voterName, targetName: tally[targetId].name, voterGroup, targetGroup: tally[targetId].groupName });
      }
    });
  });
  return { type: 'PEOPLE', podium: Object.values(tally).sort((a, b) => b.count - a.count).slice(0, 3), crossGroupVotes };
}

function computeTextResults(votes) {
  return { type: 'TEXT', answers: votes.map(({ voterName, value }) => ({ userName: voterName, answer: value || '' })) };
}

function buildGameSummary(room) {
  const nameCounts = {};
  const funnyMoments = [];
  room.results.forEach((result) => {
    if (result.type === 'PEOPLE') {
      result.podium.forEach(({ name, count }) => { nameCounts[name] = (nameCounts[name] || 0) + count; });
      result.crossGroupVotes.forEach((cv) => { funnyMoments.push(`${cv.voterName} → ${cv.targetName} (${cv.voterGroup} ↔ ${cv.targetGroup})`); });
    }
  });
  const mvp = Object.entries(nameCounts).sort((a, b) => b[1] - a[1])[0];
  return { mvp: mvp ? { name: mvp[0], votes: mvp[1] } : null, funnyMoments: funnyMoments.slice(0, 5), totalQuestions: room.results.length };
}

// ---------------------------------------------------------------------------
// Socket.io
// ---------------------------------------------------------------------------
io.on('connection', (socket) => {
  console.log(`[+] ${socket.id}`);

  // Client analytics events
  socket.on('analytics', (event) => {
    if (!event?.event) return;
    const e = { ...event, socketId: socket.id };
    analytics.events.push(e);
    if (analytics.events.length > 500) analytics.events.shift();
    analytics.totals[e.event] = (analytics.totals[e.event] || 0) + 1;
    if (analytics.funnels[e.event] !== undefined) analytics.funnels[e.event] += 1;
    if (e.tripType) analytics.tripTypes[e.tripType] = (analytics.tripTypes[e.tripType] || 0) + 1;
    if (e.lang) analytics.languages[e.lang] = (analytics.languages[e.lang] || 0) + 1;
    if (e.event === 'game_completed') {
      analytics._gamesTracked += 1;
      analytics._totalPlayers  += (e.playerCount  || 0);
      analytics._totalQuestions += (e.totalQuestions || 0);
      analytics.avgPlayersPerGame   = Math.round(analytics._totalPlayers  / analytics._gamesTracked);
      analytics.avgQuestionsPerGame = Math.round(analytics._totalQuestions / analytics._gamesTracked);
    }
    saveAnalytics(analytics);
  });

  socket.on('create_room', ({ hostName, groupName, tripType, includeDeep, maxQuestions, lang = 'en' }) => {
    if (!hostName || !TRIP_TYPES.includes(tripType)) { socket.emit('error', { message: 'Invalid payload' }); return; }
    const code = generateRoomCode();
    const safeLang = SUPPORTED_LANGS.includes(lang) ? lang : 'en';
    const rawQuestions = filterAndPickQuestions(tripType, !!includeDeep, maxQuestions || 10);
    const questions = rawQuestions.map((q) => localiseQuestion(q, safeLang));

    rooms[code] = {
      code, hostSocketId: socket.id, hostName, groupName: groupName || '',
      tripType, includeDeep: !!includeDeep, maxQuestions: questions.length,
      lang: safeLang,
      participants: [{ socketId: socket.id, name: hostName, groupName: groupName || '' }],
      questions, currentQuestionIndex: -1, state: STATE.LOBBY, votes: [], results: [],
    };
    socket.join(code);
    socket.emit('room_created', { code });
    io.to(code).emit('room_update', buildRoomSnapshot(rooms[code]));
    console.log(`[room] ${code} ${hostName} lang=${safeLang} trip=${tripType}`);
  });

  socket.on('join_room', ({ code, name, groupName }) => {
    const room = rooms[code?.toUpperCase()];
    if (!room) { socket.emit('error', { message: 'Room not found' }); return; }
    if (room.state !== STATE.LOBBY) { socket.emit('error', { message: 'Game already started' }); return; }
    if (!room.participants.find((p) => p.socketId === socket.id))
      room.participants.push({ socketId: socket.id, name, groupName: groupName || '' });
    socket.join(code.toUpperCase());
    io.to(code.toUpperCase()).emit('room_update', buildRoomSnapshot(room));
  });

  socket.on('start_game', ({ code }) => {
    const room = rooms[code];
    if (!room || room.hostSocketId !== socket.id) return;
    if (room.participants.length < 2) { socket.emit('error', { message: 'Need at least 2 players' }); return; }
    room.state = STATE.VOTING;
    room.currentQuestionIndex = 0;
    room.votes = [];
    globalStats.gamesStarted += 1;
    globalStats.totalPlayers += room.participants.length;
    globalStats.langBreakdown[room.lang] = (globalStats.langBreakdown[room.lang] || 0) + 1;
    saveStats(globalStats);
    io.to(code).emit('game_state_change', { state: STATE.VOTING });
    io.to(code).emit('question_data', {
      question: room.questions[0], questionNumber: 1, totalQuestions: room.questions.length,
      participants: room.participants.map(({ socketId, name }) => ({ socketId, name })),
    });
  });

  socket.on('submit_vote', ({ code, value }) => {
    const room = rooms[code];
    if (!room || room.state !== STATE.VOTING) return;
    const participant = room.participants.find((p) => p.socketId === socket.id);
    if (!participant) return;
    room.votes = room.votes.filter((v) => v.socketId !== socket.id);
    room.votes.push({ socketId: socket.id, voterName: participant.name, voterGroup: participant.groupName, value });
    io.to(code).emit('vote_progress', { votesReceived: room.votes.length, totalParticipants: room.participants.length });
    if (room.votes.length === room.participants.length) {
      const currentQ = room.questions[room.currentQuestionIndex];
      globalStats.questionStats[currentQ.id] = (globalStats.questionStats[currentQ.id] || 0) + 1;
      saveStats(globalStats);
      const result = currentQ.type === 'PEOPLE' ? computePeopleResults(room, room.votes) : computeTextResults(room.votes);
      result.question = currentQ;
      result.questionNumber = room.currentQuestionIndex + 1;
      room.results.push(result);
      room.state = STATE.RESULTS;
      io.to(code).emit('game_state_change', { state: STATE.RESULTS });
      io.to(code).emit('results_data', result);
    }
  });

  socket.on('next_question', ({ code }) => {
    const room = rooms[code];
    if (!room || room.hostSocketId !== socket.id) return;
    const nextIndex = room.currentQuestionIndex + 1;
    if (nextIndex >= room.questions.length) {
      room.state = STATE.SUMMARY;
      globalStats.gamesCompleted += 1;
      saveStats(globalStats);
      io.to(code).emit('game_state_change', { state: STATE.SUMMARY });
      io.to(code).emit('game_summary', buildGameSummary(room));
      return;
    }
    room.currentQuestionIndex = nextIndex;
    room.votes = [];
    room.state = STATE.VOTING;
    io.to(code).emit('game_state_change', { state: STATE.VOTING });
    io.to(code).emit('question_data', {
      question: room.questions[nextIndex], questionNumber: nextIndex + 1, totalQuestions: room.questions.length,
      participants: room.participants.map(({ socketId, name }) => ({ socketId, name })),
    });
  });

  socket.on('disconnect', () => {
    console.log(`[-] ${socket.id}`);
    for (const code of Object.keys(rooms)) {
      const room = rooms[code];
      const idx = room.participants.findIndex((p) => p.socketId === socket.id);
      if (idx === -1) continue;
      room.participants.splice(idx, 1);
      if (room.hostSocketId === socket.id) {
        io.to(code).emit('room_closed', { message: 'Host left the game' });
        delete rooms[code];
      } else {
        io.to(code).emit('room_update', buildRoomSnapshot(room));
      }
      break;
    }
  });
});

// ---------------------------------------------------------------------------
// Client analytics events via socket
// ---------------------------------------------------------------------------
const ANALYTICS_FILE = path.join(__dirname, 'analytics.json');
function loadAnalytics() {
  const defaults = {
    events: [],          // last 500 events ring-buffer
    totals: {},          // event_name → count
    funnels: {
      appOpen: 0, roomCreated: 0, gameStarted: 0, gameCompleted: 0,
      adStarted: 0, adCompleted: 0, adSkipped: 0, summaryShared: 0,
    },
    tripTypes: {},
    languages: {},
    avgPlayersPerGame: 0,
    avgQuestionsPerGame: 0,
    _gamesTracked: 0,
    _totalPlayers: 0,
    _totalQuestions: 0,
  };
  try { return { ...defaults, ...JSON.parse(fs.readFileSync(ANALYTICS_FILE, 'utf8')) }; }
  catch { return defaults; }
}
function saveAnalytics(a) {
  try { fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(a, null, 2)); } catch (_) {}
}
let analytics = loadAnalytics();

// ---------------------------------------------------------------------------
// HTTP endpoints
// ---------------------------------------------------------------------------
app.get('/health', (_req, res) => res.json({ ok: true, rooms: Object.keys(rooms).length, stats: globalStats }));
app.get('/stats',  (_req, res) => res.json(globalStats));
app.get('/analytics', (_req, res) => {
  const { events, ...summary } = analytics;  // don't expose raw events publicly
  res.json({ ...summary, recentEventCount: events.length });
});

server.listen(PORT, () => console.log(`\n🚀 Travelteling server on port ${PORT}\n`));
