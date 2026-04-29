/**
 * @fileoverview VoteWise AI Express Application Server
 * @description Main application server with comprehensive security middleware,
 * API routes, and static file serving. Optimized for deployment on Google Cloud Run
 * with health checks, rate limiting, and security headers.
 * @author VoteWise AI Team
 * @version 1.0.0
 * @license MIT
 * @copyright 2026 VoteWise AI
 *
 * Architecture:
 * - Express.js web framework
 * - Helmet.js security middleware
 * - Express Rate Limit for DDoS protection
 * - CORS with origin restrictions
 * - Static file serving for SPA frontend
 * - RESTful API routes under /api/
 * - Health check endpoint for Cloud Run
 *
 * Security Features:
 * - Helmet.js for secure HTTP headers (CSP, HSTS, X-Frame-Options)
 * - Express rate limiting (30 requests/minute per IP)
 * - CORS with production origin restrictions
 * - Input payload size limits (10kb max)
 * - Non-root Docker user (security best practice)
 * - Global error handler (no stack traces in production)
 *
 * Google Cloud Services Integrated:
 * - Google Gemini API (AI content generation)
 * - Google Maps API (polling station locations)
 * - Google Cloud Translation API (multilingual support)
 * - Google Cloud Run (serverless deployment platform)
 */

'use strict';

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const apiRoutes = require('./routes/api');
const healthRoutes = require('./routes/health');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 8080;

/**
 * Security middleware — helmet sets secure HTTP headers
 */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com', 'cdnjs.cloudflare.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com', 'fonts.gstatic.com'],
        fontSrc: ["'self'", 'fonts.gstatic.com'],
        connectSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
      },
    },
  })
);

/**
 * CORS — restrict to same origin in production
 */
app.use(
  cors({
    origin: process.env.NODE_ENV === 'production' ? false : '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  })
);

/**
 * Rate limiter — 30 requests per minute per IP to prevent abuse
 */
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please wait a minute before trying again.',
    retryAfter: 60,
  },
});
app.use('/api/', limiter);

/**
 * Body parser — limit payload size to prevent large request attacks
 */
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

/**
 * Serve static frontend files with proper MIME types for ES6 modules
 */
app.use(express.static(path.join(__dirname, '..', 'public'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

/**
 * API routes
 */
app.use('/api', apiRoutes);
app.use('/health', healthRoutes);

/**
 * SPA fallback — serve index.html for all unmatched routes
 */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

/**
 * Global error handler — never expose stack traces in production
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(500).json({
    error: 'An internal server error occurred. Please try again.',
  });
});

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`VoteWise AI server running on port ${PORT}`);
  });
}

module.exports = app;
