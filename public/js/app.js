/**
 * @fileoverview VoteWise AI — Frontend Application Controller (Thin Orchestrator)
 * 
 * This is the main application entry point. It imports all modules and
 * orchestrates initialization and event binding. No business logic here.
 * 
 * Architecture:
 * - Module pattern with ES6 imports
 * - Single Responsibility: Each module handles one concern
 * - Event-driven initialization
 * 
 * @module app
 * @author VoteWise AI Team
 * @version 1.0.0
 * @since 2026-04-29
 * @requires constants
 * @requires validators
 * @requires cacheManager
 * @requires uiManager
 * @requires apiClient
 * @requires quizManager
 */

'use strict';

import { DEBOUNCE_MS, CACHE_PREFIX } from './constants.js';
import { validateQuestion, validateAddress, validateState, validateDifficulty } from './modules/validators.js';
import { generateExplainerKey, generateVotingStepsKey, generateQuizKey, generateTimelineKey, getCache, setCache } from './modules/cacheManager.js';
import { showToast, setButtonLoading, renderSkeletons, setSRStatus, escapeHTML, showSection, renderExplainerResultHtml, renderTimelineHtml, renderVotingStepsHtml, renderPollingStationsHtml } from './modules/uiManager.js';
import { explainQuestion, loadTimeline, getVotingSteps, startQuiz, findPollingStations } from './modules/apiClient.js';
import { initQuiz, renderQuestion, handleOptionSelect, nextQuestion, renderQuizResult, retryQuiz, getQuizState } from './modules/quizManager.js';

// ── Application State ───────────────────────────────────
/** @type {number|null} Debounce timer ID */
let debounceTimer = null;

// ── Initialization ───────────────────────────────────
document.addEventListener('DOMContentLoaded', initializeApplication);

/**
 * Initializes all application modules and event listeners
 * @returns {void}
 */
function initializeApplication() {
  initNavigation();
  initExplainerFeature();
  initTimelineFeature();
  initVotingGuideFeature();
  initPollingStationFeature();
  initQuizFeature();
  initQuickQuestionChips();
}

// ── Navigation ─────────────────────────────────────────
function initNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  const tabPanels = document.querySelectorAll('.tab-panel');
  
  navLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      switchTab(link.dataset.tab, navLinks, tabPanels);
    });
    
    link.addEventListener('keydown', (event) => {
      const links = [...navLinks];
      const index = links.indexOf(link);
      if (event.key === 'ArrowRight') links[(index + 1) % links.length].focus();
      if (event.key === 'ArrowLeft') links[(index - 1 + links.length) % links.length].focus();
    });
  });
}

function switchTab(targetTab, navLinks, tabPanels) {
  navLinks.forEach((link) => {
    const isActive = link.dataset.tab === targetTab;
    link.classList.toggle('active', isActive);
    link.setAttribute('aria-selected', String(isActive));
  });
  
  tabPanels.forEach((panel) => {
    const isTarget = panel.id === `panel-${targetTab}`;
    panel.classList.toggle('active', isTarget);
    panel.hidden = !isTarget;
  });
  
  const mainContent = document.getElementById('main-content');
  if (mainContent) mainContent.scrollIntoView({ behavior: 'smooth' });
}

// ── Explainer Feature ──────────────────────────────────
function initExplainerFeature() {
  const askButton = document.getElementById('ask-btn');
  const textarea = document.getElementById('question-input');
  const charCount = document.getElementById('char-count');
  
  if (textarea && charCount) {
    textarea.addEventListener('input', () => {
      const length = textarea.value.length;
      charCount.textContent = `${length} / 500`;
      charCount.style.color = length > 450 ? '#F44336' : '';
    });
  }
  
  if (askButton) {
    askButton.addEventListener('click', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(handleExplainerSubmit, DEBOUNCE_MS);
    });
  }
}

async function handleExplainerSubmit() {
  const questionInput = document.getElementById('question-input');
  const levelSelect = document.getElementById('level-select');
  const button = document.getElementById('ask-btn');
  
  const question = questionInput?.value || '';
  const level = levelSelect?.value || 'beginner';
  
  const validation = validateQuestion(question);
  if (!validation.isValid) {
    showToast(validation.error);
    return;
  }
  
  const cacheKey = generateExplainerKey(validation.sanitized, level);
  const cached = getCache(cacheKey);
  if (cached.exists) {
    renderExplainerResult(cached.data);
    return;
  }
  
  setButtonLoading(button, true);
  setSRStatus('Fetching answer from AI...');
  
  try {
    const data = await explainQuestion(validation.sanitized, level);
    setCache(cacheKey, data);
    renderExplainerResult(data);
    setSRStatus('Answer received');
  } catch (error) {
    showToast(error.message);
  } finally {
    setButtonLoading(button, false);
  }
}

function renderExplainerResult(data) {
  const html = renderExplainerResultHtml(data);
  const explanationDiv = document.getElementById('result-explanation');
  const keypointsDiv = document.getElementById('result-keypoints');
  const funfactDiv = document.getElementById('result-funfact');
  const followupDiv = document.getElementById('result-followup');
  
  if (explanationDiv) explanationDiv.innerHTML = html.explanationHtml;
  if (keypointsDiv) keypointsDiv.innerHTML = html.keypointsHtml;
  if (funfactDiv) funfactDiv.innerHTML = html.funfactHtml;
  if (followupDiv) followupDiv.innerHTML = html.followupHtml;
  
  showSection('explainer-result', true, { scroll: true });
}

window.prefillQuestion = function(button) {
  const textarea = document.getElementById('question-input');
  if (textarea) {
    textarea.value = button.textContent.trim();
    textarea.dispatchEvent(new Event('input'));
    textarea.focus();
  }
};

// ── Timeline Feature ───────────────────────────────────
function initTimelineFeature() {
  const loadButton = document.getElementById('load-timeline-btn');
  if (loadButton) {
    loadButton.addEventListener('click', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(handleLoadTimeline, DEBOUNCE_MS);
    });
  }
}

async function handleLoadTimeline() {
  const button = document.getElementById('load-timeline-btn');
  const container = document.getElementById('timeline-container');
  
  const cacheKey = generateTimelineKey();
  const cached = getCache(cacheKey);
  if (cached.exists) {
    renderTimeline(cached.data, container);
    return;
  }
  
  setButtonLoading(button, true);
  setSRStatus('Loading election timeline...');
  container.innerHTML = renderSkeletons(5);
  
  try {
    const data = await loadTimeline();
    setCache(cacheKey, data);
    renderTimeline(data, container);
    setSRStatus('Timeline loaded');
  } catch (error) {
    container.innerHTML = `<p style="color:var(--danger);padding:1rem">${escapeHTML(error.message)}</p>`;
    showToast('Failed to load timeline');
  } finally {
    setButtonLoading(button, false);
  }
}

function renderTimeline(data, container) {
  container.innerHTML = renderTimelineHtml(data);
}

// ── Voting Guide Feature ───────────────────────────────
function initVotingGuideFeature() {
  const getStepsButton = document.getElementById('get-steps-btn');
  if (getStepsButton) {
    getStepsButton.addEventListener('click', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(handleGetVotingSteps, DEBOUNCE_MS);
    });
  }
}

async function handleGetVotingSteps() {
  const voterTypeSelect = document.getElementById('voter-type');
  const stateInput = document.getElementById('state-input');
  const button = document.getElementById('get-steps-btn');
  const container = document.getElementById('voting-steps-container');
  
  const voterType = voterTypeSelect?.value || 'first-time';
  const state = stateInput?.value || 'India';
  
  const stateValidation = validateState(state);
  const effectiveState = stateValidation.isValid ? stateValidation.sanitized : 'India';
  
  const cacheKey = generateVotingStepsKey(voterType, effectiveState);
  const cached = getCache(cacheKey);
  if (cached.exists) {
    renderVotingSteps(cached.data, container);
    return;
  }
  
  setButtonLoading(button, true);
  setSRStatus('Generating your voting guide...');
  container.innerHTML = renderSkeletons(4);
  
  try {
    const data = await getVotingSteps(voterType, effectiveState);
    setCache(cacheKey, data);
    renderVotingSteps(data, container);
    setSRStatus('Voting guide ready');
  } catch (error) {
    container.innerHTML = `<p style="color:var(--danger);padding:1rem">${escapeHTML(error.message)}</p>`;
    showToast('Failed to load voting steps');
  } finally {
    setButtonLoading(button, false);
  }
}

function renderVotingSteps(data, container) {
  container.innerHTML = renderVotingStepsHtml(data);
}

// ── Polling Station Feature ─────────────────────────────
function initPollingStationFeature() {
  const findButton = document.getElementById('find-polling-btn');
  const addressInput = document.getElementById('polling-address-input');
  
  if (findButton) {
    findButton.addEventListener('click', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(handleFindPollingStations, DEBOUNCE_MS);
    });
  }
  
  if (addressInput) {
    addressInput.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(handleFindPollingStations, DEBOUNCE_MS);
      }
    });
  }
}

async function handleFindPollingStations() {
  const addressInput = document.getElementById('polling-address-input');
  const button = document.getElementById('find-polling-btn');
  const stationsList = document.getElementById('polling-stations-list');
  
  const address = addressInput?.value?.trim() || '';
  
  const validation = validateAddress(address);
  if (!validation.isValid) {
    showToast(validation.error);
    return;
  }
  
  setButtonLoading(button, true);
  setSRStatus('Searching for polling stations...');
  
  try {
    const data = await findPollingStations(validation.sanitized);
    renderPollingStations(data.stations, stationsList);
    showSection('polling-results-container', true, { scroll: true });
    setSRStatus(`Found ${data.stations?.length || 0} polling stations`);
  } catch (error) {
    showToast(error.message);
    if (stationsList) {
      stationsList.innerHTML = `<p class="error-message" role="alert">Unable to find polling stations. Please check your address.</p>`;
    }
  } finally {
    setButtonLoading(button, false);
  }
}

function renderPollingStations(stations, container) {
  container.innerHTML = renderPollingStationsHtml(stations);
}

// ── Quiz Feature ─────────────────────────────────────────
function initQuizFeature() {
  const startButton = document.getElementById('start-quiz-btn');
  if (startButton) {
    startButton.addEventListener('click', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(handleStartQuiz, DEBOUNCE_MS);
    });
  }
}

async function handleStartQuiz() {
  const difficultyInput = document.querySelector('input[name="difficulty"]:checked');
  const button = document.getElementById('start-quiz-btn');
  
  const difficulty = difficultyInput?.value || 'easy';
  const validation = validateDifficulty(difficulty);
  const normalizedDifficulty = validation.normalized;
  
  const cacheKey = generateQuizKey(normalizedDifficulty);
  const cached = getCache(cacheKey);
  let quizData;
  
  setButtonLoading(button, true);
  setSRStatus('Loading quiz questions...');
  
  try {
    if (cached.exists) {
      quizData = cached.data;
    } else {
      quizData = await startQuiz(normalizedDifficulty);
      setCache(cacheKey, quizData);
    }
    
    initQuiz(quizData.questions, {
      onComplete: (score, total) => console.log(`Quiz complete: ${score}/${total}`),
      onAnswer: (isCorrect, explanation) => console.log(`Answer: ${isCorrect ? 'Correct' : 'Incorrect'}`),
    });
    
    const { html } = renderQuestion();
    const questionDisplay = document.getElementById('question-display');
    if (questionDisplay) questionDisplay.innerHTML = html;
    
    attachOptionListeners();
    attachNextButtonListener();
    
    showSection('quiz-setup', false);
    showSection('quiz-container', true);
    setSRStatus('Quiz started');
  } catch (error) {
    showToast('Failed to load quiz');
  } finally {
    setButtonLoading(button, false);
  }
}

function attachOptionListeners() {
  document.querySelectorAll('.option-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const index = parseInt(button.dataset.index, 10);
      handleQuizOptionSelect(index);
    });
  });
}

function handleQuizOptionSelect(selectedIndex) {
  try {
    const result = handleOptionSelect(selectedIndex);
    
    document.querySelectorAll('.option-btn').forEach((button, index) => {
      const isCorrect = index === result.correctIndex;
      const isSelected = index === selectedIndex;
      button.disabled = true;
      if (isCorrect) button.classList.add('correct');
      if (isSelected && !isCorrect) button.classList.add('incorrect');
    });
    
    const explanationDiv = document.getElementById('answer-explanation');
    if (explanationDiv) {
      explanationDiv.textContent = result.explanation;
      explanationDiv.hidden = false;
    }
    
    const nextButtonContainer = document.getElementById('next-btn-container');
    if (nextButtonContainer) nextButtonContainer.hidden = false;
  } catch (error) {
    console.error('Error selecting option:', error);
  }
}

function attachNextButtonListener() {
  const nextButton = document.getElementById('next-q-btn');
  if (nextButton) {
    nextButton.addEventListener('click', () => {
      const result = nextQuestion();
      if (result.ended) {
        showQuizResults();
      } else {
        const questionDisplay = document.getElementById('question-display');
        if (questionDisplay) questionDisplay.innerHTML = result.html;
        attachOptionListeners();
        attachNextButtonListener();
      }
    });
  }
}

function showQuizResults() {
  const { html } = renderQuizResult();
  const questionDisplay = document.getElementById('question-display');
  const resultContainer = document.getElementById('quiz-result');
  
  if (questionDisplay) questionDisplay.hidden = true;
  if (resultContainer) {
    resultContainer.innerHTML = html;
    resultContainer.hidden = false;
  }
  
  const retryButton = document.getElementById('retry-quiz-btn');
  if (retryButton) {
    retryButton.addEventListener('click', handleRetryQuiz);
  }
}

function handleRetryQuiz() {
  retryQuiz();
  showSection('quiz-setup', true);
  showSection('quiz-container', false);
  showSection('quiz-result', false);
  showSection('question-display', true);
}

// ── Quick Question Chips ──────────────────────────────────
function initQuickQuestionChips() {
  const chips = document.querySelectorAll('.chip');
  const textarea = document.getElementById('question-input');
  
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      if (textarea) {
        textarea.value = chip.dataset.q || '';
        textarea.dispatchEvent(new Event('input'));
        textarea.focus();
      }
    });
  });
}
