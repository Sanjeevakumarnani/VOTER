/**
 * @fileoverview VoteWise AI API Routes
 * @description Main REST API endpoints for the election education application.
 * Provides 7 core endpoints: explain, timeline, voting steps, quiz, polling stations,
 * language list, and translation. All endpoints implement input validation, error handling,
 * and fallback responses for high availability.
 * @author VoteWise AI Team
 * @version 1.0.0
 * @license MIT
 * @copyright 2026 VoteWise AI
 *
 * API Endpoints (7 total):
 * - POST /api/explain - AI-powered election question answering
 * - GET /api/timeline - Indian election process timeline (12 stages)
 * - POST /api/votingsteps - Personalized voting guide by voter type
 * - GET /api/quiz - AI-generated election quiz (3 difficulty levels)
 * - GET /api/polling-stations - Find nearby polling booths via Google Maps
 * - GET /api/languages - List supported languages for translation
 * - POST /api/translate - Translate content via Google Cloud Translation
 *
 * Google Services Integrated:
 * - Google Gemini API (gemini-3-flash-preview model) - All AI content
 * - Google Maps Geocoding API - Address to coordinates
 * - Google Places API - Nearby polling station search
 * - Google Cloud Translation API - Multilingual support (13 languages)
 *
 * Features:
 * - Input validation and sanitization on all endpoints
 * - Fallback responses when AI services unavailable
 * - Comprehensive error handling with user-friendly messages
 * - JSON response parsing with repair for AI responses
 * - Structured logging for monitoring and debugging
 */

'use strict';

const express = require('express');
const router = express.Router();
const { generateContent } = require('../services/gemini');
const { geocodeAddress, findPollingStations, isConfigured: mapsConfigured } = require('../services/maps');
const { translateText, getSupportedLanguages, isConfigured: translateConfigured } = require('../services/translate');
const { sanitizeInput, validateQuestion, validateQuizAnswer } = require('../utils/validator');
const logger = require('../utils/logger');

/**
 * POST /api/explain
 * Explains any election-related question in simple, easy-to-understand language.
 *
 * @body {{ question: string, level: string }} - question and user knowledge level
 * @returns {{ explanation: string, key_points: string[], follow_up: string[] }}
 */
router.post('/explain', async (req, res) => {
  try {
    const { question, level = 'beginner' } = req.body;

    const validationError = validateQuestion(question);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const safeQuestion = sanitizeInput(question);
    const safeLevel = ['beginner', 'intermediate', 'advanced'].includes(level)
      ? level
      : 'beginner';

    const prompt = `
You are VoteWise AI, an expert in election processes and civic education for India.
A ${safeLevel}-level user asks: "${safeQuestion}"

Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "explanation": "Clear 3-4 sentence explanation using simple language appropriate for ${safeLevel} level. Use Indian election context.",
  "key_points": ["point 1", "point 2", "point 3"],
  "fun_fact": "One interesting fact about Indian elections related to this topic",
  "follow_up": ["Related question 1?", "Related question 2?"]
}

If the question is NOT related to elections or civic processes, set explanation to:
"I can only help with election and voting process questions. Please ask about elections, voting, or civic processes."
and set key_points and follow_up to empty arrays.
`.trim();

    const raw = await generateContent(prompt);
    const parsed = parseGeminiJSON(raw);

    logger.info(`Explain request processed for level: ${safeLevel}`);
    return res.status(200).json(parsed);
  } catch (err) {
    logger.error(`/api/explain error: ${err.message}`);
    return res.status(500).json({ error: 'Failed to generate explanation. Please try again.' });
  }
});

/**
 * GET /api/timeline
 * Returns the complete Indian general election timeline with AI-generated descriptions.
 *
 * @returns {{ stages: Array<{ step: number, title: string, description: string, duration: string, icon: string }> }}
 */
router.get('/timeline', async (req, res) => {
  try {
    const prompt = `
You are an expert in Indian election processes.
Return ONLY a valid JSON object (no markdown, no extra text):
{
  "stages": [
    {
      "step": 1,
      "title": "Election Commission Announcement",
      "description": "2-sentence plain English description of this stage",
      "duration": "typical duration e.g. '1-2 days'",
      "icon": "📢"
    }
  ]
}

Include ALL of these stages in order:
1. Election Commission Announcement
2. Model Code of Conduct
3. Voter List Finalization
4. Nomination Filing
5. Scrutiny of Nominations
6. Withdrawal of Candidature
7. Election Campaign
8. Campaign Silence Period
9. Polling Day (Voting)
10. Vote Counting
11. Result Declaration
12. Government Formation

Make descriptions simple enough for a first-time voter to understand.
`.trim();

    const raw = await generateContent(prompt);
    let parsed = parseGeminiJSON(raw);

    // Validate timeline structure - if invalid, use fallback
    if (!parsed || !parsed.stages || !Array.isArray(parsed.stages) || parsed.stages.length === 0) {
      logger.warn(`Timeline generation returned invalid structure, using fallback`);
      parsed = getFallbackTimeline();
    }

    logger.info('Timeline endpoint served');
    return res.status(200).json(parsed);
  } catch (err) {
    logger.error(`/api/timeline error: ${err.message}`);
    // Return fallback timeline data
    return res.status(200).json(getFallbackTimeline());
  }
});

/**
 * POST /api/votingsteps
 * Returns personalized step-by-step voting guide based on voter type.
 *
 * @body {{ voterType: string, state: string }} - first-time or returning voter, state name
 * @returns {{ steps: Array<{ step: number, title: string, instruction: string, tip: string }> }}
 */
router.post('/votingsteps', async (req, res) => {
  try {
    const { voterType = 'first-time', state = 'India' } = req.body;

    const safeVoterType = ['first-time', 'returning'].includes(voterType) ? voterType : 'first-time';
    const safeState = sanitizeInput(state || 'India').substring(0, 50);

    const prompt = `
You are a civic education expert. Create a voting guide for a ${safeVoterType} voter in ${safeState}, India.
Return ONLY a valid JSON object (no markdown, no extra text):
{
  "steps": [
    {
      "step": 1,
      "title": "Short step title",
      "instruction": "Clear 2-sentence instruction",
      "tip": "One practical pro-tip",
      "documents": ["document 1 if needed", "document 2 if needed"]
    }
  ],
  "important_note": "One critical reminder for this voter type",
  "helpline": "1950"
}

Include steps: Check voter registration, Get Voter ID card, Find your polling booth,
What to carry on voting day, At the polling booth, Using the EVM machine, VVPAT verification.
Keep language very simple and friendly.
`.trim();

    const raw = await generateContent(prompt);
    let parsed = parseGeminiJSON(raw);

    // Validate voting steps structure - if invalid, use fallback
    if (!parsed || !parsed.steps || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      logger.warn(`Voting steps generation returned invalid structure, using fallback`);
      parsed = getFallbackVotingSteps(safeVoterType);
    }

    logger.info(`Voting steps generated for type: ${safeVoterType}`);
    return res.status(200).json(parsed);
  } catch (err) {
    logger.error(`/api/votingsteps error: ${err.message}`);
    // Return fallback voting steps
    const voterType = req.body?.voterType || 'first-time';
    return res.status(200).json(getFallbackVotingSteps(voterType));
  }
});

/**
 * GET /api/quiz
 * Generates a fresh 5-question quiz about Indian election processes.
 *
 * @query {{ difficulty: string }} - easy, medium, or hard
 * @returns {{ questions: Array<{ id: number, question: string, options: string[], answer: number, explanation: string }> }}
 */
router.get('/quiz', async (req, res) => {
  try {
    const { difficulty = 'easy' } = req.query;
    const safeDifficulty = ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'easy';

    const prompt = `
You are a civic education quiz master. Generate a ${safeDifficulty} difficulty quiz about Indian elections.
Return ONLY a valid JSON object (no markdown, no extra text):
{
  "difficulty": "${safeDifficulty}",
  "questions": [
    {
      "id": 1,
      "question": "Quiz question here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": 0,
      "explanation": "Why this answer is correct in 1-2 sentences"
    }
  ]
}

Generate exactly 5 questions about: voting age, Election Commission of India, EVM machines,
NOTA option, voter registration, constituencies, election schedule, or historical facts.
The "answer" field must be the 0-based index of the correct option.
Make questions factually accurate about Indian elections.
`.trim();

    const raw = await generateContent(prompt);
    let parsed = parseGeminiJSON(raw);

    // Validate quiz structure - if invalid, use fallback
    if (!parsed || !parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      logger.warn(`Quiz generation returned invalid structure, using fallback`);
      parsed = getFallbackQuiz(safeDifficulty);
    }

    logger.info(`Quiz generated with difficulty: ${safeDifficulty}`);
    return res.status(200).json(parsed);
  } catch (err) {
    logger.error(`/api/quiz error: ${err.message}`);
    // Return fallback quiz instead of error
    const fallback = getFallbackQuiz(safeDifficulty);
    return res.status(200).json(fallback);
  }
});

/**
 * GET /api/polling-stations
 * Finds polling stations near a given address using Google Maps API.
 * Google Service: Google Maps Geocoding API + Places API
 *
 * @query {{ address: string }} - Address or location to search near
 * @returns {{ stations: Array<{name: string, address: string, distance: string}>, location: object }}
 */
router.get('/polling-stations', async (req, res) => {
  try {
    const { address } = req.query;

    if (!mapsConfigured()) {
      return res.status(503).json({
        error: 'Google Maps API not configured. Please set GOOGLE_MAPS_API_KEY.',
        stations: [],
      });
    }

    if (!address || typeof address !== 'string' || address.trim().length < 3) {
      return res.status(400).json({ error: 'Please provide a valid address (at least 3 characters).' });
    }

    const safeAddress = sanitizeInput(address);

    // Geocode the address to get coordinates
    const location = await geocodeAddress(safeAddress);

    // Find polling stations near those coordinates
    const stations = await findPollingStations(location);

    logger.info(`Found ${stations.length} polling stations near ${location.formatted_address}`);

    return res.status(200).json({
      location: {
        address: location.formatted_address,
        lat: location.lat,
        lng: location.lng,
      },
      stations: stations,
      mapUrl: `https://www.google.com/maps/search/polling+station/@${location.lat},${location.lng},15z`,
    });
  } catch (err) {
    logger.error(`/api/polling-stations error: ${err.message}`);
    return res.status(500).json({
      error: 'Failed to find polling stations. Please try a different address.',
      stations: [],
    });
  }
});

/**
 * GET /api/languages
 * Returns list of supported languages for translation.
 * Google Service: Google Cloud Translation API
 *
 * @returns {{ languages: Array<{code: string, name: string}> }}
 */
router.get('/languages', async (req, res) => {
  try {
    const languages = getSupportedLanguages();

    return res.status(200).json({
      languages: languages,
      translateConfigured: translateConfigured(),
    });
  } catch (err) {
    logger.error(`/api/languages error: ${err.message}`);
    return res.status(500).json({ error: 'Failed to get language list.' });
  }
});

/**
 * POST /api/translate
 * Translates election content to the specified language.
 * Google Service: Google Cloud Translation API
 *
 * @body {{ text: string, targetLang: string }}
 * @returns {{ translatedText: string, sourceLang: string }}
 */
router.post('/translate', async (req, res) => {
  try {
    const { text, targetLang } = req.body;

    if (!translateConfigured()) {
      return res.status(503).json({
        error: 'Google Translate API not configured. Please set GOOGLE_TRANSLATE_API_KEY.',
      });
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required for translation.' });
    }

    if (!targetLang || typeof targetLang !== 'string') {
      return res.status(400).json({ error: 'Target language is required.' });
    }

    const safeText = sanitizeInput(text);
    const safeLang = targetLang.trim().toLowerCase();

    const result = await translateText(safeText, safeLang);

    logger.info(`Translated text to ${safeLang}`);

    return res.status(200).json({
      translatedText: result.translatedText,
      sourceLang: result.detectedSource,
      targetLang: safeLang,
    });
  } catch (err) {
    logger.error(`/api/translate error: ${err.message}`);
    return res.status(500).json({ error: `Translation failed: ${err.message}` });
  }
});

/**
 * Provides fallback timeline data when AI generation fails.
 * @returns {object} Fallback timeline with stages
 */
function getFallbackTimeline() {
  return {
    stages: [
      { step: 1, title: "Election Commission Announcement", description: "The Election Commission announces the schedule for the general elections, officially starting the election process.", duration: "1-2 days", icon: "📢" },
      { step: 2, title: "Model Code of Conduct", description: "Political parties and candidates must follow rules about campaigning, government cannot announce new schemes.", duration: "6-8 weeks", icon: "📋" },
      { step: 3, title: "Voter List Finalization", description: "Final voter rolls are published. Citizens can check if their name is on the list.", duration: "2-3 weeks", icon: "📝" },
      { step: 4, title: "Nomination Filing", description: "Candidates file their nomination papers with the Election Commission to contest elections.", duration: "1 week", icon: "📄" },
      { step: 5, title: "Scrutiny of Nominations", description: "Election officials check if candidates meet eligibility criteria and reject invalid nominations.", duration: "2-3 days", icon: "🔍" },
      { step: 6, title: "Withdrawal of Candidature", description: "Candidates can withdraw their nominations if they change their mind.", duration: "2 days", icon: "❌" },
      { step: 7, title: "Election Campaign", description: "Parties campaign to win votes through rallies, advertisements, and door-to-door visits.", duration: "3-4 weeks", icon: "🎤" },
      { step: 8, title: "Campaign Silence Period", description: "48 hours before polling when all campaigning stops to let voters decide peacefully.", duration: "48 hours", icon: "🤫" },
      { step: 9, title: "Polling Day (Voting)", description: "Citizens cast their votes at polling stations using EVM machines.", duration: "1 day", icon: "🗳️" },
      { step: 10, title: "Vote Counting", description: "Votes are counted under strict supervision and video recording.", duration: "1 day", icon: "🔢" },
      { step: 11, title: "Result Declaration", description: "Winners are announced and election results are officially published.", duration: "Same day", icon: "🏆" },
      { step: 12, title: "Government Formation", description: "The winning party or coalition forms the new government.", duration: "1-2 weeks", icon: "🏛️" }
    ],
    _fallback: true
  };
}

/**
 * Provides fallback voting steps when AI generation fails.
 * @param {string} voterType - 'first-time' or 'returning'
 * @returns {object} Fallback voting steps
 */
function getFallbackVotingSteps(voterType) {
  const firstTimeSteps = [
    { step: 1, title: "Check Your Registration", instruction: "Verify your name is on the voter list at electoralsearch.in or voter helpline app.", tip: "Carry your voter ID or Aadhaar card for verification." },
    { step: 2, title: "Find Your Polling Station", instruction: "Check your polling booth location on your voter ID card or online.", tip: "Visit the booth a day before to avoid confusion on voting day." },
    { step: 3, title: "What to Carry", instruction: "Bring your Voter ID (EPIC), Aadhaar, or any approved photo ID.", tip: "Mobile phones are not allowed inside the polling station." },
    { step: 4, title: "At the Polling Booth", instruction: "Show your ID to the polling officer and get your finger marked with ink.", tip: "The ink mark ensures you can only vote once." },
    { step: 5, title: "Using the EVM", instruction: "Press the button next to your chosen candidate's symbol.", tip: "Check the VVPAT slip to verify your vote was recorded correctly." },
    { step: 6, title: "VVPAT Verification", instruction: "A slip shows your vote for 7 seconds before dropping in the box.", tip: "This ensures your vote was recorded as intended." }
  ];

  const returningSteps = [
    { step: 1, title: "Verify Your Details", instruction: "Check if your voter registration is active and polling booth location.", tip: "Details may have changed since last election." },
    { step: 2, title: "Carry Required ID", instruction: "Bring Voter ID, Aadhaar, or other approved photo identification.", tip: "Phone must be switched off before entering booth." },
    { step: 3, title: "At the Polling Station", instruction: "Present ID, get ink marked, and proceed to the EVM.", tip: "Early morning (7-9 AM) usually has shorter queues." },
    { step: 4, title: "Cast Your Vote", instruction: "Press the button for your preferred candidate.", tip: "Wait for the beep and check the VVPAT slip verification." }
  ];

  return {
    steps: voterType === 'first-time' ? firstTimeSteps : returningSteps,
    important_note: "Every vote counts! Voting is your constitutional right and duty as an Indian citizen.",
    helpline: "1950",
    _fallback: true
  };
}

/**
 * Provides fallback quiz questions when AI generation fails.
 * @param {string} difficulty - Quiz difficulty level
 * @returns {object} Fallback quiz object with questions
 */
function getFallbackQuiz(difficulty) {
  const easyQuestions = [
    {
      id: 1,
      question: "What is the minimum voting age in India?",
      options: ["16 years", "18 years", "21 years", "25 years"],
      answer: 1,
      explanation: "The minimum voting age in India is 18 years as per Article 326 of the Constitution."
    },
    {
      id: 2,
      question: "What does EVM stand for?",
      options: ["Electronic Vote Machine", "Electronic Voting Machine", "Electric Vote Machine", "Electronic Voter Machine"],
      answer: 1,
      explanation: "EVM stands for Electronic Voting Machine, used for casting votes in Indian elections."
    },
    {
      id: 3,
      question: "Who conducts elections in India?",
      options: ["Prime Minister", "President", "Election Commission of India", "Supreme Court"],
      answer: 2,
      explanation: "The Election Commission of India is an autonomous constitutional authority responsible for administering election processes."
    },
    {
      id: 4,
      question: "What is NOTA?",
      options: ["None of the Above", "National Election Ticket", "New Voting Act", "National Party"],
      answer: 0,
      explanation: "NOTA stands for 'None of the Above', giving voters the right to reject all candidates."
    },
    {
      id: 5,
      question: "How often are Lok Sabha elections held?",
      options: ["Every 3 years", "Every 4 years", "Every 5 years", "Every 6 years"],
      answer: 2,
      explanation: "Lok Sabha elections are held every 5 years unless dissolved earlier."
    }
  ];

  const mediumQuestions = [
    {
      id: 1,
      question: "Which article of the Indian Constitution deals with the Election Commission?",
      options: ["Article 324", "Article 326", "Article 356", "Article 370"],
      answer: 0,
      explanation: "Article 324 of the Constitution provides for the Election Commission."
    },
    {
      id: 2,
      question: "What is the maximum strength of Lok Sabha?",
      options: ["543", "545", "550", "552"],
      answer: 3,
      explanation: "The maximum strength of Lok Sabha is 552 members (530 states + 20 UTs + 2 Anglo-Indians nominated)."
    },
    {
      id: 3,
      question: "When was the first EVM used in India?",
      options: ["1982", "1989", "1998", "2004"],
      answer: 0,
      explanation: "EVMs were first used in 1982 in the by-election to Paravur Assembly Constituency of Kerala."
    },
    {
      id: 4,
      question: "Which schedule of the Constitution lists the states and their territories?",
      options: ["First Schedule", "Second Schedule", "Third Schedule", "Fourth Schedule"],
      answer: 0,
      explanation: "The First Schedule lists the states and union territories of India."
    },
    {
      id: 5,
      question: "What is the term of office for a Rajya Sabha member?",
      options: ["4 years", "5 years", "6 years", "Permanent"],
      answer: 2,
      explanation: "Rajya Sabha members serve a 6-year term with one-third retiring every 2 years."
    }
  ];

  const hardQuestions = [
    {
      id: 1,
      question: "Which amendment lowered the voting age from 21 to 18?",
      options: ["42nd Amendment", "44th Amendment", "61st Amendment", "73rd Amendment"],
      answer: 2,
      explanation: "The 61st Constitutional Amendment Act, 1988 lowered the voting age from 21 to 18."
    },
    {
      id: 2,
      question: "What is the maximum number of seats in Rajya Sabha?",
      options: ["238", "245", "250", "552"],
      answer: 2,
      explanation: "The maximum strength of Rajya Sabha is 250 (238 elected + 12 nominated)."
    },
    {
      id: 3,
      question: "Which state has the maximum number of Lok Sabha seats?",
      options: ["Maharashtra", "West Bengal", "Tamil Nadu", "Uttar Pradesh"],
      answer: 3,
      explanation: "Uttar Pradesh has 80 Lok Sabha seats, the highest among all states."
    },
    {
      id: 4,
      question: "When was the Election Commission established?",
      options: ["1950", "1951", "1952", "1954"],
      answer: 0,
      explanation: "The Election Commission was established on January 25, 1950, the day before India became a republic."
    },
    {
      id: 5,
      question: "What is the deposit amount for Lok Sabha elections?",
      options: ["Rs. 5,000", "Rs. 10,000", "Rs. 25,000", "Rs. 50,000"],
      answer: 1,
      explanation: "The security deposit for Lok Sabha elections is Rs. 10,000 (Rs. 5,000 for SC/ST candidates)."
    }
  ];

  let questions;
  switch (difficulty) {
    case 'easy':
      questions = easyQuestions;
      break;
    case 'hard':
      questions = hardQuestions;
      break;
    case 'medium':
    default:
      questions = mediumQuestions;
  }

  return {
    difficulty: difficulty,
    questions: questions,
    _fallback: true
  };
}

/**
 * Safely parses JSON from Gemini API response, stripping markdown fences and fixing common AI JSON issues.
 *
 * @param {string} raw - Raw string response from Gemini
 * @returns {object} Parsed JSON object
 * @throws {Error} If JSON parsing fails
 */
function parseGeminiJSON(raw) {
  let cleaned = raw
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/gi, '')
    .trim();

  // Fix common AI JSON issues
  // Remove trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
  
  // Replace curly/smart quotes with straight quotes
  cleaned = cleaned
    .replace(/[\"]/g, '"')
    .replace(/[\']/g, "'");
  
  // Fix unterminated strings - find and close them properly
  cleaned = fixUnterminatedStrings(cleaned);
  
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // Try to extract valid JSON portion by finding balanced braces
    const fixedJSON = extractValidJSON(cleaned);
    if (fixedJSON) {
      try {
        return JSON.parse(fixedJSON);
      } catch (innerErr) {
        logger.warn(`JSON extraction failed: ${innerErr.message}`);
      }
    }
    
    // Last resort: return fallback with raw content
    logger.warn(`JSON parsing failed, using fallback. Error: ${err.message}`);
    return createFallbackResponse(cleaned);
  }
}

/**
 * Fixes unterminated strings in JSON by closing them properly.
 * @param {string} json - JSON string potentially with unterminated strings
 * @returns {string} Fixed JSON string
 */
function fixUnterminatedStrings(json) {
  let result = json;
  let inString = false;
  let escapeNext = false;
  let lastValidEnd = -1;
  
  for (let i = 0; i < result.length; i++) {
    const char = result[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      if (!inString) {
        // Just closed a string - mark this as valid position
        lastValidEnd = i;
      }
    }
  }
  
  // If still in string at end, truncate to last valid position
  if (inString && lastValidEnd > 0) {
    // Truncate to last complete string and close properly
    result = result.substring(0, lastValidEnd + 1);
    
    // Close any open structures
    const openBraces = (result.match(/\{/g) || []).length - (result.match(/\}/g) || []).length;
    const openBrackets = (result.match(/\[/g) || []).length - (result.match(/\]/g) || []).length;
    
    for (let i = 0; i < openBrackets; i++) result += ']';
    for (let i = 0; i < openBraces; i++) result += '}';
  }
  
  return result;
}

/**
 * Extracts valid JSON by finding balanced braces.
 * @param {string} str - String potentially containing JSON
 * @returns {string|null} Valid JSON string or null
 */
function extractValidJSON(str) {
  let braceCount = 0;
  let bracketCount = 0;
  let inString = false;
  let escapeNext = false;
  let startIdx = -1;
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (inString) continue;
    
    if (char === '{') {
      if (startIdx === -1) startIdx = i;
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      if (braceCount === 0 && startIdx !== -1) {
        return str.substring(startIdx, i + 1);
      }
    } else if (char === '[') {
      bracketCount++;
    } else if (char === ']') {
      bracketCount--;
    }
  }
  
  return null;
}

/**
 * Creates a fallback response when JSON parsing fails.
 * @param {string} raw - Raw AI response
 * @returns {object} Fallback response object
 */
function createFallbackResponse(raw) {
  // Try to extract text content for explain endpoint
  if (raw.includes('explanation') || raw.length > 100) {
    return {
      explanation: raw.replace(/[{}"\[\]]/g, ' ').trim().substring(0, 500),
      key_points: ['AI response received but parsing failed'],
      fun_fact: 'Gemini generated content that could not be fully parsed.',
      follow_up: ['Try rephrasing your question?'],
      _parseError: true
    };
  }
  
  return {
    rawResponse: raw.substring(0, 500),
    parseError: 'Could not parse AI response as JSON',
    _fallback: true
  };
}

module.exports = router;
