/**
 * @fileoverview Input Validation Module for VoteWise AI
 * 
 * Provides comprehensive input validation for all user inputs.
 * Ensures data integrity and prevents invalid data from reaching APIs.
 * 
 * Responsibilities:
 * - Validate question input length and type
 * - Validate address format for polling station search
 * - Validate state name format
 * - Validate quiz answers are within valid range
 * 
 * @module validators
 * @version 1.0.0
 */

'use strict';

import {
  MAX_QUESTION_LENGTH,
  MIN_ADDRESS_LENGTH,
  MAX_STATE_LENGTH,
  MAX_QUIZ_QUESTIONS,
} from './constants.js';

// ── Private State ──────────────────────────────────────
/** @type {RegExp} Pattern for valid state names (letters and spaces only) */
const _stateNamePattern = /^[a-zA-Z\s]+$/;

/** @type {RegExp} Pattern for dangerous HTML characters */
const _dangerousCharsPattern = /[<>'"]/;

// ── Private Functions ──────────────────────────────────
/**
 * Checks if input contains HTML injection attempts
 * @param {string} input - Raw input string
 * @returns {boolean} True if input is safe
 * @private
 */
function _isSafeFromInjection(input) {
  return !_dangerousCharsPattern.test(input);
}

/**
 * Trims and normalizes input string
 * @param {string} input - Raw input
 * @returns {string} Normalized input
 * @private
 */
function _normalizeInput(input) {
  return input.trim().replace(/\s+/g, ' ');
}

// ── Public API ─────────────────────────────────────────
/**
 * Validates a question input for the AI explainer
 * @param {string} question - User's question about elections
 * @returns {{isValid: boolean, error?: string, sanitized?: string}} Validation result
 * @example
 * const result = validateQuestion('What is voting age?');
 * if (result.isValid) {
 *   await explainQuestion(result.sanitized);
 * }
 */
export function validateQuestion(question) {
  if (typeof question !== 'string') {
    return { isValid: false, error: 'Question must be text' };
  }

  const normalized = _normalizeInput(question);

  if (normalized.length === 0) {
    return { isValid: false, error: 'Please enter a question' };
  }

  if (normalized.length < MIN_ADDRESS_LENGTH) {
    return { isValid: false, error: `Question must be at least ${MIN_ADDRESS_LENGTH} characters` };
  }

  if (normalized.length > MAX_QUESTION_LENGTH) {
    return { isValid: false, error: `Question cannot exceed ${MAX_QUESTION_LENGTH} characters` };
  }

  if (!_isSafeFromInjection(normalized)) {
    return { isValid: false, error: 'Question contains invalid characters' };
  }

  return { isValid: true, sanitized: normalized };
}

/**
 * Validates an address for polling station search
 * @param {string} address - User's address or location
 * @returns {{isValid: boolean, error?: string, sanitized?: string}} Validation result
 * @example
 * const result = validateAddress('123 Main St, Delhi');
 * if (result.isValid) {
 *   await findPollingStations(result.sanitized);
 * }
 */
export function validateAddress(address) {
  if (typeof address !== 'string') {
    return { isValid: false, error: 'Address must be text' };
  }

  const normalized = _normalizeInput(address);

  if (normalized.length === 0) {
    return { isValid: false, error: 'Please enter an address' };
  }

  if (normalized.length < MIN_ADDRESS_LENGTH) {
    return { isValid: false, error: `Address must be at least ${MIN_ADDRESS_LENGTH} characters` };
  }

  if (!_isSafeFromInjection(normalized)) {
    return { isValid: false, error: 'Address contains invalid characters' };
  }

  return { isValid: true, sanitized: normalized };
}

/**
 * Validates a state name
 * @param {string} stateName - Indian state or territory name
 * @returns {{isValid: boolean, error?: string, sanitized?: string}} Validation result
 * @example
 * const result = validateState('Maharashtra');
 * if (result.isValid) {
 *   await getVotingSteps(result.sanitized);
 * }
 */
export function validateState(stateName) {
  if (typeof stateName !== 'string') {
    return { isValid: false, error: 'State name must be text' };
  }

  const normalized = _normalizeInput(stateName);

  if (normalized.length === 0) {
    return { isValid: true, sanitized: 'India' };
  }

  if (normalized.length > MAX_STATE_LENGTH) {
    return { isValid: false, error: `State name cannot exceed ${MAX_STATE_LENGTH} characters` };
  }

  if (!_stateNamePattern.test(normalized)) {
    return { isValid: false, error: 'State name can only contain letters and spaces' };
  }

  return { isValid: true, sanitized: normalized };
}

/**
 * Validates a quiz answer selection
 * @param {number} selectedIndex - Index of selected answer (0-3)
 * @param {number} totalOptions - Total number of options available
 * @returns {{isValid: boolean, error?: string}} Validation result
 * @example
 * const result = validateQuizAnswer(2, 4);
 * if (result.isValid) {
 *   processAnswer(selectedIndex);
 * }
 */
export function validateQuizAnswer(selectedIndex, totalOptions) {
  if (typeof selectedIndex !== 'number' || !Number.isInteger(selectedIndex)) {
    return { isValid: false, error: 'Answer must be a valid number' };
  }

  if (selectedIndex < 0 || selectedIndex >= totalOptions) {
    return { isValid: false, error: 'Please select a valid answer option' };
  }

  return { isValid: true };
}

/**
 * Validates quiz difficulty level
 * @param {string} difficulty - Selected difficulty ('easy', 'medium', 'hard')
 * @returns {{isValid: boolean, normalized: string}} Validation result with normalized value
 * @example
 * const result = validateDifficulty('easy');
 * await startQuiz(result.normalized);
 */
export function validateDifficulty(difficulty) {
  const validDifficulties = ['easy', 'medium', 'hard'];
  const normalized = String(difficulty).toLowerCase().trim();

  if (validDifficulties.includes(normalized)) {
    return { isValid: true, normalized };
  }

  return { isValid: true, normalized: 'easy' };
}
