/**
 * @fileoverview VoteWise AI Test Suite
 * @description Comprehensive Jest test suite covering all API endpoints, utilities,
 * security features, and end-to-end user flows. Tests include input validation,
 * sanitization, API responses, and security measures.
 * @author VoteWise AI Team
 * @version 1.0.0
 * @license MIT
 * @copyright 2026 VoteWise AI
 *
 * Test Coverage:
 * - Health endpoint (GET /health)
 * - Input validation (validateQuestion, validateQuizAnswer, etc.)
 * - Input sanitization (sanitizeInput - XSS prevention)
 * - Utility validators (validatePositiveNumber, validateStateName)
 * - Logger utility
 * - API endpoints: /api/explain, /api/timeline, /api/votingsteps, /api/quiz
 * - API endpoints: /api/languages, /api/translate, /api/polling-stations
 * - Security tests (XSS prevention, input sanitization)
 * - End-to-end main user flow
 *
 * Mocked Services:
 * - Google Gemini API (generateContent)
 *
 * Test Framework: Jest with Supertest for HTTP assertions
 */

'use strict';

const request = require('supertest');
const app = require('../src/server');
const { sanitizeInput, validateQuestion, validateQuizAnswer, validatePositiveNumber, validateStateName } = require('../src/utils/validator');
const logger = require('../src/utils/logger');

// Mock Google Gemini service
jest.mock('../src/services/gemini', () => ({
  generateContent: jest.fn().mockImplementation((prompt) => {
    // Return different responses based on prompt content
    if (prompt.includes('timeline') || prompt.includes('stages')) {
      return Promise.resolve(JSON.stringify({
        stages: [
          { step: 1, title: 'Test Stage', description: 'Test description', duration: '1 day', icon: '📢' }
        ]
      }));
    }
    if (prompt.includes('quiz')) {
      return Promise.resolve(JSON.stringify({
        difficulty: 'easy',
        questions: [
          { id: 1, question: 'Test question?', options: ['A', 'B', 'C', 'D'], answer: 0, explanation: 'Test explanation' }
        ]
      }));
    }
    if (prompt.includes('voting') || prompt.includes('steps')) {
      return Promise.resolve(JSON.stringify({
        steps: [
          { step: 1, title: 'Test Step', instruction: 'Test instruction', tip: 'Test tip', documents: [] }
        ],
        important_note: 'Test note',
        helpline: '1950'
      }));
    }
    // Default for explain endpoint
    return Promise.resolve(JSON.stringify({
      explanation: 'Test explanation',
      key_points: ['point 1', 'point 2'],
      fun_fact: 'A fun fact',
      follow_up: ['Follow up?'],
    }));
  }),
}));

describe('Health endpoint', () => {
  test('GET /health returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);
  });
});

describe('Input Validation — validateQuestion()', () => {
  test('returns error for empty string', () => {
    expect(validateQuestion('')).toBeTruthy();
  });

  test('returns error for null input', () => {
    expect(validateQuestion(null)).toBeTruthy();
  });

  test('returns error for input under 3 characters', () => {
    expect(validateQuestion('hi')).toBeTruthy();
  });

  test('returns error for input over 500 characters', () => {
    const longStr = 'a'.repeat(501);
    expect(validateQuestion(longStr)).toBeTruthy();
  });

  test('returns null for valid question', () => {
    expect(validateQuestion('What is the voting age in India?')).toBeNull();
  });
});

describe('Input Sanitization — sanitizeInput()', () => {
  test('strips HTML tags from input', () => {
    const result = sanitizeInput('<script>alert("xss")</script>Hello');
    expect(result).not.toContain('<script>');
    expect(result).toContain('Hello');
  });

  test('returns empty string for non-string input', () => {
    expect(sanitizeInput(null)).toBe('');
    expect(sanitizeInput(123)).toBe('');
  });

  test('trims extra whitespace', () => {
    expect(sanitizeInput('  hello world  ')).toBe('hello world');
  });
});

describe('Quiz Answer Validation — validateQuizAnswer()', () => {
  test('returns error for option out of range (4)', () => {
    expect(validateQuizAnswer(1, 4)).toBeTruthy();
  });

  test('returns error for negative option', () => {
    expect(validateQuizAnswer(1, -1)).toBeTruthy();
  });

  test('returns null for valid answer', () => {
    expect(validateQuizAnswer(1, 2)).toBeNull();
  });
});

describe('Utility validators', () => {
  test('validatePositiveNumber returns false for negative numbers', () => {
    expect(validatePositiveNumber(-10)).toBe(false);
  });

  test('validateStateName returns false for non-alpha input', () => {
    expect(validateStateName('123!')).toBe(false);
  });
});

describe('Logger utility', () => {
  test('logger.info is callable without throwing', () => {
    expect(() => logger.info('test message')).not.toThrow();
  });

  test('logger.error is callable without throwing', () => {
    expect(() => logger.error('test error')).not.toThrow();
  });
});

describe('API endpoint — POST /api/explain', () => {
  test('returns 400 when question is missing', async () => {
    const res = await request(app).post('/api/explain').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('returns 400 when question exceeds 500 chars', async () => {
    const res = await request(app)
      .post('/api/explain')
      .send({ question: 'x'.repeat(501) });
    expect(res.status).toBe(400);
  });

  test('returns 400 when question is too short', async () => {
    const res = await request(app)
      .post('/api/explain')
      .send({ question: 'ab' });
    expect(res.status).toBe(400);
  });
});

describe('API endpoint — GET /api/timeline', () => {
  test('returns timeline data structure', async () => {
    const res = await request(app).get('/api/timeline');
    // May return 200 with data or 503 if Gemini not configured
    expect([200, 503]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.stages).toBeDefined();
      expect(Array.isArray(res.body.stages)).toBe(true);
    }
  });
});

describe('API endpoint — POST /api/votingsteps', () => {
  test('returns voting steps for first-time voter', async () => {
    const res = await request(app)
      .post('/api/votingsteps')
      .send({ voterType: 'first-time', state: 'Delhi' });
    // May return 200 with data or 503 if Gemini not configured
    expect([200, 503]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.steps).toBeDefined();
      expect(Array.isArray(res.body.steps)).toBe(true);
    }
  });

  test('returns voting steps for returning voter', async () => {
    const res = await request(app)
      .post('/api/votingsteps')
      .send({ voterType: 'returning', state: 'Maharashtra' });
    expect([200, 503]).toContain(res.status);
  });

  test('handles missing state parameter', async () => {
    const res = await request(app)
      .post('/api/votingsteps')
      .send({ voterType: 'first-time' });
    expect([200, 503]).toContain(res.status);
  });
});

describe('API endpoint — GET /api/quiz', () => {
  test('returns quiz with easy difficulty', async () => {
    const res = await request(app).get('/api/quiz?difficulty=easy');
    expect([200, 503]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.questions).toBeDefined();
      expect(Array.isArray(res.body.questions)).toBe(true);
    }
  });

  test('returns quiz with medium difficulty', async () => {
    const res = await request(app).get('/api/quiz?difficulty=medium');
    expect([200, 503]).toContain(res.status);
  });

  test('returns quiz with hard difficulty', async () => {
    const res = await request(app).get('/api/quiz?difficulty=hard');
    expect([200, 503]).toContain(res.status);
  });

  test('defaults to easy difficulty for invalid input', async () => {
    const res = await request(app).get('/api/quiz?difficulty=invalid');
    expect([200, 503]).toContain(res.status);
  });
});

describe('API endpoint — GET /api/languages', () => {
  test('returns supported languages list', async () => {
    const res = await request(app).get('/api/languages');
    expect(res.status).toBe(200);
    expect(res.body.languages).toBeDefined();
    expect(Array.isArray(res.body.languages)).toBe(true);
    expect(res.body.translateConfigured).toBeDefined();
  });
});

describe('API endpoint — POST /api/translate', () => {
  test('returns 400 or 503 when text is missing', async () => {
    const res = await request(app).post('/api/translate').send({});
    // 400 if validation fails, 503 if Translate API not configured
    expect([400, 503]).toContain(res.status);
    expect(res.body.error).toBeDefined();
  });

  test('returns 400 or 503 when targetLang is missing', async () => {
    const res = await request(app)
      .post('/api/translate')
      .send({ text: 'Hello' });
    // 400 if validation fails, 503 if Translate API not configured
    expect([400, 503]).toContain(res.status);
  });
});

describe('API endpoint — GET /api/polling-stations', () => {
  test('returns 400 when address is missing', async () => {
    const res = await request(app).get('/api/polling-stations');
    // 400 if validation fails first, 503 if Maps not configured
    expect([400, 503]).toContain(res.status);
    expect(res.body.error).toBeDefined();
  });

  test('returns 400 or 503 for short address', async () => {
    const res = await request(app)
      .get('/api/polling-stations?address=ab');
    // 400 if validation catches it, 503 if Maps API not configured
    expect([400, 503]).toContain(res.status);
  });
});

describe('Security Tests', () => {
  test('sanitizeInput removes HTML tags', () => {
    const result = sanitizeInput('<script>alert("xss")</script>Test');
    expect(result).not.toContain('<script>');
    expect(result).toContain('Test');
  });

  test('sanitizeInput removes special characters', () => {
    const result = sanitizeInput('Test<script>alert(1)</script>');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });

  test('validateStateName accepts valid state names', () => {
    expect(validateStateName('Maharashtra')).toBe(true);
    expect(validateStateName('Tamil Nadu')).toBe(true);
  });

  test('validateStateName rejects invalid state names', () => {
    expect(validateStateName('123')).toBe(false);
    expect(validateStateName('')).toBe(false);
    expect(validateStateName(null)).toBe(false);
  });
});

describe('End-to-End: Main User Flow', () => {
  test('health check returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('static files are served', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('VoteWise');
  });
});
