/**
 * @fileoverview Cache Management Module for VoteWise AI
 * 
 * Provides a wrapper around sessionStorage with type safety,
 * automatic serialization, and cache key generation.
 * 
 * Responsibilities:
 * - Store and retrieve cached data with automatic JSON handling
 * - Generate consistent cache keys
 * - Clear cache entries or entire cache
 * - Check cache existence without retrieving
 * 
 * @module cacheManager
 * @version 1.0.0
 */

'use strict';

import { CACHE_PREFIX, CACHE_KEY_MAX_LENGTH } from './constants.js';

// ── Private State ──────────────────────────────────────
/** @type {Storage} Reference to sessionStorage API */
const _storage = window.sessionStorage;

/** @type {Map<string, boolean>} In-memory existence cache to reduce storage calls */
const _existenceCache = new Map();

// ── Private Functions ──────────────────────────────────
/**
 * Generates a safe cache key from components
 * @param {string[]} components - Key components to combine
 * @returns {string} Normalized cache key
 * @private
 */
function _generateKey(components) {
  const combined = components
    .map((component) => String(component).toLowerCase().trim())
    .join('_');
  
  return `${CACHE_PREFIX}${combined}`.substring(0, CACHE_KEY_MAX_LENGTH);
}

/**
 * Serializes data for storage
 * @param {*} data - Any data to serialize
 * @returns {string} JSON string
 * @throws {TypeError} If data cannot be serialized
 * @private
 */
function _serialize(data) {
  try {
    return JSON.stringify(data);
  } catch (error) {
    throw new TypeError(`Cannot serialize data: ${error.message}`);
  }
}

/**
 * Deserializes data from storage
 * @param {string} json - JSON string to parse
 * @returns {*} Parsed data
 * @throws {SyntaxError} If JSON is invalid
 * @private
 */
function _deserialize(json) {
  try {
    return JSON.parse(json);
  } catch (error) {
    throw new SyntaxError(`Invalid cached data: ${error.message}`);
  }
}

// ── Public API ─────────────────────────────────────────
/**
 * Generates a cache key for the explainer feature
 * @param {string} question - User's question
 * @param {string} level - Knowledge level
 * @returns {string} Cache key string
 * @example
 * const key = generateCacheKey.explainer('What is EVM?', 'beginner');
 * // Returns: 'votewise_explainer_whatise...'
 */
export function generateExplainerKey(question, level) {
  const combined = `${question}_${level}`;
  const encoded = btoa(combined).substring(0, 20);
  return _generateKey(['explain', encoded]);
}

/**
 * Generates a cache key for voting steps
 * @param {string} voterType - 'first-time' or 'returning'
 * @param {string} state - State name
 * @returns {string} Cache key string
 * @example
 * const key = generateCacheKey.votingSteps('first-time', 'Delhi');
 */
export function generateVotingStepsKey(voterType, state) {
  return _generateKey(['steps', voterType, state]);
}

/**
 * Generates a cache key for quiz questions
 * @param {string} difficulty - 'easy', 'medium', or 'hard'
 * @returns {string} Cache key string
 * @example
 * const key = generateCacheKey.quiz('easy');
 */
export function generateQuizKey(difficulty) {
  return _generateKey(['quiz', difficulty]);
}

/**
 * Generates a cache key for election timeline
 * @returns {string} Cache key string
 * @example
 * const key = generateCacheKey.timeline();
 */
export function generateTimelineKey() {
  return _generateKey(['timeline']);
}

/**
 * Retrieves data from cache
 * @param {string} key - Cache key
 * @returns {{exists: boolean, data?: *, error?: string}} Cache result
 * @example
 * const result = getCache('votewise_quiz_easy');
 * if (result.exists) {
 *   renderQuiz(result.data);
 * }
 */
export function getCache(key) {
  try {
    const cached = _storage.getItem(key);
    
    if (cached === null) {
      return { exists: false };
    }

    const data = _deserialize(cached);
    return { exists: true, data };
  } catch (error) {
    return { exists: false, error: error.message };
  }
}

/**
 * Stores data in cache
 * @param {string} key - Cache key
 * @param {*} data - Data to cache (must be serializable)
 * @returns {{success: boolean, error?: string}} Operation result
 * @example
 * const result = setCache('votewise_quiz_easy', quizData);
 * if (!result.success) {
 *   console.error('Failed to cache:', result.error);
 * }
 */
export function setCache(key, data) {
  try {
    const serialized = _serialize(data);
    _storage.setItem(key, serialized);
    _existenceCache.set(key, true);
    return { success: true };
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      return { success: false, error: 'Storage quota exceeded' };
    }
    return { success: false, error: error.message };
  }
}

/**
 * Removes a specific entry from cache
 * @param {string} key - Cache key to remove
 * @returns {boolean} True if entry existed and was removed
 * @example
 * const wasRemoved = clearCache('votewise_timeline');
 */
export function clearCache(key) {
  const existed = _storage.getItem(key) !== null;
  _storage.removeItem(key);
  _existenceCache.delete(key);
  return existed;
}

/**
 * Clears all VoteWise AI cache entries
 * @returns {number} Number of entries cleared
 * @example
 * const clearedCount = clearAllCache();
 * console.log(`Cleared ${clearedCount} cached entries`);
 */
export function clearAllCache() {
  let clearedCount = 0;
  
  for (let index = _storage.length - 1; index >= 0; index--) {
    const key = _storage.key(index);
    if (key && key.startsWith(CACHE_PREFIX)) {
      _storage.removeItem(key);
      _existenceCache.delete(key);
      clearedCount++;
    }
  }
  
  return clearedCount;
}

/**
 * Checks if a cache entry exists without retrieving data
 * @param {string} key - Cache key to check
 * @returns {boolean} True if entry exists
 * @example
 * if (hasCache('votewise_quiz_easy')) {
 *   skipAPICall();
 * }
 */
export function hasCache(key) {
  if (_existenceCache.has(key)) {
    return _existenceCache.get(key);
  }
  
  const exists = _storage.getItem(key) !== null;
  _existenceCache.set(key, exists);
  return exists;
}
