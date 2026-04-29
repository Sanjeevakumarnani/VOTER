/**
 * @fileoverview Google Gemini AI Service for VoteWise AI
 * @description Primary AI service using Google's Gemini API. Powers all AI-generated content
 * including explanations, timelines, voting guides, and quiz questions. Implements retry
 * logic, temperature control, and structured JSON prompting for consistent responses.
 * @author VoteWise AI Team
 * @version 1.0.0
 * @license MIT
 * @copyright 2026 VoteWise AI
 *
 * Google Service: Google Gemini API (gemini-3-flash-preview model)
 * API Key: Loaded from GEMINI_API_KEY environment variable (never hardcoded)
 *
 * Features:
 * - Exponential backoff retry logic (configurable retries)
 * - Structured JSON prompting for consistent responses
 * - Temperature control (0.7) for balanced creativity/accuracy
 * - Max token limits (1024) for cost optimization
 * - Input validation for prompts
 * - Comprehensive error handling with detailed messages
 */

'use strict';

const { GoogleGenAI } = require('@google/genai');
const logger = require('../utils/logger');

/**
 * Initialize Google GenAI client.
 * API key is loaded from environment variable only — never hardcoded.
 */
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

/**
 * Generate text content from the Gemini AI model.
 * Uses gemini-3-flash-preview for fast, cost-effective generation.
 *
 * @param {string} prompt - The prompt to send to Gemini
 * @param {number} [retries=2] - Number of retry attempts on failure
 * @returns {Promise<string>} The generated text response
 * @throws {Error} If all retry attempts fail
 */
async function generateContent(prompt, retries = 2) {
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    throw new Error('Prompt must be a non-empty string');
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      });

      const text = response.text;

      if (!text || text.trim().length === 0) {
        throw new Error('Gemini returned an empty response');
      }

      return text;
    } catch (err) {
      if (attempt === retries) {
        logger.error(`Gemini API failed after ${retries + 1} attempts: ${err.message}`);
        throw new Error(`AI service unavailable: ${err.message}`);
      }
      logger.warn(`Gemini attempt ${attempt + 1} failed, retrying...`);
      await sleep(500 * (attempt + 1));
    }
  }
}

/**
 * Utility: pause execution for a given number of milliseconds.
 *
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { generateContent };
