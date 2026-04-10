/**
 * SBTI Quiz Engine — Thai Version
 * Handles: screen flow, question rendering, scoring, result computation
 */

// ── State ──────────────────────────────────────────────
const state = {
  currentIndex: 0,
  answers: {},
  compiledQuestions: [],
  result: null
};

// ── Init ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  compileQuestions();
  bindEvents();
});

function compileQuestions() {
  const list = [...QUESTIONS];
  const insertIdx = typeof GATE_INSERT_INDEX !== 'undefined' ? GATE_INSERT_INDEX : 14;
  list.splice(insertIdx, 0, GATE_QUESTIONS[0]);
  state.compiledQuestions = list;
}

// ── Event bindings ─────────────────────────────────────
function bindEvents() {
  document.getElementById('btn-start').addEventListener('click', startQuiz);
  document.getElementById('btn-back').addEventListener('click', goBack);
  document.getElementById('btn-retake').addEventListener('click', retake);
}

// ── Screen switching ───────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

// ── Start quiz ─────────────────────────────────────────
function startQuiz() {
  state.currentIndex = 0;
  state.answers = {};
  state.result = null;
  showScreen('screen-quiz');
  renderQuestion();
}

// ── Render current question ────────────────────────────
function renderQuestion() {
  const q = state.compiledQuestions[state.currentIndex];
  if (!q) return finishQuiz();

  const total = state.compiledQuestions.length;
  const pct = ((state.currentIndex) / total) * 100;

  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-text').textContent =
    (state.currentIndex + 1) + '/' + total;

  const questionArea = document.getElementById('question-area');
  questionArea.classList.remove('fade-in');
  void questionArea.offsetWidth;
  questionArea.classList.add('fade-in');

  document.getElementById('question-text').textContent = q.text;

  // Build options with safe DOM methods
  const container = document.getElementById('options-container');
  container.textContent = '';

  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-card';
    btn.dataset.value = opt.value;

    const span = document.createElement('span');
    span.className = 'option-text';
    span.textContent = opt.text;
    btn.appendChild(span);

    btn.addEventListener('click', () => selectOption(q, opt.value));

    if (state.answers[q.id] === opt.value) {
      btn.classList.add('selected');
    }
    container.appendChild(btn);
  });

  document.getElementById('btn-back').style.visibility =
    state.currentIndex === 0 ? 'hidden' : 'visible';
}

// ── Select an option ───────────────────────────────────
function selectOption(question, value) {
  state.answers[question.id] = value;

  document.querySelectorAll('.option-card').forEach(btn => {
    btn.classList.toggle('selected', Number(btn.dataset.value) === value);
  });

  if (question.id === 'drink_gate_q1') {
    handleGateQ1(value);
  }

  setTimeout(() => {
    state.currentIndex++;

    if (question.id === 'drink_gate_q1' && value === 3) {
      state.compiledQuestions.splice(state.currentIndex, 0, GATE_QUESTIONS[1]);
    }

    if (state.currentIndex >= state.compiledQuestions.length) {
      finishQuiz();
    } else {
      renderQuestion();
    }
  }, 300);
}

function handleGateQ1(value) {
  const gateQ2Idx = state.compiledQuestions.findIndex(q => q.id === 'drink_gate_q2');
  if (gateQ2Idx !== -1) {
    state.compiledQuestions.splice(gateQ2Idx, 1);
    delete state.answers['drink_gate_q2'];
    if (gateQ2Idx <= state.currentIndex) {
      state.currentIndex--;
    }
  }
}

// ── Go back ────────────────────────────────────────────
function goBack() {
  if (state.currentIndex > 0) {
    state.currentIndex--;
    renderQuestion();
  }
}

// ── Finish quiz ────────────────────────────────────────
function finishQuiz() {
  showScreen('screen-loading');
  setTimeout(() => {
    state.result = computeResult();
    renderResult(state.result);
    showScreen('screen-result');
  }, 3000);
}

// ── Retake ─────────────────────────────────────────────
function retake() {
  compileQuestions();
  startQuiz();
}

// ================================================================
// SCORING ALGORITHM
// ================================================================

function sumToLevel(score) {
  if (score <= 3) return 'L';
  if (score === 4) return 'M';
  return 'H';
}

function levelNum(level) {
  return { L: 1, M: 2, H: 3 }[level];
}

function parsePattern(pattern) {
  return pattern.replace(/-/g, '').split('');
}

function computeResult() {
  const rawScores = {};
  DIMENSION_ORDER.forEach(dim => { rawScores[dim] = 0; });

  state.compiledQuestions.forEach(q => {
    if (q.dim && state.answers[q.id] != null) {
      rawScores[q.dim] += Number(state.answers[q.id]);
    }
  });

  const levels = {};
  Object.entries(rawScores).forEach(([dim, score]) => {
    levels[dim] = sumToLevel(score);
  });

  const userVector = DIMENSION_ORDER.map(dim => levelNum(levels[dim]));

  const ranked = PERSONALITY_TYPES.map(type => {
    const typeVector = parsePattern(type.pattern).map(l => levelNum(l));
    let distance = 0;
    let exact = 0;

    for (let i = 0; i < typeVector.length; i++) {
      const diff = Math.abs(userVector[i] - typeVector[i]);
      distance += diff;
      if (diff === 0) exact++;
    }

    const similarity = Math.max(0, Math.round((1 - distance / 30) * 100));
    return Object.assign({}, type, { distance: distance, exact: exact, similarity: similarity });
  }).sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance;
    if (b.exact !== a.exact) return b.exact - a.exact;
    return b.similarity - a.similarity;
  });

  const bestNormal = ranked[0];
  const drunkTriggered = state.answers['drink_gate_q2'] === 2;

  var finalType, badge, sub, special = false, secondaryType = null;

  if (drunkTriggered) {
    finalType = SPECIAL_TYPES['DRUNK'];
    secondaryType = bestNormal;
    badge = '\u0e41\u0e21\u0e15\u0e0a\u0e4c 100% \u00b7 \u0e1b\u0e31\u0e08\u0e08\u0e31\u0e22\u0e41\u0e2d\u0e25\u0e01\u0e2d\u0e2e\u0e2d\u0e25\u0e4c\u0e40\u0e02\u0e49\u0e32\u0e04\u0e27\u0e1a\u0e04\u0e38\u0e21\u0e41\u0e25\u0e49\u0e27';
    sub = '';
    special = true;
  } else if (bestNormal.similarity < 60) {
    finalType = SPECIAL_TYPES['555+'];
    badge = '\u0e41\u0e21\u0e15\u0e0a\u0e4c\u0e2a\u0e39\u0e07\u0e2a\u0e38\u0e14\u0e41\u0e04\u0e48 ' + bestNormal.similarity + '%';
    sub = '';
    special = true;
  } else {
    finalType = bestNormal;
    badge = '\u0e41\u0e21\u0e15\u0e0a\u0e4c ' + bestNormal.similarity + '% \u00b7 \u0e15\u0e23\u0e07 ' + bestNormal.exact + '/15 \u0e21\u0e34\u0e15\u0e34';
    sub = '';
  }

  return {
    rawScores: rawScores,
    levels: levels,
    ranked: ranked,
    bestNormal: bestNormal,
    finalType: finalType,
    badge: badge,
    sub: sub,
    special: special,
    secondaryType: secondaryType
  };
}

// ================================================================
// RENDER RESULT (safe DOM methods only)
// ================================================================

function renderResult(result) {
  var finalType = result.finalType;
  var badge = result.badge;
  var levels = result.levels;

  document.getElementById('result-type-code').textContent = finalType.code;
  document.getElementById('result-type-code-img').textContent = finalType.code;
  document.getElementById('result-type-name').textContent = finalType.thaiName;
  document.getElementById('result-type-intro').textContent = finalType.intro;
  document.getElementById('result-description').textContent = finalType.description;
  document.getElementById('result-match').textContent = badge;

  // Build 15-dimension display with safe DOM
  var dimContainer = document.getElementById('dimensions-container');
  dimContainer.textContent = '';

  DIMENSION_ORDER.forEach(function(dim) {
    var level = levels[dim];
    var meta = DIMENSION_META[dim];
    var levelDesc = DIMENSION_LEVELS[dim][level];

    var item = document.createElement('div');
    item.className = 'dimension-item';

    var header = document.createElement('div');
    header.className = 'dimension-header';

    var nameSpan = document.createElement('span');
    nameSpan.className = 'dimension-name';
    nameSpan.textContent = meta.name;

    var levelSpan = document.createElement('span');
    levelSpan.className = 'dimension-level level-' + level.toLowerCase();
    levelSpan.textContent = level;

    header.appendChild(nameSpan);
    header.appendChild(levelSpan);

    var explanation = document.createElement('p');
    explanation.className = 'dimension-explanation';
    explanation.textContent = levelDesc;

    item.appendChild(header);
    item.appendChild(explanation);
    dimContainer.appendChild(item);
  });
}
