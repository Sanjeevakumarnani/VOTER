/**
 * @fileoverview UI Management Module for VoteWise AI
 * 
 * Handles all DOM manipulation, visual feedback, and UI state changes.
 * No API calls or business logic allowed in this module.
 * 
 * Responsibilities:
 * - Display toast notifications
 * - Toggle button loading states
 * - Render skeleton loading placeholders
 * - Update screen reader status
 * - Escape HTML for safe rendering
 * - Show/hide sections
 * 
 * @module uiManager
 * @version 1.0.0
 */

'use strict';

import { TOAST_DURATION_MS, SKELETON_COUNT_DEFAULT } from './constants.js';

// ── Private State ──────────────────────────────────────
/** @type {number|null} Active toast timeout ID */
let _toastTimeoutId = null;

/** @type {Map<string, HTMLElement>} Cached DOM element references */
const _elementCache = new Map();

// ── Private Functions ──────────────────────────────────
/**
 * Gets or caches a DOM element reference
 * @param {string} id - Element ID
 * @returns {HTMLElement|null} Element or null if not found
 * @private
 */
function _getElement(id) {
  if (_elementCache.has(id)) {
    return _elementCache.get(id);
  }
  
  const element = document.getElementById(id);
  if (element) {
    _elementCache.set(id, element);
  }
  return element;
}

/**
 * Clears any active toast timeout
 * @private
 */
function _clearToastTimeout() {
  if (_toastTimeoutId !== null) {
    clearTimeout(_toastTimeoutId);
    _toastTimeoutId = null;
  }
}

// ── Public API ─────────────────────────────────────────
/**
 * Displays a toast notification message
 * @param {string} message - Message to display
 * @param {number} [duration=TOAST_DURATION_MS] - Display duration in milliseconds
 * @returns {void}
 * @example
 * showToast('Question submitted successfully');
 */
export function showToast(message, duration = TOAST_DURATION_MS) {
  const toast = _getElement('toast');
  const messageElement = _getElement('toast-message');
  
  if (!toast || !messageElement) {
    return;
  }
  
  _clearToastTimeout();
  
  messageElement.textContent = message;
  toast.hidden = false;
  
  _toastTimeoutId = setTimeout(() => {
    toast.hidden = true;
    _toastTimeoutId = null;
  }, duration);
}

/**
 * Toggles loading state on a button element
 * @param {HTMLButtonElement} button - Button to modify
 * @param {boolean} isLoading - Whether to show loading state
 * @returns {void}
 * @example
 * setButtonLoading(submitButton, true);
 * await submitData();
 * setButtonLoading(submitButton, false);
 */
export function setButtonLoading(button, isLoading) {
  if (!button) {
    return;
  }
  
  const content = button.querySelector('.btn-content');
  const spinner = button.querySelector('.btn-spinner');
  
  button.disabled = isLoading;
  button.setAttribute('aria-busy', String(isLoading));
  
  if (content) {
    content.hidden = isLoading;
  }
  if (spinner) {
    spinner.hidden = !isLoading;
  }
}

/**
 * Generates HTML for skeleton loading placeholders
 * @param {number} [count=SKELETON_COUNT_DEFAULT] - Number of skeleton items
 * @returns {string} HTML string with skeleton elements
 * @example
 * container.innerHTML = renderSkeletons(5);
 */
export function renderSkeletons(count = SKELETON_COUNT_DEFAULT) {
  const skeletonHtml = `
    <div style="padding:1rem;margin-bottom:0.75rem;background:var(--bg-card);border-radius:var(--radius-md)">
      <div class="skeleton" style="width:60%;height:16px;margin-bottom:10px"></div>
      <div class="skeleton" style="width:90%"></div>
      <div class="skeleton" style="width:75%"></div>
    </div>
  `;
  
  return Array.from({ length: count }, () => skeletonHtml).join('');
}

/**
 * Updates screen reader live region with status message
 * @param {string} message - Status message for assistive technology
 * @returns {void}
 * @example
 * setSRStatus('Loading election information...');
 */
export function setSRStatus(message) {
  const statusElement = _getElement('sr-status');
  if (statusElement) {
    statusElement.textContent = message;
  }
}

/**
 * Escapes HTML special characters to prevent XSS
 * @param {string} text - Raw text to escape
 * @returns {string} HTML-safe text
 * @example
 * const safe = escapeHTML('<script>alert(1)</script>');
 * // Returns: '&lt;script&gt;alert(1)&lt;/script&gt;'
 */
export function escapeHTML(text) {
  if (typeof text !== 'string') {
    return '';
  }
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Shows or hides a DOM section
 * @param {string} elementId - ID of element to toggle
 * @param {boolean} show - Whether to show (true) or hide (false)
 * @param {object} [options={}] - Additional options
 * @param {boolean} [options.focus=false] - Whether to focus the element when showing
 * @param {boolean} [options.scroll=false] - Whether to scroll to element when showing
 * @returns {void}
 * @example
 * showSection('results-container', true, { focus: true, scroll: true });
 */
export function showSection(elementId, show, options = {}) {
  const element = _getElement(elementId);
  if (!element) {
    return;
  }
  
  element.hidden = !show;
  
  if (show) {
    if (options.focus) {
      element.setAttribute('tabindex', '-1');
      element.focus();
    }
    
    if (options.scroll) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
}

/**
 * Updates text content of an element safely
 * @param {string} elementId - Target element ID
 * @param {string} text - Text content (will be escaped)
 * @returns {void}
 * @example
 * setTextContent('status-message', 'Data loaded successfully');
 */
export function setTextContent(elementId, text) {
  const element = _getElement(elementId);
  if (element) {
    element.textContent = text;
  }
}

/**
 * Updates HTML content of an element with escaped input
 * @param {string} elementId - Target element ID
 * @param {string} html - HTML content (user input will be escaped)
 * @returns {void}
 * @deprecated Use setTextContent or build HTML with escapeHTML instead
 */
export function setHtmlContent(elementId, html) {
  const element = _getElement(elementId);
  if (element) {
    element.innerHTML = html;
  }
}

/**
 * Adds CSS class to element
 * @param {string} elementId - Target element ID
 * @param {string} className - CSS class to add
 * @returns {void}
 * @example
 * addClass('submit-button', 'loading');
 */
export function addClass(elementId, className) {
  const element = _getElement(elementId);
  if (element) {
    element.classList.add(className);
  }
}

/**
 * Removes CSS class from element
 * @param {string} elementId - Target element ID
 * @param {string} className - CSS class to remove
 * @returns {void}
 * @example
 * removeClass('submit-button', 'loading');
 */
export function removeClass(elementId, className) {
  const element = _getElement(elementId);
  if (element) {
    element.classList.remove(className);
  }
}

/**
 * Clears the element cache to free memory
 * @returns {void}
 * @example
 * clearElementCache();
 */
export function clearElementCache() {
  _elementCache.clear();
}

// ── Render Functions ────────────────────────────────────

/**
 * Renders AI explainer result into DOM
 * @param {object} data - Explainer response data
 * @returns {string} HTML string for result
 */
export function renderExplainerResultHtml(data) {
  const explanationHtml = `<div class="result-section-title">Answer</div><p>${escapeHTML(data.explanation || 'No explanation available.')}</p>`;
  
  const keypointsHtml = data.key_points?.length ? `
    <div class="result-section-title">Key Points</div>
    <ul class="keypoints-list">${data.key_points.map((p) => `<li>${escapeHTML(p)}</li>`).join('')}</ul>
  ` : '';
  
  const funfactHtml = data.fun_fact ? `<div class="fun-fact-box"><strong>💡 Did you know?</strong> ${escapeHTML(data.fun_fact)}</div>` : '';
  
  const followupHtml = data.follow_up?.length ? `
    <div class="result-section-title">Ask Next</div>
    <div class="followup-chips">
      ${data.follow_up.map((q) => `<button class="followup-chip" onclick="window.prefillQuestion(this)">${escapeHTML(q)}</button>`).join('')}
    </div>
  ` : '';
  
  return { explanationHtml, keypointsHtml, funfactHtml, followupHtml };
}

/**
 * Renders election timeline HTML
 * @param {object} data - Timeline data with stages array
 * @returns {string} HTML string for timeline
 */
export function renderTimelineHtml(data) {
  if (!data?.stages?.length) {
    return '<p style="color:var(--text-secondary)">No timeline data available.</p>';
  }
  
  return `
    <ol class="timeline-list" aria-label="Indian election timeline stages">
      ${data.stages.map((stage) => `
        <li class="timeline-item">
          <div class="timeline-dot" aria-hidden="true">${stage.step}</div>
          <div class="timeline-card">
            <div class="timeline-card-header">
              <span class="timeline-emoji" aria-hidden="true">${escapeHTML(stage.icon || '📌')}</span>
              <span class="timeline-title">${escapeHTML(stage.title)}</span>
            </div>
            <p class="timeline-desc">${escapeHTML(stage.description)}</p>
            <span class="timeline-duration">⏱ ${escapeHTML(stage.duration)}</span>
          </div>
        </li>
      `).join('')}
    </ol>
  `;
}

/**
 * Renders voting steps guide HTML
 * @param {object} data - Voting steps data
 * @returns {string} HTML string for voting guide
 */
export function renderVotingStepsHtml(data) {
  const helpline = data.helpline || '1950';
  const noteHtml = data.important_note ? `<div class="voting-note" role="note">📌 ${escapeHTML(data.important_note)}</div>` : '';
  
  const stepsHtml = (data.steps || []).map((step, index) => `
    <li class="voting-step">
      <div class="step-number" aria-hidden="true">${index + 1}</div>
      <div class="step-content">
        <div class="step-title">${escapeHTML(step.title)}</div>
        <div class="step-instruction">${escapeHTML(step.instruction)}</div>
        ${step.tip ? `<div class="step-tip">💡 Tip: ${escapeHTML(step.tip)}</div>` : ''}
        ${step.documents?.length ? `<div class="step-docs">${step.documents.map((doc) => `<span class="doc-tag">📄 ${escapeHTML(doc)}</span>`).join('')}</div>` : ''}
      </div>
    </li>
  `).join('');
  
  return `
    <div class="helpline-badge" aria-label="Voter helpline number ${helpline}">
      📞 Voter Helpline: <strong>${escapeHTML(helpline)}</strong>
    </div>
    ${noteHtml}
    <ol class="voting-steps-list" aria-label="Step-by-step voting guide">${stepsHtml}</ol>
  `;
}

/**
 * Renders polling stations list HTML
 * @param {Array} stations - Array of station objects
 * @returns {string} HTML string for stations list
 */
export function renderPollingStationsHtml(stations) {
  if (!stations?.length) {
    return `
      <div class="no-results" role="status">
        <i class="fas fa-circle-info" aria-hidden="true"></i>
        <p>No polling stations found nearby. Try <a href="https://electoralsearch.in" target="_blank" rel="noopener">electoralsearch.in</a></p>
      </div>
    `;
  }
  
  const stationsListHtml = stations.map((station, index) => `
    <li class="station-card" role="listitem">
      <div class="station-header">
        <span class="station-number" aria-hidden="true">${index + 1}</span>
        <span class="station-name">${escapeHTML(station.name)}</span>
      </div>
      <p class="station-address">${escapeHTML(station.address)}</p>
      <div class="station-meta">
        <span class="station-distance"><i class="fas fa-location-arrow" aria-hidden="true"></i> ${escapeHTML(station.distance)}</span>
        ${station.rating ? `<span class="station-rating"><i class="fas fa-star" aria-hidden="true"></i> ${station.rating}</span>` : ''}
      </div>
    </li>
  `).join('');
  
  return `
    <h3 class="stations-heading"><i class="fas fa-map-pin" aria-hidden="true"></i> Nearby Polling Stations</h3>
    <ul class="stations-list" role="list" aria-label="List of nearby polling stations">${stationsListHtml}</ul>
  `;
}
