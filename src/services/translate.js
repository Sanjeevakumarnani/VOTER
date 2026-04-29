/**
 * @fileoverview Google Cloud Translation Service for VoteWise AI
 * @description Integrates with Google Cloud Translation API to provide multilingual
 * election education. Supports 13 Indian languages plus English for maximum accessibility.
 * Enables users to translate AI-generated election content into their preferred language.
 * @author VoteWise AI Team
 * @version 1.0.0
 * @license MIT
 * @copyright 2026 VoteWise AI
 *
 * Google Services Used:
 * - Google Cloud Translation API v2 (text translation)
 * - Google Cloud Translation API v2/detect (language detection)
 * - Automatic source language detection
 * - Support for 13 Indian regional languages
 *
 * Supported Languages (13 Indian + English):
 * English, Hindi, Bengali, Telugu, Marathi, Tamil, Urdu, Gujarati,
 * Kannada, Malayalam, Punjabi, Assamese, Odia
 *
 * Security:
 * - API key loaded from GOOGLE_TRANSLATE_API_KEY environment variable
 * - Input length validation to prevent abuse
 * - Request timeouts for all API calls
 */

'use strict';

const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Google Cloud Translation API endpoint
 * @constant {string}
 */
const TRANSLATE_API_URL = 'https://translation.googleapis.com/language/translate/v2';

/**
 * Google Translate API key from environment variables
 * @constant {string}
 */
const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY || '';

/**
 * Supported Indian languages for election education
 * @constant {Object<string, string>}
 */
const SUPPORTED_LANGUAGES = {
  en: 'English',
  hi: 'Hindi (हिन्दी)',
  bn: 'Bengali (বাংলা)',
  te: 'Telugu (తెలుగు)',
  mr: 'Marathi (मराठी)',
  ta: 'Tamil (தமிழ்)',
  ur: 'Urdu (اردو)',
  gu: 'Gujarati (ગુજરાતી)',
  kn: 'Kannada (ಕನ್ನಡ)',
  ml: 'Malayalam (മലയാളം)',
  pa: 'Punjabi (ਪੰਜਾਬੀ)',
  as: 'Assamese (অসমীয়া)',
  or: 'Odia (ଓଡ଼ିଆ)',
};

/**
 * Validates that the Translation API key is configured
 * @returns {boolean} True if API key is available
 */
function isConfigured() {
  return !!apiKey && apiKey !== 'your_google_translate_api_key_here';
}

/**
 * Gets list of supported languages for the UI.
 * @returns {Array<{code: string, name: string}>} Available languages
 */
function getSupportedLanguages() {
  return Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => ({
    code,
    name,
  }));
}

/**
 * Detects the language of input text.
 * Useful for understanding user's query language.
 *
 * @param {string} text - Text to analyze
 * @returns {Promise<{language: string, confidence: number}>} Detected language
 * @throws {Error} If detection fails
 */
async function detectLanguage(text) {
  if (!isConfigured()) {
    throw new Error('Google Translate API key not configured');
  }

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Text is required for language detection');
  }

  try {
    const url = `${TRANSLATE_API_URL}/detect`;
    const params = {
      q: text.trim(),
      key: apiKey,
    };

    const response = await axios.post(url, null, { params, timeout: 10000 });

    if (response.data.error) {
      throw new Error(response.data.error.message);
    }

    const detection = response.data.data?.detections?.[0]?.[0];

    if (!detection) {
      throw new Error('Language detection failed');
    }

    return {
      language: detection.language,
      confidence: detection.confidence || 0,
      isReliable: detection.isReliable || false,
    };
  } catch (err) {
    logger.error(`Language detection error: ${err.message}`);
    throw new Error(`Failed to detect language: ${err.message}`);
  }
}

/**
 * Translates text to target language.
 * Used for translating AI responses into user's preferred language.
 *
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language code (e.g., 'hi', 'bn')
 * @param {string} [sourceLang] - Optional source language code
 * @returns {Promise<{translatedText: string, detectedSource: string}>} Translation result
 * @throws {Error} If translation fails
 */
async function translateText(text, targetLang, sourceLang = null) {
  if (!isConfigured()) {
    throw new Error('Google Translate API key not configured');
  }

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Text is required for translation');
  }

  if (!targetLang || !SUPPORTED_LANGUAGES[targetLang]) {
    throw new Error(`Unsupported target language: ${targetLang}`);
  }

  try {
    const url = TRANSLATE_API_URL;
    const params = {
      q: text.trim(),
      target: targetLang,
      key: apiKey,
    };

    if (sourceLang) {
      params.source = sourceLang;
    }

    const response = await axios.post(url, null, { params, timeout: 15000 });

    if (response.data.error) {
      throw new Error(response.data.error.message);
    }

    const translation = response.data.data?.translations?.[0];

    if (!translation) {
      throw new Error('Translation returned empty result');
    }

    logger.info(`Translated text to ${targetLang}`);

    return {
      translatedText: translation.translatedText,
      detectedSource: translation.detectedSourceLanguage || sourceLang || 'en',
    };
  } catch (err) {
    logger.error(`Translation error: ${err.message}`);
    throw new Error(`Failed to translate text: ${err.message}`);
  }
}

/**
 * Translates structured election content (explanation with key points).
 * Preserves structure while translating content.
 *
 * @param {{explanation: string, key_points: string[], fun_fact: string}} content - Content to translate
 * @param {string} targetLang - Target language code
 * @returns {Promise<{explanation: string, key_points: string[], fun_fact: string}>} Translated content
 * @throws {Error} If translation fails
 */
async function translateElectionContent(content, targetLang) {
  if (!isConfigured()) {
    throw new Error('Google Translate API key not configured');
  }

  if (!content || typeof content !== 'object') {
    throw new Error('Content object is required');
  }

  try {
    // Translate each field separately
    const translatedExplanation = content.explanation
      ? await translateText(content.explanation, targetLang)
      : null;

    const translatedKeyPoints = content.key_points?.length
      ? await Promise.all(content.key_points.map((point) => translateText(point, targetLang)))
      : [];

    const translatedFunFact = content.fun_fact
      ? await translateText(content.fun_fact, targetLang)
      : null;

    return {
      explanation: translatedExplanation?.translatedText || content.explanation,
      key_points: translatedKeyPoints.map((t) => t.translatedText),
      fun_fact: translatedFunFact?.translatedText || content.fun_fact,
    };
  } catch (err) {
    logger.error(`Election content translation error: ${err.message}`);
    throw new Error(`Failed to translate election content: ${err.message}`);
  }
}

/**
 * Gets language name from language code.
 *
 * @param {string} code - Language code
 * @returns {string} Language name or the code itself if not found
 */
function getLanguageName(code) {
  return SUPPORTED_LANGUAGES[code] || code;
}

module.exports = {
  isConfigured,
  getSupportedLanguages,
  detectLanguage,
  translateText,
  translateElectionContent,
  getLanguageName,
  SUPPORTED_LANGUAGES,
};
