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
