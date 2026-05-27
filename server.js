// ============================================================================
// Travelteling Server — Reflective Journey Edition
// ----------------------------------------------------------------------------
// 4-stage flow: GROUNDING → DEEP → INTEGRATION → RETROSPECTIVE → CLOSURE
// No voting. No competition. Shared exposure + hearts of acknowledgment.
// ============================================================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const {
  STAGES,
  CATEGORIES,
  CATEGORY_META,
  pickQuestionsForSession,
  localiseQuestion,
} = require('./reflective-questions');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
const PORT = process.env.PORT || 3001;

// ----------------------------------------------------------------------------
// State machine
// ----------------------------------------------------------------------------
const STATE = {
  LOBBY:   'LOBBY',     // waiting for players
  WRITING: 'WRITING',   // each person writes their answer
  REVEAL:  'REVEAL',    // all answers shown, hearts allowed
  CLOSURE: 'CLOSURE',   // somatic closure (breath / release / anchor)
  SUMMARY: 'SUMMARY',   // journey book
};

const SUPPORTED_LANGS = ['en', 'he', 'es', 'fr', 'de', 'pt', 'ar', 'ja', 'ko'];

// ----------------------------------------------------------------------------
// Persistent stats
// ----------------------------------------------------------------------------
const STATS_FILE = path.join(__dirname, 'stats.json');
function loadStats() {
  const defaults = {
    sessionsStarted: 0,
    sessionsCompleted: 0,
    totalParticipants: 0,
    langBreakdown: {},
    categoryBreakdown: {},
    questionStats: {},
    commitmentsCount: 0,
  };
  try { return { ...defaults, ...JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')) }; }
  catch { return defaults; }
}
function saveStats(s) {
  try { fs.writeFileSync(STATS_FILE, JSON.stringify(s, null, 2)); }
  catch (e) { console.error('[stats]', e.message); }
}
const globalStats = loadStats();

// ----------------------------------------------------------------------------
// Rooms (in-memory)
// ----------------------------------------------------------------------------
const rooms = {};

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms[code]);
  return code;
}

// ----------------------------------------------------------------------------
// Room helpers
// ----------------------------------------------------------------------------
function buildRoomSnapshot(room) {
  return {
    code: room.code,
    hostName: room.hostName,
    state: room.state,
    lang: room.lang,
    categories: room.categories,
    writingMode: room.writingMode || 'digital',
    participants: room.participants.map(({ socketId, name }) => ({ socketId, name })),
    currentQuestionIndex: room.currentQuestionIndex,
    totalQuestions: room.questions.length,
  };
}

// Build the reveal payload for the current question
function buildRevealPayload(room) {
  const currentQ = room.questions[room.currentQuestionIndex];
  const answers = room.answersForCurrentQuestion.map((a) => {
    const participant = room.participants.find((p) => p.socketId === a.socketId);
    return {
      socketId: a.socketId,
      authorName: participant ? participant.name : 'Anonymous',
      title: a.title || a.text || '',
      detail: a.detail || '',
      text: a.title || a.text || '',   // backward-compat
      heartsFrom: a.heartsFrom || [],
    };
  });
  return {
    question: localiseQuestion(currentQ, room.lang),
    questionNumber: room.currentQuestionIndex + 1,
    totalQuestions: room.questions.length,
    stage: currentQ.stage,
    category: currentQ.category,
    answers,
  };
}

// Build full summary / "journey book"
function buildJourneyBook(room) {
  const entries = room.completedQuestions.map((entry) => {
    return {
      question: localiseQuestion(entry.question, room.lang),
      stage: entry.question.stage,
      category: entry.question.category,
      answers: entry.answers.map((a) => {
        const p = room.participants.find((pp) => pp.socketId === a.socketId);
        return {
          authorName: p ? p.name : 'Anonymous',
          title: a.title || a.text || '',
          detail: a.detail || '',
          text: a.title || a.text || '',   // backward-compat
          heartsCount: (a.heartsFrom || []).length,
        };
      }),
    };
  });
  return {
    code: room.code,
    totalQuestions: entries.length,
    participants: room.participants.map((p) => ({ name: p.name })),
    entries,
    commitments: room.commitments || [],
  };
}

// ----------------------------------------------------------------------------
// Socket.io
// ----------------------------------------------------------------------------
io.on('connection', (socket) => {
  console.log(`[+] ${socket.id}`);

  // Lightweight analytics events from client (no PII)
  socket.on('analytics', (event) => {
    if (!event?.event) return;
    const e = { ...event, socketId: socket.id };
    analytics.events.push(e);
    if (analytics.events.length > 500) analytics.events.shift();
    analytics.totals[e.event] = (analytics.totals[e.event] || 0) + 1;
    if (e.lang) analytics.languages[e.lang] = (analytics.languages[e.lang] || 0) + 1;
    saveAnalytics(analytics);
  });

  // ── create_room ────────────────────────────────────────────────────────────
  socket.on('create_room', ({ hostName, categories, maxQuestions, lang = 'en', writingMode = 'digital' }) => {
    if (!hostName) {
      socket.emit('error', { message: 'Missing host name' });
      return;
    }
    const safeLang = SUPPORTED_LANGS.includes(lang) ? lang : 'en';
    const safeCategories = Array.isArray(categories) && categories.length > 0
      ? categories.filter((c) => CATEGORIES[c])
      : Object.keys(CATEGORIES); // all categories if none specified

    const sessionLength = Math.min(Math.max(parseInt(maxQuestions, 10) || 8, 3), 15);
    const questions = pickQuestionsForSession(safeCategories, sessionLength);

    if (questions.length === 0) {
      socket.emit('error', { message: 'No questions matched your selection' });
      return;
    }

    const code = generateRoomCode();
    rooms[code] = {
      code,
      hostSocketId: socket.id,
      hostName,
      lang: safeLang,
      categories: safeCategories,
      participants: [{ socketId: socket.id, name: hostName }],
      questions,
      currentQuestionIndex: -1,
      state: STATE.LOBBY,
      writingMode: ['digital', 'paper'].includes(writingMode) ? writingMode : 'digital',
      answersForCurrentQuestion: [],   // [{ socketId, title, detail, heartsFrom: [socketId,...] }]
      completedQuestions: [],          // [{ question, answers: [...] }]
      commitments: [],                 // [{ socketId, name, text }]
    };
    socket.join(code);
    socket.emit('room_created', { code });
    io.to(code).emit('room_update', buildRoomSnapshot(rooms[code]));
    console.log(`[room] ${code} host=${hostName} lang=${safeLang} cats=[${safeCategories.join(',')}] q=${questions.length}`);
  });

  // ── join_room ──────────────────────────────────────────────────────────────
  socket.on('join_room', ({ code, name }) => {
    const upperCode = (code || '').toUpperCase();
    const room = rooms[upperCode];
    if (!room) { socket.emit('error', { message: 'Room not found' }); return; }
    if (room.state !== STATE.LOBBY) { socket.emit('error', { message: 'Session already started' }); return; }
    if (!name) { socket.emit('error', { message: 'Missing name' }); return; }
    if (!room.participants.find((p) => p.socketId === socket.id)) {
      room.participants.push({ socketId: socket.id, name });
    }
    socket.join(upperCode);
    io.to(upperCode).emit('room_update', buildRoomSnapshot(room));
  });

  // ── start_game ─────────────────────────────────────────────────────────────
  socket.on('start_game', ({ code }) => {
    const room = rooms[code];
    if (!room || room.hostSocketId !== socket.id) return;
    if (room.participants.length < 1) {
      socket.emit('error', { message: 'No participants' });
      return;
    }
    room.state = STATE.WRITING;
    room.currentQuestionIndex = 0;
    room.answersForCurrentQuestion = [];
    globalStats.sessionsStarted += 1;
    globalStats.totalParticipants += room.participants.length;
    globalStats.langBreakdown[room.lang] = (globalStats.langBreakdown[room.lang] || 0) + 1;
    room.categories.forEach((c) => {
      globalStats.categoryBreakdown[c] = (globalStats.categoryBreakdown[c] || 0) + 1;
    });
    saveStats(globalStats);

    io.to(code).emit('game_state_change', { state: STATE.WRITING });
    io.to(code).emit('question_data', {
      question: localiseQuestion(room.questions[0], room.lang),
      questionNumber: 1,
      totalQuestions: room.questions.length,
      stage: room.questions[0].stage,
      category: room.questions[0].category,
    });
  });

  // ── submit_answer ──────────────────────────────────────────────────────────
  socket.on('submit_answer', ({ code, title, detail, text }) => {
    const room = rooms[code];
    if (!room || room.state !== STATE.WRITING) return;
    const participant = room.participants.find((p) => p.socketId === socket.id);
    if (!participant) return;

    // Support both old format (text) and new format (title + detail)
    const cleanTitle  = String(title || text || '').trim().slice(0, 120);
    const cleanDetail = String(detail || '').trim().slice(0, 800);

    // Digital mode requires at least a title; paper mode allows empty (just "done" signal)
    if (room.writingMode !== 'paper' && !cleanTitle) return;

    // Replace if already submitted
    room.answersForCurrentQuestion = room.answersForCurrentQuestion.filter(
      (a) => a.socketId !== socket.id,
    );
    room.answersForCurrentQuestion.push({
      socketId: socket.id,
      title: cleanTitle,
      detail: cleanDetail,
      text: cleanTitle,   // backward-compat
      heartsFrom: [],
    });

    io.to(code).emit('writing_progress', {
      submitted: room.answersForCurrentQuestion.length,
      total: room.participants.length,
    });

    // When everyone has submitted → move to REVEAL
    if (room.answersForCurrentQuestion.length >= room.participants.length) {
      const currentQ = room.questions[room.currentQuestionIndex];
      globalStats.questionStats[currentQ.id] = (globalStats.questionStats[currentQ.id] || 0) + 1;
      saveStats(globalStats);

      room.state = STATE.REVEAL;
      io.to(code).emit('game_state_change', { state: STATE.REVEAL });
      io.to(code).emit('reveal_data', buildRevealPayload(room));
    }
  });

  // ── send_heart ─────────────────────────────────────────────────────────────
  socket.on('send_heart', ({ code, answerOwnerId }) => {
    const room = rooms[code];
    if (!room || room.state !== STATE.REVEAL) return;
    if (socket.id === answerOwnerId) return;   // can't heart your own
    const answer = room.answersForCurrentQuestion.find((a) => a.socketId === answerOwnerId);
    if (!answer) return;
    answer.heartsFrom = answer.heartsFrom || [];
    if (answer.heartsFrom.includes(socket.id)) {
      // toggle off
      answer.heartsFrom = answer.heartsFrom.filter((id) => id !== socket.id);
    } else {
      answer.heartsFrom.push(socket.id);
    }
    io.to(code).emit('reveal_data', buildRevealPayload(room));
  });

  // ── next_question ──────────────────────────────────────────────────────────
  socket.on('next_question', ({ code }) => {
    const room = rooms[code];
    if (!room || room.hostSocketId !== socket.id) return;
    if (room.state !== STATE.REVEAL) return;

    // Archive the current question's answers
    room.completedQuestions.push({
      question: room.questions[room.currentQuestionIndex],
      answers: room.answersForCurrentQuestion,
    });

    const nextIndex = room.currentQuestionIndex + 1;
    if (nextIndex >= room.questions.length) {
      // All questions done → CLOSURE phase
      room.state = STATE.CLOSURE;
      io.to(code).emit('game_state_change', { state: STATE.CLOSURE });
      io.to(code).emit('closure_started', {
        totalQuestions: room.questions.length,
        participants: room.participants.map((p) => ({ name: p.name })),
      });
      return;
    }

    room.currentQuestionIndex = nextIndex;
    room.answersForCurrentQuestion = [];
    room.state = STATE.WRITING;
    const q = room.questions[nextIndex];
    io.to(code).emit('game_state_change', { state: STATE.WRITING });
    io.to(code).emit('question_data', {
      question: localiseQuestion(q, room.lang),
      questionNumber: nextIndex + 1,
      totalQuestions: room.questions.length,
      stage: q.stage,
      category: q.category,
    });
  });

  // ── submit_commitment ──────────────────────────────────────────────────────
  // During CLOSURE step, each participant writes their personal commitment.
  // The commitment is private (only that participant sees it), but the server
  // tracks completion so the host can advance.
  socket.on('submit_commitment', ({ code, text }) => {
    const room = rooms[code];
    if (!room || room.state !== STATE.CLOSURE) return;
    const participant = room.participants.find((p) => p.socketId === socket.id);
    if (!participant) return;

    const cleanText = String(text || '').trim().slice(0, 300);
    if (!cleanText) return;

    room.commitments = (room.commitments || []).filter((c) => c.socketId !== socket.id);
    room.commitments.push({
      socketId: socket.id,
      name: participant.name,
      text: cleanText,
    });
    globalStats.commitmentsCount = (globalStats.commitmentsCount || 0) + 1;
    saveStats(globalStats);

    io.to(code).emit('commitment_progress', {
      submitted: room.commitments.length,
      total: room.participants.length,
    });
  });

  // ── finish_closure ─────────────────────────────────────────────────────────
  // Host advances from CLOSURE to SUMMARY
  socket.on('finish_closure', ({ code }) => {
    const room = rooms[code];
    if (!room || room.hostSocketId !== socket.id) return;
    if (room.state !== STATE.CLOSURE) return;

    room.state = STATE.SUMMARY;
    globalStats.sessionsCompleted += 1;
    saveStats(globalStats);

    io.to(code).emit('game_state_change', { state: STATE.SUMMARY });
    io.to(code).emit('journey_book', buildJourneyBook(room));
  });

  // ── disconnect ─────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[-] ${socket.id}`);
    for (const code of Object.keys(rooms)) {
      const room = rooms[code];
      const idx = room.participants.findIndex((p) => p.socketId === socket.id);
      if (idx === -1) continue;
      room.participants.splice(idx, 1);
      if (room.hostSocketId === socket.id) {
        io.to(code).emit('room_closed', { message: 'Host left' });
        delete rooms[code];
      } else {
        io.to(code).emit('room_update', buildRoomSnapshot(room));
      }
      break;
    }
  });
});

// ----------------------------------------------------------------------------
// Analytics
// ----------------------------------------------------------------------------
const ANALYTICS_FILE = path.join(__dirname, 'analytics.json');
function loadAnalytics() {
  const defaults = {
    events: [],
    totals: {},
    languages: {},
  };
  try { return { ...defaults, ...JSON.parse(fs.readFileSync(ANALYTICS_FILE, 'utf8')) }; }
  catch { return defaults; }
}
function saveAnalytics(a) {
  try { fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(a, null, 2)); } catch (_) {}
}
let analytics = loadAnalytics();

// ----------------------------------------------------------------------------
// HTTP endpoints
// ----------------------------------------------------------------------------
app.get('/', (_req, res) => res.json({ ok: true, name: 'Travelteling', mode: 'reflective' }));
app.get('/health', (_req, res) => res.json({ ok: true, rooms: Object.keys(rooms).length, stats: globalStats }));
app.get('/stats',  (_req, res) => res.json(globalStats));
app.get('/categories', (_req, res) => res.json(CATEGORY_META));
app.get('/analytics', (_req, res) => {
  const { events, ...summary } = analytics;
  res.json({ ...summary, recentEventCount: events.length });
});

server.listen(PORT, () => console.log(`\n🌅 Travelteling — Reflective Journey running on port ${PORT}\n`));
