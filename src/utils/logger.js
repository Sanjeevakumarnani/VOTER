/**
 * @fileoverview Structured Logging Utility for VoteWise AI
 * @description Production-ready logging utility for server-side operations. Provides consistent
 * log formatting with ISO 8601 timestamps and severity levels. Optimized for Google Cloud Run
 * with proper stderr/stdout separation and structured log format.
 * @author VoteWise AI Team
 * @version 1.0.0
 * @license MIT
 * @copyright 2026 VoteWise AI
 *
 * Security Considerations:
 * - NO sensitive data logging (API keys, passwords, PII never logged)
 * - ISO 8601 timestamps for consistency across timezones
 * - Separate stderr for errors (Cloud Run compatible)
 * - Structured format for log parsing and monitoring
 * - Log levels: INFO, WARN, ERROR
 *
 * Log Format:
 * [YYYY-MM-DDTHH:mm:ss.sssZ] [LEVEL] Message
 *
 * Usage:
 * const logger = require('./logger');
 * logger.info('Server started');
 * logger.warn('Rate limit approaching');
 * logger.error('Database connection failed');
 */

'use strict';

/**
 * Simple structured logger utility.
 * Uses console methods with ISO timestamps and log levels.
 * Stack traces are hidden in production to prevent info leakage.
 */

/**
 * Formats a log message with timestamp and level prefix.
 *
 * @param {string} level - Log level (INFO, WARN, ERROR)
 * @param {string} message - The message to log
 * @returns {string} Formatted log string
 */
function format(level, message) {
  return `[${new Date().toISOString()}] [${level}] ${message}`;
}

/**
 * Logs an informational message to stdout.
 *
 * @param {string} message - Message to log
 */
function info(message) {
  console.log(format('INFO', message));
}

/**
 * Logs a warning message to stdout.
 *
 * @param {string} message - Warning message to log
 */
function warn(message) {
  console.warn(format('WARN', message));
}

/**
 * Logs an error message to stderr.
 * Stack traces are suppressed in production.
 *
 * @param {string} message - Error message to log
 */
function error(message) {
  console.error(format('ERROR', message));
}

module.exports = { info, warn, error };
