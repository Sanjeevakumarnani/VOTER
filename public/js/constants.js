/**
 * @fileoverview Application-wide constants for VoteWise AI.
 * Centralizes all magic numbers, timeouts, and configuration values.
 * 
 * This module exports all configuration constants used throughout
 * the frontend application to ensure consistency and maintainability.
 * 
 * @module constants
 * @author VoteWise AI Team
 * @version 1.0.0
 * @since 2026-04-29
 */

'use strict';

/** @constant {number} DEBOUNCE_MS - Debounce delay for user input in milliseconds */
export const DEBOUNCE_MS = 300;

/** @constant {number} TOAST_DURATION_MS - Toast notification display duration in milliseconds */
export const TOAST_DURATION_MS = 3000;

/** @constant {number} MAX_QUESTION_LENGTH - Maximum characters for user questions */
export const MAX_QUESTION_LENGTH = 500;

/** @constant {number} MIN_ADDRESS_LENGTH - Minimum characters for address search */
export const MIN_ADDRESS_LENGTH = 3;

/** @constant {number} MAX_STATE_LENGTH - Maximum characters for state name input */
export const MAX_STATE_LENGTH = 50;

/** @constant {number} CACHE_KEY_MAX_LENGTH - Maximum length for cache key generation */
export const CACHE_KEY_MAX_LENGTH = 32;

/** @constant {number} API_TIMEOUT_MS - Maximum wait time for API responses */
export const API_TIMEOUT_MS = 30000;

/** @constant {number} MAX_QUIZ_QUESTIONS - Maximum questions per quiz session */
export const MAX_QUIZ_QUESTIONS = 5;

/** @constant {number} MAX_POLLING_STATIONS - Maximum polling stations to display */
export const MAX_POLLING_STATIONS = 5;

/** @constant {number} SKELETON_COUNT_DEFAULT - Default number of skeleton loaders */
export const SKELETON_COUNT_DEFAULT = 5;

/** @constant {number} CHARACTER_WARNING_THRESHOLD - Percentage at which to warn about character limit */
export const CHARACTER_WARNING_THRESHOLD = 0.9;

/** @constant {string} APP_NAME - Application name */
export const APP_NAME = 'VoteWise AI';

/** @constant {string} APP_VERSION - Current application version */
export const APP_VERSION = '1.0.0';

/** @constant {string} CACHE_PREFIX - Prefix for all sessionStorage keys */
export const CACHE_PREFIX = 'votewise_';

/** @constant {string} DEFAULT_VOTER_TYPE - Default voter type for voting guide */
export const DEFAULT_VOTER_TYPE = 'first-time';

/** @constant {string} DEFAULT_STATE - Default state for voting guide */
export const DEFAULT_STATE = 'India';

/** @constant {string} DEFAULT_DIFFICULTY - Default quiz difficulty level */
export const DEFAULT_DIFFICULTY = 'easy';

/** @constant {string} VOTER_HELPLINE_NUMBER - Official voter helpline */
export const VOTER_HELPLINE_NUMBER = '1950';

/** @constant {string} QUIZ_LETTERS - Letters for quiz options A-D */
export const QUIZ_LETTERS = ['A', 'B', 'C', 'D'];

/** @constant {Object} HTTP_STATUS - HTTP status codes */
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

/** @constant {Object} QUIZ_SCORE_THRESHOLDS - Score thresholds for quiz feedback */
export const QUIZ_SCORE_THRESHOLDS = {
  EXCELLENT: 80,
  GOOD: 60,
};

/** @constant {Object} QUIZ_FEEDBACK - Feedback messages based on score */
export const QUIZ_FEEDBACK = {
  EXCELLENT: { emoji: '🏆', message: 'Excellent! You know your elections!' },
  GOOD: { emoji: '👍', message: 'Good job! Keep learning.' },
  NEEDS_IMPROVEMENT: { emoji: '📚', message: 'Keep studying — elections matter!' },
};
