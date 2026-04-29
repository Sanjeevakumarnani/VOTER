/**
 * @fileoverview API Client Module for VoteWise AI
 * 
 * Handles all HTTP communication with the backend API.
 * No UI manipulation or business logic allowed in this module.
 * 
 * Responsibilities:
 * - Make HTTP requests to all API endpoints
 * - Handle request/response serialization
 * - Provide typed responses for each endpoint
 * - Centralize error handling for API calls
 * 
 * @module apiClient
 * @version 1.0.0
 */

'use strict';

import { HTTP_STATUS } from './constants.js';

// ── Private State ──────────────────────────────────────
/** @type {string} Base URL for API requests */
const _baseUrl = '';

/** @type {Headers} Default headers for all requests */
const _defaultHeaders = {
  'Content-Type': 'application/json',
};

// ── Private Functions ──────────────────────────────────
/**
 * Performs the actual fetch request
 * @param {string} url - Full URL to fetch
 * @param {object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 * @throws {Error} On network failure
 * @private
 */
async function _fetchWithErrorHandling(url, options) {
  try {
    return await fetch(url, options);
  } catch (networkError) {
    throw new Error(`Network error: ${networkError.message}`);
  }
}

/**
 * Parses JSON response safely
 * @param {Response} response - Fetch response object
 * @returns {Promise<object>} Parsed JSON
 * @throws {Error} If response is not valid JSON
 * @private
 */
async function _parseResponse(response) {
  try {
    return await response.json();
  } catch (parseError) {
    throw new Error('Invalid response format from server');
  }
}

/**
 * Handles HTTP error responses
 * @param {Response} response - Fetch response
 * @param {object} data - Parsed response data
 * @throws {Error} With appropriate message based on status
 * @private
 */
function _handleErrorResponse(response, data) {
  const message = data.error || `Request failed (${response.status})`;
  
  if (response.status === HTTP_STATUS.BAD_REQUEST) {
    throw new Error(`Invalid request: ${message}`);
  }
  if (response.status === HTTP_STATUS.NOT_FOUND) {
    throw new Error(`Not found: ${message}`);
  }
  if (response.status >= HTTP_STATUS.SERVER_ERROR) {
    throw new Error(`Server error: ${message}`);
  }
  
  throw new Error(message);
}

/**
 * Makes authenticated API request
 * @param {string} endpoint - API endpoint path
 * @param {string} method - HTTP method
 * @param {object|null} body - Request body
 * @returns {Promise<object>} Response data
 * @private
 */
async function _apiRequest(endpoint, method, body = null) {
  const url = `${_baseUrl}${endpoint}`;
  const options = {
    method,
    headers: { ..._defaultHeaders },
  };
  
  if (body && method === 'POST') {
    options.body = JSON.stringify(body);
  }
  
  const response = await _fetchWithErrorHandling(url, options);
  const data = await _parseResponse(response);
  
  if (!response.ok) {
    _handleErrorResponse(response, data);
  }
  
  return data;
}

// ── Public API ─────────────────────────────────────────
/**
 * Submits a question to the AI explainer
 * @param {string} question - User's election question
 * @param {string} level - Knowledge level (beginner/intermediate/advanced)
 * @returns {Promise<{explanation: string, key_points: string[], fun_fact: string, follow_up: string[]}>} AI response
 * @throws {Error} If API call fails
 * @example
 * const result = await explainQuestion('What is EVM?', 'beginner');
 * console.log(result.explanation);
 */
export async function explainQuestion(question, level) {
  return _apiRequest('/api/explain', 'POST', { question, level });
}

/**
 * Fetches the election timeline
 * @returns {Promise<{stages: Array<{step: number, title: string, description: string, duration: string, icon: string}>}>} Timeline data
 * @throws {Error} If API call fails
 * @example
 * const timeline = await loadTimeline();
 * renderTimeline(timeline.stages);
 */
export async function loadTimeline() {
  return _apiRequest('/api/timeline', 'GET');
}

/**
 * Fetches personalized voting steps
 * @param {string} voterType - 'first-time' or 'returning'
 * @param {string} state - State name (e.g., 'Delhi', 'Maharashtra')
 * @returns {Promise<{steps: Array<{title: string, instruction: string, tip: string, documents: string[]}>}, important_note: string, helpline: string}>} Voting guide
 * @throws {Error} If API call fails
 * @example
 * const guide = await getVotingSteps('first-time', 'Delhi');
 * renderVotingSteps(guide.steps);
 */
export async function getVotingSteps(voterType, state) {
  return _apiRequest('/api/votingsteps', 'POST', { voterType, state });
}

/**
 * Starts a quiz with specified difficulty
 * @param {string} difficulty - 'easy', 'medium', or 'hard'
 * @returns {Promise<{questions: Array<{id: number, question: string, options: string[], answer: number, explanation: string}>}>} Quiz data
 * @throws {Error} If API call fails
 * @example
 * const quiz = await startQuiz('easy');
 * displayQuestion(quiz.questions[0]);
 */
export async function startQuiz(difficulty) {
  return _apiRequest(`/api/quiz?difficulty=${encodeURIComponent(difficulty)}`, 'GET');
}

/**
 * Finds polling stations near an address
 * @param {string} address - User's address or area
 * @returns {Promise<{location: {address: string, lat: number, lng: number}, stations: Array<{name: string, address: string, distance: string}>, mapUrl: string}>} Polling stations
 * @throws {Error} If API call fails
 * @example
 * const stations = await findPollingStations('123 Main St, Delhi');
 * renderStations(stations.stations);
 */
export async function findPollingStations(address) {
  return _apiRequest(`/api/polling-stations?address=${encodeURIComponent(address)}`, 'GET');
}

/**
 * Translates text to specified language
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language code (e.g., 'hi', 'ta', 'te')
 * @returns {Promise<{translatedText: string, sourceLang: string, targetLang: string}>} Translation result
 * @throws {Error} If API call fails
 * @example
 * const result = await translateText('Hello', 'hi');
 * console.log(result.translatedText); // 'नमस्ते'
 */
export async function translateText(text, targetLang) {
  return _apiRequest('/api/translate', 'POST', { text, targetLang });
}

/**
 * Fetches list of supported languages
 * @returns {Promise<{languages: Array<{code: string, name: string}>, translateConfigured: boolean}>} Available languages
 * @throws {Error} If API call fails
 * @example
 * const languages = await getSupportedLanguages();
 * populateLanguageDropdown(languages.languages);
 */
export async function getSupportedLanguages() {
  return _apiRequest('/api/languages', 'GET');
}

/**
 * Performs health check on backend
 * @returns {Promise<{status: string, timestamp: string, uptime: number}>} Health status
 * @throws {Error} If API call fails
 * @example
 * const health = await checkHealth();
 * if (health.status === 'ok') {
 *   console.log('Backend is healthy');
 * }
 */
export async function checkHealth() {
  return _apiRequest('/health', 'GET');
}
