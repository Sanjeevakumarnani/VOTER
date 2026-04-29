/**
 * @fileoverview Tests for AppError custom error classes
 * @module AppError-tests
 */

'use strict';

const { AppError, ValidationError, APIError } = require('../src/utils/AppError.js');

describe('AppError', () => {
  test('creates error with correct properties', () => {
    const error = new AppError('test message', 'TEST_CODE', 400, 'User friendly message');
    expect(error.message).toBe('test message');
    expect(error.code).toBe('TEST_CODE');
    expect(error.statusCode).toBe(400);
    expect(error.userMessage).toBe('User friendly message');
    expect(error.timestamp).toBeDefined();
    expect(error.name).toBe('AppError');
  });

  test('provides default user message when not specified', () => {
    const error = new AppError('technical details', 'ERROR_CODE');
    expect(error.userMessage).toBe('Something went wrong. Please try again.');
  });

  test('provides default status code of 500', () => {
    const error = new AppError('error', 'CODE');
    expect(error.statusCode).toBe(500);
  });

  test('is instanceof Error', () => {
    const error = new AppError('test', 'CODE');
    expect(error instanceof Error).toBe(true);
  });
});

describe('ValidationError', () => {
  test('has field property', () => {
    const error = new ValidationError('Invalid input', 'question');
    expect(error.field).toBe('question');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
  });

  test('inherits from AppError', () => {
    const error = new ValidationError('test', 'field');
    expect(error instanceof AppError).toBe(true);
  });

  test('userMessage matches error message', () => {
    const error = new ValidationError('Field is required', 'email');
    expect(error.userMessage).toBe('Field is required');
  });
});

describe('APIError', () => {
  test('has service property', () => {
    const error = new APIError('Gemini failed', 'Gemini');
    expect(error.service).toBe('Gemini');
    expect(error.statusCode).toBe(502);
    expect(error.code).toBe('API_ERROR');
  });

  test('inherits from AppError', () => {
    const error = new APIError('test', 'service');
    expect(error instanceof AppError).toBe(true);
  });

  test('provides user-friendly message with service name', () => {
    const error = new APIError('Connection timeout', 'Google Maps');
    expect(error.userMessage).toBe('Google Maps is temporarily unavailable. Please try again.');
  });
});

describe('AppError - Complete Coverage', () => {
  test('default userMessage when not provided', () => {
    const error = new AppError('tech msg', 'CODE');
    expect(error.userMessage).toBe('Something went wrong. Please try again.');
  });

  test('timestamp is valid ISO string', () => {
    const error = new AppError('msg', 'CODE');
    expect(new Date(error.timestamp).toISOString()).toBe(error.timestamp);
  });

  test('ValidationError statusCode is always 400', () => {
    const error = new ValidationError('bad input', 'email');
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe('ValidationError');
  });

  test('APIError statusCode is always 502', () => {
    const error = new APIError('api fail', 'Gemini');
    expect(error.statusCode).toBe(502);
    expect(error.service).toBe('Gemini');
  });

  test('AppError is instanceof Error', () => {
    const error = new AppError('msg', 'CODE');
    expect(error instanceof Error).toBe(true);
  });

  test('ValidationError is instanceof AppError', () => {
    const error = new ValidationError('msg', 'field');
    expect(error instanceof AppError).toBe(true);
  });

  test('ValidationError is instanceof Error', () => {
    const error = new ValidationError('msg', 'field');
    expect(error instanceof Error).toBe(true);
  });

  test('APIError is instanceof AppError', () => {
    const error = new APIError('msg', 'service');
    expect(error instanceof AppError).toBe(true);
  });

  test('APIError is instanceof Error', () => {
    const error = new APIError('msg', 'service');
    expect(error instanceof Error).toBe(true);
  });
});
