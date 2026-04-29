/**
 * @fileoverview VoteWise AI Frontend Application
 * @description Single-page application (SPA) frontend for the election education assistant.
 * Handles tab navigation, API communication, quiz logic, UI rendering, and accessibility features.
 * Integrates with Google Gemini API for AI content, Google Maps for polling stations,
 * and provides comprehensive keyboard navigation and screen reader support.
 * @author VoteWise AI Team
 * @version 1.0.0
 * @license MIT
 * @copyright 2026 VoteWise AI
 *
 * Features:
 * - Tab-based navigation with 5 panels (Ask AI, Timeline, Voting, Polling, Quiz)
 * - Debounced API calls with loading states to prevent spam
 * - SessionStorage caching for performance optimization
 * - Full keyboard navigation support (Tab, Enter, Arrow keys)
 * - Screen reader compatibility with ARIA live regions
 * - XSS protection through HTML escaping
 * - Responsive design for mobile and desktop
 * - Progressive enhancement with graceful degradation
 *
 * Accessibility (a11y):
 * - ARIA labels on all interactive elements
 * - aria-live regions for dynamic content updates
 * - Keyboard-only navigation support
 * - Focus management and visible focus indicators
 * - Semantic HTML structure
 * - Skip links for keyboard users
 *
 * Performance:
 * - Debounced input handling (300ms)
 * - SessionStorage-based response caching
 * - Lazy loading for map iframe
 * - Skeleton loaders for perceived performance
 */

'use strict';

/** Simple frontend logger - only logs in development mode */
const logger = {
  info: (msg) => { if (window.location.hostname === 'localhost') console.log(`[INFO] ${msg}`); },
  warn: (msg) => { if (window.location.hostname === 'localhost') console.warn(`[WARN] ${msg}`); },
  error: (msg) => console.error(`[ERROR] ${msg}`),
};

/** Cache prefix for sessionStorage keys */
const CACHE_PREFIX = 'votewise_';

/** Debounce timer reference */
let debounceTimer = null;

/** Quiz state */
const quizState = {
  questions: [],
  currentIndex: 0,
  score: 0,
  answered: false,
};

// ─────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initExplainer();
  initLevelSelector();
  initToggleGroups();
  initTimeline();
  initVotingSteps();
  initPollingStations();
  initQuiz();
});

// ─────────────────────────────────────────────
// TAB NAVIGATION
// ─────────────────────────────────────────────

/**
 * Sets up tab navigation click handlers and keyboard navigation.
 */
function initTabs() {
  const navLinks = document.querySelectorAll('.nav-link');
  const tabPanels = document.querySelectorAll('.tab-panel');

  if (navLinks.length === 0) {
    logger.warn('Navigation links not found');
    return;
  }

  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.dataset.tab;

      // Remove active from all nav links
      navLinks.forEach((l) => {
        l.classList.remove('active');
        l.setAttribute('aria-selected', 'false');
      });

      // Hide all panels
      tabPanels.forEach((p) => {
        p.classList.remove('active');
        p.hidden = true;
      });

      // Activate clicked nav
      link.classList.add('active');
      link.setAttribute('aria-selected', 'true');

      // Show target panel
      const panel = document.getElementById(`panel-${target}`);
      if (panel) {
        panel.classList.add('active');
        panel.hidden = false;
      } else {
        logger.error('Panel not found: panel-' + target);
      }

      // Scroll to main content
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.scrollIntoView({ behavior: 'smooth' });
      }
    });

    /** Arrow key navigation between tabs for accessibility */
    link.addEventListener('keydown', (e) => {
      const tabs = [...navLinks];
      const idx = tabs.indexOf(link);
      if (e.key === 'ArrowRight') tabs[(idx + 1) % tabs.length].focus();
      if (e.key === 'ArrowLeft') tabs[(idx - 1 + tabs.length) % tabs.length].focus();
    });
  });
}

/**
 * Initializes the animated gradient background canvas.
 */
function initBackground() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width, height;
  let particles = [];

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function createParticles() {
    particles = [];
    const count = Math.min(25, Math.floor((width * height) / 30000));
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 150 + 50,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        color: i % 3 === 0 ? 'rgba(102, 126, 234, 0.15)' : i % 3 === 1 ? 'rgba(240, 147, 251, 0.12)' : 'rgba(79, 172, 254, 0.1)'
      });
    }
  }

  function animate() {
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, width, height);

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < -p.radius) p.x = width + p.radius;
      if (p.x > width + p.radius) p.x = -p.radius;
      if (p.y < -p.radius) p.y = height + p.radius;
      if (p.y > height + p.radius) p.y = -p.radius;

      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
      gradient.addColorStop(0, p.color);
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(animate);
  }

  resize();
  createParticles();
  animate();

  window.addEventListener('resize', () => {
    resize();
    createParticles();
  });
}

/**
 * Initializes the level selector buttons.
 */
function initLevelSelector() {
  const levelBtns = document.querySelectorAll('.level-btn');
  const levelSelect = document.getElementById('level-select');

  levelBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      levelBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      if (levelSelect) {
        levelSelect.value = btn.dataset.level;
      }
    });
  });
}

/**
 * Initializes toggle groups for voter type selection.
 */
function initToggleGroups() {
  const toggleGroups = document.querySelectorAll('.toggle-group');

  toggleGroups.forEach((group) => {
    const toggles = group.querySelectorAll('.toggle-btn');
    const select = group.closest('.input-group')?.querySelector('select');

    toggles.forEach((toggle) => {
      toggle.addEventListener('click', () => {
        toggles.forEach((t) => t.classList.remove('active'));
        toggle.classList.add('active');
        if (select) {
          select.value = toggle.dataset.value;
        }
      });
    });
  });
}

// ─────────────────────────────────────────────
// PANEL 1: ASK AI EXPLAINER
// ─────────────────────────────────────────────

/**
 * Initializes the election question explainer feature.
 */
function initExplainer() {
  const textarea = document.getElementById('question-input');
  const charCount = document.getElementById('char-count');
  const askBtn = document.getElementById('ask-btn');
  const chips = document.querySelectorAll('.chip');

  /** Update character counter as user types */
  textarea.addEventListener('input', () => {
    const len = textarea.value.length;
    charCount.textContent = `${len} / 500`;
    charCount.style.color = len > 450 ? '#F44336' : '';
  });

  /** Quick question chips pre-fill the textarea */
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      textarea.value = chip.dataset.q;
      textarea.dispatchEvent(new Event('input'));
      textarea.focus();
    });
  });

  /** Submit button with debounce */
  askBtn.addEventListener('click', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(handleExplainerSubmit, 300);
  });
}

/**
 * Handles the explainer form submission.
 * Checks cache before calling the API.
 */
async function handleExplainerSubmit() {
  const question = document.getElementById('question-input').value.trim();
  const level = document.getElementById('level-select').value;
  const btn = document.getElementById('ask-btn');

  if (!question || question.length < 3) {
    showToast('Please enter a question (at least 3 characters)');
    return;
  }

  const cacheKey = `${CACHE_PREFIX}explain_${btoa(question + level).substring(0, 32)}`;
  const cached = sessionStorage.getItem(cacheKey);

  if (cached) {
    renderExplainerResult(JSON.parse(cached));
    return;
  }

  setButtonLoading(btn, true);
  setSRStatus('Fetching answer from AI...');

  try {
    const data = await apiFetch('/api/explain', 'POST', { question, level });
    sessionStorage.setItem(cacheKey, JSON.stringify(data));
    renderExplainerResult(data);
    setSRStatus('Answer received');
  } catch (err) {
    showToast(err.message || 'Failed to get answer. Please try again.');
  } finally {
    setButtonLoading(btn, false);
  }
}

/**
 * Renders the AI explanation result into the DOM.
 *
 * @param {{ explanation: string, key_points: string[], fun_fact: string, follow_up: string[] }} data
 */
function renderExplainerResult(data) {
  const container = document.getElementById('explainer-result');

  document.getElementById('result-explanation').innerHTML = `
    <div class="result-section-title">Answer</div>
    <p>${escapeHTML(data.explanation || 'No explanation available.')}</p>
  `;

  if (data.key_points && data.key_points.length > 0) {
    document.getElementById('result-keypoints').innerHTML = `
      <div class="result-section-title">Key Points</div>
      <ul class="keypoints-list">
        ${data.key_points.map((p) => `<li>${escapeHTML(p)}</li>`).join('')}
      </ul>
    `;
  } else {
    document.getElementById('result-keypoints').innerHTML = '';
  }

  if (data.fun_fact) {
    document.getElementById('result-funfact').innerHTML = `
      <div class="fun-fact-box">
        <strong>💡 Did you know?</strong> ${escapeHTML(data.fun_fact)}
      </div>
    `;
  }

  if (data.follow_up && data.follow_up.length > 0) {
    document.getElementById('result-followup').innerHTML = `
      <div class="result-section-title">Ask Next</div>
      <div class="followup-chips">
        ${data.follow_up
          .map(
            (q) =>
              `<button class="followup-chip" aria-label="Ask: ${escapeHTML(q)}" onclick="prefillQuestion(this)">${escapeHTML(q)}</button>`
          )
          .join('')}
      </div>
    `;
  }

  container.hidden = false;
  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Pre-fills the question textarea with a follow-up question.
 *
 * @param {HTMLElement} btn - The clicked follow-up chip button
 */
function prefillQuestion(btn) {
  const textarea = document.getElementById('question-input');
  textarea.value = btn.textContent.trim();
  textarea.dispatchEvent(new Event('input'));
  textarea.scrollIntoView({ behavior: 'smooth' });
  textarea.focus();
}

// ─────────────────────────────────────────────
// PANEL 2: ELECTION TIMELINE
// ─────────────────────────────────────────────

/**
 * Initializes the election timeline loader.
 */
function initTimeline() {
  document.getElementById('load-timeline-btn').addEventListener('click', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(handleLoadTimeline, 300);
  });
}

/**
 * Fetches and renders the election timeline from the API.
 * Result is cached for the session.
 */
async function handleLoadTimeline() {
  const btn = document.getElementById('load-timeline-btn');
  const container = document.getElementById('timeline-container');
  const cacheKey = `${CACHE_PREFIX}timeline`;
  const cached = sessionStorage.getItem(cacheKey);

  if (cached) {
    renderTimeline(JSON.parse(cached), container);
    return;
  }

  setButtonLoading(btn, true);
  setSRStatus('Loading election timeline...');
  container.innerHTML = renderSkeletons(5);

  try {
    const data = await apiFetch('/api/timeline', 'GET');
    sessionStorage.setItem(cacheKey, JSON.stringify(data));
    renderTimeline(data, container);
    setSRStatus('Timeline loaded');
  } catch (err) {
    container.innerHTML = `<p style="color:var(--danger);padding:1rem">${escapeHTML(err.message)}</p>`;
    showToast('Failed to load timeline. Please try again.');
  } finally {
    setButtonLoading(btn, false);
  }
}

/**
 * Renders timeline stages into the DOM.
 *
 * @param {{ stages: Array }} data
 * @param {HTMLElement} container
 */
function renderTimeline(data, container) {
  if (!data.stages || data.stages.length === 0) {
    container.innerHTML = '<p style="color:var(--text-secondary)">No timeline data available.</p>';
    return;
  }

  container.innerHTML = `
    <ol class="timeline-list" aria-label="Indian election timeline stages">
      ${data.stages
        .map(
          (stage) => `
        <li class="timeline-item">
          <div class="timeline-dot" aria-hidden="true">${stage.step}</div>
          <div class="timeline-card">
            <div class="timeline-card-header">
              <span class="timeline-emoji" aria-hidden="true">${escapeHTML(stage.icon || '📌')}</span>
              <span class="timeline-title">${escapeHTML(stage.title)}</span>
            </div>
            <p class="timeline-desc">${escapeHTML(stage.description)}</p>
            <span class="timeline-duration" aria-label="Duration: ${escapeHTML(stage.duration)}">⏱ ${escapeHTML(stage.duration)}</span>
          </div>
        </li>
      `
        )
        .join('')}
    </ol>
  `;
}

// ─────────────────────────────────────────────
// PANEL 3: HOW TO VOTE
// ─────────────────────────────────────────────

/**
 * Initializes the voting steps guide feature.
 */
function initVotingSteps() {
  document.getElementById('get-steps-btn').addEventListener('click', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(handleGetVotingSteps, 300);
  });
}

/**
 * Fetches and renders personalized voting steps.
 */
async function handleGetVotingSteps() {
  const voterType = document.getElementById('voter-type').value;
  const state = document.getElementById('state-input').value.trim() || 'India';
  const btn = document.getElementById('get-steps-btn');
  const container = document.getElementById('voting-steps-container');

  const cacheKey = `${CACHE_PREFIX}steps_${voterType}_${state.toLowerCase()}`;
  const cached = sessionStorage.getItem(cacheKey);

  if (cached) {
    renderVotingSteps(JSON.parse(cached), container);
    return;
  }

  setButtonLoading(btn, true);
  setSRStatus('Generating your voting guide...');
  container.innerHTML = renderSkeletons(4);

  try {
    const data = await apiFetch('/api/votingsteps', 'POST', { voterType, state });
    sessionStorage.setItem(cacheKey, JSON.stringify(data));
    renderVotingSteps(data, container);
    setSRStatus('Voting guide ready');
  } catch (err) {
    container.innerHTML = `<p style="color:var(--danger);padding:1rem">${escapeHTML(err.message)}</p>`;
    showToast('Failed to load voting steps. Please try again.');
  } finally {
    setButtonLoading(btn, false);
  }
}

/**
 * Renders voting steps into the DOM.
 *
 * @param {{ steps: Array, important_note: string, helpline: string }} data
 * @param {HTMLElement} container
 */
function renderVotingSteps(data, container) {
  const helpline = data.helpline || '1950';
  const note = data.important_note || '';

  container.innerHTML = `
    <div class="helpline-badge" aria-label="Voter helpline number ${helpline}">
      📞 Voter Helpline: <strong>${escapeHTML(helpline)}</strong>
    </div>
    ${note ? `<div class="voting-note" role="note">📌 ${escapeHTML(note)}</div>` : ''}
    <ol class="voting-steps-list" aria-label="Step-by-step voting guide">
      ${(data.steps || [])
        .map(
          (step, i) => `
        <li class="voting-step">
          <div class="step-number" aria-hidden="true">${i + 1}</div>
          <div class="step-content">
            <div class="step-title">${escapeHTML(step.title)}</div>
            <div class="step-instruction">${escapeHTML(step.instruction)}</div>
            ${step.tip ? `<div class="step-tip">💡 Tip: ${escapeHTML(step.tip)}</div>` : ''}
            ${
              step.documents && step.documents.length > 0
                ? `<div class="step-docs" aria-label="Required documents">
                    ${step.documents.map((d) => `<span class="doc-tag">📄 ${escapeHTML(d)}</span>`).join('')}
                  </div>`
                : ''
            }
          </div>
        </li>
      `
        )
        .join('')}
    </ol>
  `;
}

// ─────────────────────────────────────────────
// PANEL 4: FIND POLLING STATIONS (Google Maps)
// ─────────────────────────────────────────────

/**
 * Initializes the polling station finder feature.
 * Uses Google Maps API to locate nearby polling booths.
 */
function initPollingStations() {
  const findBtn = document.getElementById('find-polling-btn');
  if (!findBtn) return;

  findBtn.addEventListener('click', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(handleFindPollingStations, 300);
  });

  // Allow Enter key to submit
  const addressInput = document.getElementById('polling-address-input');
  if (addressInput) {
    addressInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(handleFindPollingStations, 300);
      }
    });
  }
}

/**
 * Fetches and displays polling stations near the entered address.
 * Integrates with Google Maps API via backend proxy.
 */
async function handleFindPollingStations() {
  const addressInput = document.getElementById('polling-address-input');
  const address = addressInput?.value?.trim();
  const btn = document.getElementById('find-polling-btn');
  const resultsContainer = document.getElementById('polling-results-container');
  const mapIframe = document.getElementById('polling-map-iframe');
  const stationsList = document.getElementById('polling-stations-list');

  if (!address || address.length < 3) {
    showToast('Please enter a valid address (at least 3 characters)');
    return;
  }

  setButtonLoading(btn, true);
  setSRStatus('Searching for polling stations...');

  try {
    const data = await apiFetch(`/api/polling-stations?address=${encodeURIComponent(address)}`, 'GET');

    if (data.error) {
      throw new Error(data.error);
    }

    // Update map
    if (mapIframe && data.mapUrl) {
      mapIframe.src = data.mapUrl;
    }

    // Render stations list
    if (stationsList) {
      renderPollingStations(data.stations, stationsList);
    }

    // Show results
    if (resultsContainer) {
      resultsContainer.hidden = false;
      resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    setSRStatus(`Found ${data.stations?.length || 0} polling stations near ${data.location?.address || address}`);
  } catch (err) {
    showToast(err.message || 'Failed to find polling stations. Please try again.');
    if (stationsList) {
      stationsList.innerHTML = `<p class="error-message" role="alert">Unable to find polling stations. Please check your address and try again.</p>`;
    }
  } finally {
    setButtonLoading(btn, false);
  }
}

/**
 * Renders polling stations into the DOM.
 *
 * @param {Array<{name: string, address: string, distance: string}>} stations - Polling station data
 * @param {HTMLElement} container - Container element
 */
function renderPollingStations(stations, container) {
  if (!stations || stations.length === 0) {
    container.innerHTML = `
      <div class="no-results" role="status">
        <i class="fas fa-circle-info" aria-hidden="true"></i>
        <p>No polling stations found nearby. Try a different address or search on <a href="https://electoralsearch.in" target="_blank" rel="noopener">electoralsearch.in</a></p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <h3 class="stations-heading"><i class="fas fa-map-pin" aria-hidden="true"></i> Nearby Polling Stations</h3>
    <ul class="stations-list" role="list" aria-label="List of nearby polling stations">
      ${stations.map((station, index) => `
        <li class="station-card" role="listitem">
          <div class="station-header">
            <span class="station-number" aria-hidden="true">${index + 1}</span>
            <span class="station-name">${escapeHTML(station.name)}</span>
          </div>
          <p class="station-address">${escapeHTML(station.address)}</p>
          <div class="station-meta">
            <span class="station-distance"><i class="fas fa-location-arrow" aria-hidden="true"></i> ${escapeHTML(station.distance)}</span>
            ${station.rating ? `<span class="station-rating"><i class="fas fa-star" aria-hidden="true"></i> ${station.rating}</span>` : ''}
          </div>
        </li>
      `).join('')}
    </ul>
    <p class="stations-note" role="note">
      <i class="fas fa-info-circle" aria-hidden="true"></i>
      Verify polling station details on the official <a href="https://electoralsearch.in" target="_blank" rel="noopener">Election Commission website</a> before visiting.
    </p>
  `;
}

// ─────────────────────────────────────────────
// PANEL 5: QUIZ
// ─────────────────────────────────────────────

/**
 * Initializes the quiz feature.
 */
function initQuiz() {
  document.getElementById('start-quiz-btn').addEventListener('click', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(handleStartQuiz, 300);
  });
}

/**
 * Fetches quiz questions and starts the quiz session.
 */
async function handleStartQuiz() {
  const difficulty = document.querySelector('input[name="difficulty"]:checked').value;
  const btn = document.getElementById('start-quiz-btn');
  const cacheKey = `${CACHE_PREFIX}quiz_${difficulty}`;
  const cached = sessionStorage.getItem(cacheKey);

  setButtonLoading(btn, true);
  setSRStatus('Loading quiz questions...');

  try {
    let data;
    if (cached) {
      data = JSON.parse(cached);
    } else {
      data = await apiFetch(`/api/quiz?difficulty=${difficulty}`, 'GET');
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
    }

    quizState.questions = data.questions || [];
    quizState.currentIndex = 0;
    quizState.score = 0;
    quizState.answered = false;

    document.getElementById('quiz-setup').hidden = true;
    const quizContainer = document.getElementById('quiz-container');
    quizContainer.hidden = false;

    renderQuestion();
    setSRStatus('Quiz started');
  } catch (err) {
    showToast('Failed to load quiz. Please try again.');
  } finally {
    setButtonLoading(btn, false);
  }
}

/**
 * Renders the current quiz question and answer options.
 */
function renderQuestion() {
  const { questions, currentIndex } = quizState;
  if (currentIndex >= questions.length) {
    renderQuizResult();
    return;
  }

  const q = questions[currentIndex];
  const total = questions.length;
  const pct = Math.round(((currentIndex) / total) * 100);

  document.getElementById('quiz-progress-text').textContent = `Question ${currentIndex + 1} of ${total}`;
  document.getElementById('quiz-progress-fill').style.width = `${pct}%`;
  document.getElementById('quiz-progress-fill').parentElement.setAttribute('aria-valuenow', currentIndex + 1);

  const letters = ['A', 'B', 'C', 'D'];
  document.getElementById('question-display').innerHTML = `
    <p class="question-text">${escapeHTML(q.question)}</p>
    <ul class="options-list" role="list">
      ${(q.options || [])
        .map(
          (opt, i) => `
        <li>
          <button
            class="option-btn"
            data-index="${i}"
            aria-label="Option ${letters[i]}: ${escapeHTML(opt)}"
          >
            <span class="option-letter" aria-hidden="true">${letters[i]}</span>
            ${escapeHTML(opt)}
          </button>
        </li>
      `
        )
        .join('')}
    </ul>
    <div id="answer-explanation" class="answer-explanation" hidden></div>
    <div id="next-btn-container" style="margin-top:1rem" hidden>
      <button class="btn-primary" id="next-q-btn" aria-label="${currentIndex + 1 < total ? 'Next question' : 'See your score'}">
        ${currentIndex + 1 < total ? 'Next Question →' : 'See Score 🎉'}
      </button>
    </div>
  `;

  quizState.answered = false;

  document.querySelectorAll('.option-btn').forEach((btn) => {
    btn.addEventListener('click', () => handleOptionSelect(btn, q));
  });

  const nextBtn = document.getElementById('next-q-btn');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      quizState.currentIndex++;
      renderQuestion();
    });
  }
}

/**
 * Handles the user selecting an answer option.
 *
 * @param {HTMLElement} selectedBtn - The clicked option button
 * @param {{ answer: number, explanation: string }} question - Current question
 */
function handleOptionSelect(selectedBtn, question) {
  if (quizState.answered) return;
  quizState.answered = true;

  const selectedIndex = parseInt(selectedBtn.dataset.index, 10);
  const correct = question.answer;
  const isCorrect = selectedIndex === correct;

  if (isCorrect) quizState.score++;

  document.querySelectorAll('.option-btn').forEach((btn, i) => {
    btn.disabled = true;
    if (i === correct) btn.classList.add('correct');
    if (i === selectedIndex && !isCorrect) btn.classList.add('incorrect');
  });

  const explanationEl = document.getElementById('answer-explanation');
  explanationEl.textContent = question.explanation || 'Great question!';
  explanationEl.hidden = false;

  document.getElementById('next-btn-container').hidden = false;
  setSRStatus(isCorrect ? 'Correct answer!' : `Incorrect. The correct answer is option ${['A','B','C','D'][correct]}.`);
}

/**
 * Renders the final quiz score result screen.
 */
function renderQuizResult() {
  const { score, questions } = quizState;
  const total = questions.length;
  const pct = Math.round((score / total) * 100);
  const emoji = pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '📚';
  const msg = pct >= 80 ? 'Excellent! You know your elections!' : pct >= 60 ? 'Good job! Keep learning.' : 'Keep studying — elections matter!';

  document.getElementById('question-display').hidden = true;
  document.getElementById('quiz-progress-fill').style.width = '100%';

  const resultEl = document.getElementById('quiz-result');
  resultEl.innerHTML = `
    <div class="quiz-score" aria-label="Your score: ${score} out of ${total}">${emoji} ${score}/${total}</div>
    <p class="quiz-score-label">${msg}</p>
    <button class="quiz-retry-btn" onclick="retryQuiz()" aria-label="Try the quiz again">Try Again</button>
  `;
  resultEl.hidden = false;
  setSRStatus(`Quiz complete. You scored ${score} out of ${total}.`);
}

/**
 * Resets the quiz to the setup screen.
 */
function retryQuiz() {
  document.getElementById('quiz-setup').hidden = false;
  document.getElementById('quiz-container').hidden = true;
  document.getElementById('quiz-result').hidden = true;
  document.getElementById('question-display').hidden = false;
  quizState.questions = [];
  quizState.currentIndex = 0;
  quizState.score = 0;
}

// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────

/**
 * Makes a fetch request to the VoteWise AI API.
 *
 * @param {string} url - API endpoint path
 * @param {'GET'|'POST'} method - HTTP method
 * @param {object} [body] - Request body for POST requests
 * @returns {Promise<object>} Parsed JSON response
 * @throws {Error} On network failure or non-2xx response
 */
async function apiFetch(url, method, body) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body && method === 'POST') {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

/**
 * Toggles loading state on a button.
 *
 * @param {HTMLButtonElement} btn - The button element
 * @param {boolean} loading - Whether to show loading state
 */
function setButtonLoading(btn, loading) {
  const content = btn.querySelector('.btn-content');
  const spinner = btn.querySelector('.btn-spinner');
  btn.disabled = loading;
  btn.setAttribute('aria-busy', loading.toString());
  if (content) content.hidden = loading;
  if (spinner) spinner.hidden = !loading;
}

/**
 * Shows a toast notification for a short duration.
 *
 * @param {string} message - Message to display
 * @param {number} [duration=3000] - Duration in milliseconds
 */
function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast');
  const messageEl = document.getElementById('toast-message');
  if (toast && messageEl) {
    messageEl.textContent = message;
    toast.hidden = false;
    setTimeout(() => { toast.hidden = true; }, duration);
  }
}

/**
 * Updates the screen reader live region with a status message.
 *
 * @param {string} message - Status message for assistive technology
 */
function setSRStatus(message) {
  const el = document.getElementById('sr-status');
  if (el) el.textContent = message;
}

/**
 * Escapes HTML special characters to prevent XSS in rendered content.
 *
 * @param {string} str - String to escape
 * @returns {string} HTML-safe string
 */
function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Renders a set of skeleton loading placeholders.
 *
 * @param {number} count - Number of skeleton rows to render
 * @returns {string} HTML string with skeleton elements
 */
function renderSkeletons(count) {
  return Array.from({ length: count })
    .map(
      () => `
    <div style="padding:1rem;margin-bottom:0.75rem;background:var(--bg-card);border-radius:var(--radius-md)">
      <div class="skeleton" style="width:60%;height:16px;margin-bottom:10px"></div>
      <div class="skeleton" style="width:90%"></div>
      <div class="skeleton" style="width:75%"></div>
    </div>
  `
    )
    .join('');
}
