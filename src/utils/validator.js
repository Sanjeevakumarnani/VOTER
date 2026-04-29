/**
 * @fileoverview Input Validation and Sanitization Utility for VoteWise AI
 * @description Comprehensive input sanitization and validation utilities for all user inputs.
 * Prevents XSS attacks, injection attempts, and ensures data integrity across the application.
 * Implements defense-in-depth security with multiple validation layers.
 * @author VoteWise AI Team
 * @version 1.0.0
 * @license MIT
 * @copyright 2026 VoteWise AI
 *
 * Security Features:
 * - HTML tag stripping to prevent XSS (Cross-Site Scripting)
 * - Special character sanitization (<, >, ", ', `)
 * - Length validation for all inputs (min/max bounds)
 * - Type checking and coercion prevention
 * - Regex-based validation for state names (alphabetic only)
 * - Input normalization (whitespace trimming)
 *
 * Validation Functions:
 * - sanitizeInput(): Strips HTML and dangerous characters
 * - validateQuestion(): Validates election question length (3-500 chars)
 * - validateQuizAnswer(): Validates quiz answer bounds (0-3)
 * - validatePositiveNumber(): Validates positive numeric values
 * - validateStateName(): Validates Indian state name format
 */

'use strict';

/**
 * Sanitizes user input by stripping HTML tags, trimming whitespace,
 * and removing potentially dangerous characters.
 *
 * @param {string} input - Raw user input string
 * @returns {string} Sanitized string safe for use in prompts
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[<>"'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validates a user-submitted election question.
 *
 * @param {string} question - The question to validate
 * @returns {string|null} Error message string if invalid, null if valid
 */
function validateQuestion(question) {
  if (!question || typeof question !== 'string') {
    return 'Question is required.';
  }
  const trimmed = question.trim();
  if (trimmed.length === 0) {
    return 'Question cannot be empty.';
  }
  if (trimmed.length < 3) {
    return 'Question is too short. Please ask a complete question.';
  }
  if (trimmed.length > 500) {
    return 'Question is too long. Please keep it under 500 characters.';
  }
  return null;
}

/**
 * Validates a quiz answer submission.
 *
 * @param {number} questionId - The quiz question ID
 * @param {number} selectedOption - The 0-based index of chosen option
 * @returns {string|null} Error message if invalid, null if valid
 */
function validateQuizAnswer(questionId, selectedOption) {
  if (typeof questionId !== 'number' || questionId < 1) {
    return 'Invalid question ID.';
  }
  if (typeof selectedOption !== 'number' || selectedOption < 0 || selectedOption > 3) {
    return 'Selected option must be between 0 and 3.';
  }
  return null;
}

/**
 * Validates a budget value in Indian Rupees.
 * Used to check numeric range inputs.
 *
 * @param {number} value - The numeric value to validate
 * @returns {boolean} True if valid positive number
 */
function validatePositiveNumber(value) {
  return typeof value === 'number' && !isNaN(value) && value > 0;
}

/**
 * Checks if a given string is a valid Indian state name.
 * Only checks length and character validity, not exhaustive list.
 *
 * @param {string} state - State name to validate
 * @returns {boolean} True if plausibly valid
 */
function validateStateName(state) {
  if (typeof state !== 'string') return false;
  const trimmed = state.trim();
  return trimmed.length >= 2 && trimmed.length <= 50 && /^[a-zA-Z\s]+$/.test(trimmed);
}

module.exports = {
  sanitizeInput,
  validateQuestion,
  validateQuizAnswer,
  validatePositiveNumber,
  validateStateName,
};
