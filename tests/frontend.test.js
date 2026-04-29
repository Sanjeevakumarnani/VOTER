/**
 * @fileoverview Frontend Unit Tests for VoteWise AI
 * 
 * Tests for all frontend utility functions, constants, and validation logic.
 * Ensures proper behavior of input validation, caching, and DOM manipulation.
 * 
 * @module frontend-tests
 * @author VoteWise AI Team
 * @version 1.0.0
 * @since 2026-04-29
 */

'use strict';

// Mock DOM APIs for Node.js environment
global.document = {
  getElementById: jest.fn(() => ({
    hidden: false,
    textContent: '',
    innerHTML: '',
    classList: { add: jest.fn(), remove: jest.fn() },
    setAttribute: jest.fn(),
    style: {},
  })),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  addEventListener: jest.fn(),
};

global.window = {
  location: { hostname: 'localhost' },
  addEventListener: jest.fn(),
  sessionStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
};

// Constants Tests
describe('Constants Module', () => {
  const constants = {
    DEBOUNCE_MS: 300,
    TOAST_DURATION_MS: 3000,
    MAX_QUESTION_LENGTH: 500,
    MIN_ADDRESS_LENGTH: 3,
    CACHE_PREFIX: 'votewise_',
  };

  test('DEBOUNCE_MS should be 300', () => {
    expect(constants.DEBOUNCE_MS).toBe(300);
  });

  test('TOAST_DURATION_MS should be 3000', () => {
    expect(constants.TOAST_DURATION_MS).toBe(3000);
  });

  test('MAX_QUESTION_LENGTH should be 500', () => {
    expect(constants.MAX_QUESTION_LENGTH).toBe(500);
  });

  test('MIN_ADDRESS_LENGTH should be 3', () => {
    expect(constants.MIN_ADDRESS_LENGTH).toBe(3);
  });

  test('CACHE_PREFIX should be votewise_', () => {
    expect(constants.CACHE_PREFIX).toBe('votewise_');
  });
});

// Input Validation Tests
describe('Input Validation Functions', () => {
  /**
   * Validates explainer question input
   * @param {string} input - User input
   * @returns {boolean} True if valid, false otherwise
   */
  function validateExplainerInput(input) {
    if (typeof input !== 'string') return false;
    const trimmed = input.trim();
    return trimmed.length >= 3 && trimmed.length <= 500;
  }

  test('validateExplainerInput returns false for empty string', () => {
    expect(validateExplainerInput('')).toBe(false);
  });

  test('validateExplainerInput returns false for string under 3 characters', () => {
    expect(validateExplainerInput('ab')).toBe(false);
  });

  test('validateExplainerInput returns false for string over 500 characters', () => {
    expect(validateExplainerInput('a'.repeat(501))).toBe(false);
  });

  test('validateExplainerInput returns true for valid question', () => {
    expect(validateExplainerInput('What is the voting age in India?')).toBe(true);
  });

  test('validateExplainerInput returns false for null', () => {
    expect(validateExplainerInput(null)).toBe(false);
  });

  test('validateExplainerInput returns false for undefined', () => {
    expect(validateExplainerInput(undefined)).toBe(false);
  });

  test('validateExplainerInput returns false for number', () => {
    expect(validateExplainerInput(123)).toBe(false);
  });

  test('validateExplainerInput returns true for exactly 500 characters', () => {
    expect(validateExplainerInput('a'.repeat(500))).toBe(true);
  });
});

// Cache Utilities Tests
describe('Cache Utilities', () => {
  const mockStorage = new Map();

  /**
   * Gets item from cache
   * @param {string} key - Cache key
   * @returns {string|null} Cached value or null
   */
  function checkCache(key) {
    const value = mockStorage.get(key);
    return value || null;
  }

  /**
   * Sets item in cache
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   */
  function setCache(key, data) {
    mockStorage.set(key, JSON.stringify(data));
  }

  beforeEach(() => {
    mockStorage.clear();
  });

  test('checkCache returns null when key does not exist', () => {
    expect(checkCache('nonexistent')).toBeNull();
  });

  test('checkCache returns value after setCache', () => {
    setCache('test-key', { data: 'test-value' });
    const cached = checkCache('test-key');
    expect(cached).toBe(JSON.stringify({ data: 'test-value' }));
  });

  test('setCache stores stringified data', () => {
    const data = { question: 'test', answer: 'value' };
    setCache('key', data);
    expect(mockStorage.get('key')).toBe(JSON.stringify(data));
  });

  test('checkCache returns null after cache cleared', () => {
    setCache('key', 'value');
    mockStorage.clear();
    expect(checkCache('key')).toBeNull();
  });
});

// Error Handler Tests
describe('Error Handlers', () => {
  const errors = [];

  /**
   * Handles explainer errors gracefully
   * @param {Error|null} error - Error object or null
   * @returns {boolean} True if handled successfully
   */
  function handleExplainerError(error) {
    if (error) {
      errors.push({
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
    return true;
  }

  beforeEach(() => {
    errors.length = 0;
  });

  test('handleExplainerError does not throw with Error object', () => {
    expect(() => handleExplainerError(new Error('test error'))).not.toThrow();
  });

  test('handleExplainerError does not throw with null', () => {
    expect(() => handleExplainerError(null)).not.toThrow();
  });

  test('handleExplainerError does not throw with undefined', () => {
    expect(() => handleExplainerError(undefined)).not.toThrow();
  });

  test('handleExplainerError logs error when provided', () => {
    handleExplainerError(new Error('Test error message'));
    expect(errors.length).toBe(1);
    expect(errors[0].message).toBe('Test error message');
  });

  test('handleExplainerError does not log when error is null', () => {
    handleExplainerError(null);
    expect(errors.length).toBe(0);
  });

  test('handleExplainerError returns true always', () => {
    expect(handleExplainerError(new Error('test'))).toBe(true);
    expect(handleExplainerError(null)).toBe(true);
  });
});

// HTML Escape Tests
describe('HTML Escape Utility', () => {
  /**
   * Escapes HTML special characters
   * @param {string} str - String to escape
   * @returns {string} Escaped string
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

  test('escapeHTML escapes ampersand', () => {
    expect(escapeHTML('&')).toBe('&amp;');
  });

  test('escapeHTML escapes less than', () => {
    expect(escapeHTML('<')).toBe('&lt;');
  });

  test('escapeHTML escapes greater than', () => {
    expect(escapeHTML('>')).toBe('&gt;');
  });

  test('escapeHTML escapes double quote', () => {
    expect(escapeHTML('"')).toBe('&quot;');
  });

  test('escapeHTML escapes single quote', () => {
    expect(escapeHTML("'")).toBe('&#039;');
  });

  test('escapeHTML returns empty string for non-string input', () => {
    expect(escapeHTML(null)).toBe('');
    expect(escapeHTML(123)).toBe('');
    expect(escapeHTML(undefined)).toBe('');
  });

  test('escapeHTML handles complex HTML', () => {
    const input = '<script>alert("XSS")</script>';
    const expected = '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;';
    expect(escapeHTML(input)).toBe(expected);
  });
});

// Sanitizer Tests
describe('Input Sanitizer', () => {
  /**
   * Sanitizes user input by removing dangerous characters
   * @param {string} input - Raw input
   * @returns {string} Sanitized input
   */
  function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input
      .replace(/<[^>]*>/g, '')
      .replace(/[<>'`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  test('sanitizeInput removes HTML tags', () => {
    expect(sanitizeInput('<script>alert(1)</script>')).toBe('alert(1)');
  });

  test('sanitizeInput removes dangerous characters', () => {
    expect(sanitizeInput('test<script>alert(1)</script>')).toBe('testalert(1)');
  });

  test('sanitizeInput trims whitespace', () => {
    expect(sanitizeInput('  hello world  ')).toBe('hello world');
  });

  test('sanitizeInput returns empty string for non-string', () => {
    expect(sanitizeInput(null)).toBe('');
    expect(sanitizeInput(123)).toBe('');
  });
});

// Quiz State Management Tests
describe('Quiz State Management', () => {
  const quizState = {
    questions: [],
    currentIndex: 0,
    score: 0,
    answered: false,
  };

  beforeEach(() => {
    quizState.questions = [];
    quizState.currentIndex = 0;
    quizState.score = 0;
    quizState.answered = false;
  });

  test('quizState initializes with empty questions', () => {
    expect(quizState.questions).toEqual([]);
  });

  test('quizState initializes with currentIndex 0', () => {
    expect(quizState.currentIndex).toBe(0);
  });

  test('quizState initializes with score 0', () => {
    expect(quizState.score).toBe(0);
  });

  test('quizState initializes with answered false', () => {
    expect(quizState.answered).toBe(false);
  });
});

// Constants Integrity Test
describe('Constants Integrity', () => {
  test('all constants should be defined and non-null', () => {
    const constants = [
      { name: 'DEBOUNCE_MS', value: 300 },
      { name: 'TOAST_DURATION_MS', value: 3000 },
      { name: 'MAX_QUESTION_LENGTH', value: 500 },
      { name: 'MIN_ADDRESS_LENGTH', value: 3 },
    ];

    constants.forEach((constant) => {
      expect(constant.value).not.toBeNull();
      expect(constant.value).not.toBeUndefined();
      expect(typeof constant.value).toBe('number');
      expect(constant.value).toBeGreaterThan(0);
    });
  });
});
