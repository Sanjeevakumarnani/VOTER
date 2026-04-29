/**
 * @fileoverview Quiz Management Module for VoteWise AI
 * 
 * Manages all quiz state, question rendering, and scoring logic.
 * No API calls or generic UI code allowed in this module.
 * 
 * Responsibilities:
 * - Track quiz state (current question, score, answered status)
 * - Render quiz questions and answer options
 * - Handle answer selection and scoring
 * - Calculate and display final results
 * - Reset quiz for retry
 * 
 * @module quizManager
 * @version 1.0.0
 */

'use strict';

import {
  MAX_QUIZ_QUESTIONS,
  QUIZ_LETTERS,
  QUIZ_SCORE_THRESHOLDS,
  QUIZ_FEEDBACK,
} from './constants.js';

import { escapeHTML, showSection, setSRStatus } from './uiManager.js';

// ── Private State ──────────────────────────────────────
/** @type {Array<Object>} Quiz questions array */
let _questions = [];

/** @type {number} Current question index (0-based) */
let _currentIndex = 0;

/** @type {number} Current score (number of correct answers) */
let _score = 0;

/** @type {boolean} Whether current question has been answered */
let _answered = false;

/** @type {Function|null} Callback when quiz completes */
let _onCompleteCallback = null;

/** @type {Function|null} Callback when answer is selected */
let _onAnswerCallback = null;

// ── Private Functions ──────────────────────────────────
/**
 * Gets current question data
 * @returns {Object|null} Current question or null if quiz ended
 * @private
 */
function _getCurrentQuestion() {
  if (_currentIndex >= _questions.length) {
    return null;
  }
  return _questions[_currentIndex];
}

/**
 * Calculates percentage score
 * @returns {number} Score percentage (0-100)
 * @private
 */
function _calculatePercentage() {
  if (_questions.length === 0) {
    return 0;
  }
  return Math.round((_score / _questions.length) * 100);
}

/**
 * Determines feedback based on percentage
 * @param {number} percentage - Score percentage
 * @returns {{emoji: string, message: string}} Feedback object
 * @private
 */
function _getFeedbackForScore(percentage) {
  if (percentage >= QUIZ_SCORE_THRESHOLDS.EXCELLENT) {
    return QUIZ_FEEDBACK.EXCELLENT;
  }
  if (percentage >= QUIZ_SCORE_THRESHOLDS.GOOD) {
    return QUIZ_FEEDBACK.GOOD;
  }
  return QUIZ_FEEDBACK.NEEDS_IMPROVEMENT;
}

/**
 * Generates HTML for answer options
 * @param {string[]} options - Array of option texts
 * @param {number} correctIndex - Index of correct answer
 * @returns {string} HTML string for options
 * @private
 */
function _generateOptionsHtml(options, correctIndex) {
  return options
    .map((option, index) => {
      const letter = QUIZ_LETTERS[index];
      const escapedOption = escapeHTML(option);
      return `
        <li>
          <button
            class="option-btn"
            data-index="${index}"
            data-correct="${index === correctIndex}"
            aria-label="Option ${letter}: ${escapedOption}"
          >
            <span class="option-letter" aria-hidden="true">${letter}</span>
            ${escapedOption}
          </button>
        </li>
      `;
    })
    .join('');
}

// ── Public API ─────────────────────────────────────────
/**
 * Initializes the quiz with questions
 * @param {Array<Object>} questions - Array of question objects
 * @param {object} [callbacks={}] - Optional callbacks
 * @param {Function} [callbacks.onComplete] - Called when quiz ends (receives final score)
 * @param {Function} [callbacks.onAnswer] - Called when answer selected (receives isCorrect, explanation)
 * @returns {void}
 * @example
 * initQuiz(quizData.questions, {
 *   onComplete: (score, total) => showResults(score, total),
 *   onAnswer: (isCorrect, explanation) => showExplanation(explanation)
 * });
 */
export function initQuiz(questions, callbacks = {}) {
  _questions = questions.slice(0, MAX_QUIZ_QUESTIONS);
  _currentIndex = 0;
  _score = 0;
  _answered = false;
  _onCompleteCallback = callbacks.onComplete || null;
  _onAnswerCallback = callbacks.onAnswer || null;
}

/**
 * Gets current quiz state
 * @returns {{currentIndex: number, totalQuestions: number, score: number, answered: boolean, currentQuestion?: Object}} Current state
 * @example
 * const state = getQuizState();
 * updateProgressBar(state.currentIndex, state.totalQuestions);
 */
export function getQuizState() {
  return {
    currentIndex: _currentIndex,
    totalQuestions: _questions.length,
    score: _score,
    answered: _answered,
    currentQuestion: _getCurrentQuestion(),
  };
}

/**
 * Renders the current question UI
 * @returns {{html: string, hasNext: boolean}} HTML string and whether there are more questions
 * @throws {Error} If quiz not initialized
 * @example
 * const result = renderQuestion();
 * document.getElementById('question-container').innerHTML = result.html;
 * updateNextButtonVisibility(result.hasNext);
 */
export function renderQuestion() {
  const question = _getCurrentQuestion();
  
  if (!question) {
    throw new Error('No current question available. Quiz may not be initialized.');
  }
  
  const total = _questions.length;
  const percentage = Math.round(((_currentIndex) / total) * 100);
  const hasNext = _currentIndex + 1 < total;
  
  const optionsHtml = _generateOptionsHtml(question.options, question.answer);
  
  const html = `
    <div class="quiz-progress" role="progressbar" aria-valuenow="${_currentIndex + 1}" aria-valuemin="1" aria-valuemax="${total}">
      <span class="progress-text">Question ${_currentIndex + 1} of ${total}</span>
      <div class="progress-bar" style="width: ${percentage}%"></div>
    </div>
    <p class="question-text">${escapeHTML(question.question)}</p>
    <ul class="options-list" role="radiogroup" aria-label="Answer options">
      ${optionsHtml}
    </ul>
    <div id="answer-explanation" class="answer-explanation" hidden role="alert"></div>
    <div id="next-btn-container" style="margin-top:1rem" hidden>
      <button class="btn-primary" id="next-q-btn" aria-label="${hasNext ? 'Next question' : 'See your score'}">
        ${hasNext ? 'Next Question →' : 'See Score 🎉'}
      </button>
    </div>
  `;
  
  _answered = false;
  
  return { html, hasNext };
}

/**
 * Handles user selecting an answer
 * @param {number} selectedIndex - Index of selected answer (0-3)
 * @returns {{isCorrect: boolean, correctIndex: number, explanation: string}} Result info
 * @throws {Error} If already answered or invalid index
 * @example
 * // Attach to button click:
 * button.addEventListener('click', () => {
 *   const result = handleOptionSelect(index);
 *   highlightCorrectAnswer(result.correctIndex);
 *   showExplanation(result.explanation);
 * });
 */
export function handleOptionSelect(selectedIndex) {
  if (_answered) {
    throw new Error('Question already answered');
  }
  
  const question = _getCurrentQuestion();
  if (!question) {
    throw new Error('No current question available');
  }
  
  if (selectedIndex < 0 || selectedIndex >= question.options.length) {
    throw new Error('Invalid answer index');
  }
  
  _answered = true;
  
  const correctIndex = question.answer;
  const isCorrect = selectedIndex === correctIndex;
  
  if (isCorrect) {
    _score++;
  }
  
  if (_onAnswerCallback) {
    _onAnswerCallback(isCorrect, question.explanation);
  }
  
  const statusMessage = isCorrect
    ? 'Correct answer!'
    : `Incorrect. The correct answer is option ${QUIZ_LETTERS[correctIndex]}.`;
  setSRStatus(statusMessage);
  
  return {
    isCorrect,
    correctIndex,
    explanation: question.explanation || 'Great question!',
  };
}

/**
 * Moves to next question
 * @returns {{ended: boolean, html?: string, hasNext?: boolean}} Quiz status
 * @example
 * const result = nextQuestion();
 * if (result.ended) {
 *   showFinalResults();
 * } else {
 *   updateQuestionContainer(result.html);
 * }
 */
export function nextQuestion() {
  _currentIndex++;
  
  if (_currentIndex >= _questions.length) {
    return { ended: true };
  }
  
  const renderResult = renderQuestion();
  return {
    ended: false,
    html: renderResult.html,
    hasNext: renderResult.hasNext,
  };
}

/**
 * Generates final results HTML
 * @returns {{html: string, score: number, total: number, percentage: number}} Results data
 * @throws {Error} If quiz not completed
 * @example
 * const result = renderQuizResult();
 * document.getElementById('quiz-result').innerHTML = result.html;
 * announceScore(result.score, result.total);
 */
export function renderQuizResult() {
  if (_currentIndex < _questions.length) {
    throw new Error('Quiz not yet completed');
  }
  
  const total = _questions.length;
  const percentage = _calculatePercentage();
  const feedback = _getFeedbackForScore(percentage);
  
  const html = `
    <div class="quiz-score" aria-label="Your score: ${_score} out of ${total}">
      ${feedback.emoji} ${_score}/${total}
    </div>
    <p class="quiz-score-label">${feedback.message}</p>
    <p class="quiz-percentage">${percentage}% correct</p>
    <button class="quiz-retry-btn" id="retry-quiz-btn" aria-label="Try the quiz again">
      Try Again
    </button>
  `;
  
  setSRStatus(`Quiz complete. You scored ${_score} out of ${total}.`);
  
  if (_onCompleteCallback) {
    _onCompleteCallback(_score, total);
  }
  
  return {
    html,
    score: _score,
    total,
    percentage,
  };
}

/**
 * Resets quiz state for a new attempt
 * @returns {void}
 * @example
 * retryQuiz();
 * showQuizSetup();
 */
export function retryQuiz() {
  _questions = [];
  _currentIndex = 0;
  _score = 0;
  _answered = false;
  _onCompleteCallback = null;
  _onAnswerCallback = null;
}

/**
 * Checks if quiz is in progress
 * @returns {boolean} True if quiz has questions and isn't complete
 * @example
 * if (isQuizInProgress()) {
 *   showResumePrompt();
 * }
 */
export function isQuizInProgress() {
  return _questions.length > 0 && _currentIndex < _questions.length;
}
