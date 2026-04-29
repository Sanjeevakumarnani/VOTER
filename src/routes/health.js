/**
 * @fileoverview Health Check Endpoint for VoteWise AI
 * @description Health check endpoint required by Google Cloud Run for container health
 * monitoring and load balancer health checks. Returns service status, uptime, and timestamp.
 * A failing health check triggers automatic container restart.
 * @author VoteWise AI Team
 * @version 1.0.0
 * @license MIT
 * @copyright 2026 VoteWise AI
 *
 * Google Cloud Run Requirements:
 * - Must return HTTP 200 for healthy containers
 * - Used by load balancers for traffic routing decisions
 * - Triggers automatic container restart on repeated failures
 * - Response should be fast (< 1 second) and lightweight
 *
 * Response Format:
 * {
 *   "status": "ok",
 *   "service": "votewise-ai",
 *   "timestamp": "2026-04-29T06:00:00.000Z",
 *   "uptime": 3600
 * }
 */

'use strict';

const express = require('express');
const router = express.Router();

/**
 * GET /health
 * Health check endpoint required by Google Cloud Run.
 * Returns 200 OK with server status and timestamp.
 *
 * @returns {{ status: string, timestamp: string, uptime: number }}
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'votewise-ai',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

module.exports = router;
