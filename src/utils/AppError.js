/**
 * @fileoverview Custom error classes for VoteWise AI.
 * Provides structured error handling with error codes and 
 * user-friendly messages separate from technical details.
 * 
 * @module AppError
 * @version 1.0.0
 */

'use strict';

/**
 * Base application error with error code support.
 * @extends Error
 */
class AppError extends Error {
  /**
   * Creates an AppError instance.
   * @param {string} message - Technical error message for logging
   * @param {string} code - Machine-readable error code
   * @param {number} statusCode - HTTP status code (default: 500)
   * @param {string} userMessage - Safe message to show the user
   */
  constructor(message, code, statusCode = 500, userMessage = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.userMessage = userMessage || 'Something went wrong. Please try again.';
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Error for invalid user input.
 * @extends AppError
 */
class ValidationError extends AppError {
  /**
   * @param {string} message - What validation failed
   * @param {string} field - Which field failed validation
   */
  constructor(message, field) {
    super(message, 'VALIDATION_ERROR', 400, message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Error for external API failures.
 * @extends AppError
 */
class APIError extends AppError {
  /**
   * @param {string} message - Technical API error details
   * @param {string} service - Which Google service failed
   */
  constructor(message, service) {
    super(message, 'API_ERROR', 502, 
      `${service} is temporarily unavailable. Please try again.`);
    this.name = 'APIError';
    this.service = service;
  }
}

module.exports = { AppError, ValidationError, APIError };
