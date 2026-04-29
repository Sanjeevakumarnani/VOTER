/**
 * @fileoverview Input sanitization utilities for VoteWise AI.
 * Prevents XSS and injection attacks on all user inputs.
 * Implements comprehensive input cleaning and validation.
 * 
 * @module sanitizer
 * @author VoteWise AI Team
 * @version 1.0.0
 * @since 2026-04-29
 * @requires logger
 */

'use strict';

const logger = require('./logger');

/** @constant {RegExp} HTML_TAG_REGEX - Pattern to match HTML tags */
const HTML_TAG_REGEX = /<[^>]*>/g;

/** @constant {RegExp} DANGEROUS_CHARS_REGEX - Pattern to match dangerous characters */
const DANGEROUS_CHARS_REGEX = /[<>'`]/g;

/** @constant {RegExp} WHITESPACE_REGEX - Pattern to match excessive whitespace */
const WHITESPACE_REGEX = /\s+/g;

/**
 * Sanitizes user input by removing dangerous HTML characters.
 * Prevents XSS attacks by stripping tags and special characters.
 *
 * @param {string} input - Raw user input string
 * @returns {string} Sanitized string safe for processing
 * @throws {TypeError} When input is not a string
 * @example
 * sanitizeInput('<script>alert("xss")</script>Hello');
 * // Returns: 'Hello'
 */
function sanitizeInput(input) {
  if (input === null || input === undefined) {
    return '';
  }
  
  if (typeof input !== 'string') {
    logger.warn(`sanitizeInput received non-string type: ${typeof input}`);
    return '';
  }
  
  return input
    .replace(HTML_TAG_REGEX, '')
    .replace(DANGEROUS_CHARS_REGEX, '')
    .replace(WHITESPACE_REGEX, ' ')
    .trim();
}

/**
 * Sanitizes HTML for safe DOM insertion by escaping special characters.
 * Use this when inserting user content into the DOM.
 *
 * @param {string} input - Raw user input string
 * @returns {string} HTML-escaped string safe for DOM insertion
 * @example
 * escapeHtml('<script>alert(1)</script>');
 * // Returns: '&lt;script&gt;alert(1)&lt;/script&gt;'
 */
function escapeHtml(input) {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validates and sanitizes an email address.
 *
 * @param {string} email - Email address to validate
 * @returns {string|null} Sanitized email or null if invalid
 */
function sanitizeEmail(email) {
  if (typeof email !== 'string') {
    return null;
  }
  
  const sanitized = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(sanitized)) {
    return null;
  }
  
  return sanitized;
}

/**
 * Sanitizes a URL to prevent open redirects and malicious links.
 *
 * @param {string} url - URL to sanitize
 * @returns {string|null} Sanitized URL or null if invalid/unsafe
 */
function sanitizeUrl(url) {
  if (typeof url !== 'string') {
    return null;
  }
  
  const trimmed = url.trim();
  
  // Only allow http and https protocols
  const allowedProtocols = ['http:', 'https:'];
  try {
    const parsed = new URL(trimmed);
    if (!allowedProtocols.includes(parsed.protocol)) {
      return null;
    }
    return trimmed;
  } catch {
    return null;
  }
}

/**
 * Truncates text to a maximum length with ellipsis.
 *
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength) {
  if (typeof text !== 'string') {
    return '';
  }
  
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength - 3) + '...';
}

module.exports = {
  sanitizeInput,
  escapeHtml,
  sanitizeEmail,
  sanitizeUrl,
  truncateText,
  HTML_TAG_REGEX,
  DANGEROUS_CHARS_REGEX,
};
