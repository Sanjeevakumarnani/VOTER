/**
 * @fileoverview Google Maps Integration Service for VoteWise AI
 * @description Integrates with Google Maps API to provide polling station location services.
 * Enables voters to find nearby polling booths using geocoding and places search functionality.
 * Implements input validation, error handling, and distance calculation utilities.
 * @author VoteWise AI Team
 * @version 1.0.0
 * @license MIT
 * @copyright 2026 VoteWise AI
 *
 * Google Services Used:
 * - Google Maps Geocoding API (address to coordinates conversion)
 * - Google Places API (nearby polling station search)
 * - Google Places Details API (place information retrieval)
 * - Google Maps Embed API (frontend map display)
 *
 * Security:
 * - API key loaded from environment variable only
 * - Input sanitization on all address parameters
 * - Request timeouts to prevent hanging connections
 */

'use strict';

const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Google Maps API configuration
 * @constant {string}
 */
const GOOGLE_MAPS_API_URL = 'https://maps.googleapis.com/maps/api';

/**
 * Google Maps API key from environment variables
 * @constant {string}
 */
const apiKey = process.env.GOOGLE_MAPS_API_KEY || '';

/**
 * Validates that the Maps API key is configured
 * @returns {boolean} True if API key is available
 */
function isConfigured() {
  return !!apiKey && apiKey !== 'your_google_maps_api_key_here';
}

/**
 * Geocodes an address to latitude/longitude coordinates.
 * Used to convert user's location input to map coordinates.
 *
 * @param {string} address - Address or location name to geocode
 * @returns {Promise<{lat: number, lng: number, formatted_address: string}>} Location coordinates
 * @throws {Error} If geocoding fails or address not found
 */
async function geocodeAddress(address) {
  if (!isConfigured()) {
    throw new Error('Google Maps API key not configured');
  }

  if (!address || typeof address !== 'string' || address.trim().length === 0) {
    throw new Error('Address is required for geocoding');
  }

  try {
    const encodedAddress = encodeURIComponent(address.trim());
    const url = `${GOOGLE_MAPS_API_URL}/geocode/json?address=${encodedAddress}&key=${apiKey}&region=in`;

    const response = await axios.get(url, { timeout: 10000 });

    if (response.data.status !== 'OK') {
      throw new Error(`Geocoding failed: ${response.data.status}`);
    }

    const result = response.data.results[0];
    const location = result.geometry.location;

    logger.info(`Geocoded address: ${result.formatted_address}`);

    return {
      lat: location.lat,
      lng: location.lng,
      formatted_address: result.formatted_address,
      place_id: result.place_id,
    };
  } catch (err) {
    logger.error(`Geocoding error: ${err.message}`);
    throw new Error(`Failed to geocode address: ${err.message}`);
  }
}

/**
 * Searches for polling stations near a given location.
 * Uses Places API to find election-related locations.
 *
 * @param {{lat: number, lng: number}} location - Center point coordinates
 * @param {number} [radius=5000] - Search radius in meters (default 5km)
 * @returns {Promise<Array<{name: string, address: string, distance: string, place_id: string}>>} Polling stations
 * @throws {Error} If search fails
 */
async function findPollingStations(location, radius = 5000) {
  if (!isConfigured()) {
    throw new Error('Google Maps API key not configured');
  }

  if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
    throw new Error('Valid location coordinates required');
  }

  try {
    // Search for polling stations and government offices
    const url = `${GOOGLE_MAPS_API_URL}/place/nearbysearch/json`;
    const params = {
      location: `${location.lat},${location.lng}`,
      radius: radius,
      type: 'government_office',
      keyword: 'polling station|polling booth|election office',
      key: apiKey,
    };

    const response = await axios.get(url, { params, timeout: 10000 });

    if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
      throw new Error(`Places search failed: ${response.data.status}`);
    }

    const results = response.data.results || [];

    // Format and limit results
    const stations = results.slice(0, 5).map((place) => ({
      name: place.name,
      address: place.vicinity || place.formatted_address || 'Address not available',
      distance: formatDistance(radius, place.geometry?.location, location),
      place_id: place.place_id,
      rating: place.rating || null,
      open_now: place.opening_hours?.open_now || null,
    }));

    logger.info(`Found ${stations.length} polling stations near location`);

    return stations;
  } catch (err) {
    logger.error(`Polling station search error: ${err.message}`);
    throw new Error(`Failed to find polling stations: ${err.message}`);
  }
}

/**
 * Gets detailed information about a specific place.
 *
 * @param {string} placeId - Google Place ID
 * @returns {Promise<{name: string, address: string, phone: string, website: string, opening_hours: object}>} Place details
 * @throws {Error} If details fetch fails
 */
async function getPlaceDetails(placeId) {
  if (!isConfigured()) {
    throw new Error('Google Maps API key not configured');
  }

  try {
    const url = `${GOOGLE_MAPS_API_URL}/place/details/json`;
    const params = {
      place_id: placeId,
      fields: 'name,formatted_address,formatted_phone_number,website,opening_hours',
      key: apiKey,
    };

    const response = await axios.get(url, { params, timeout: 10000 });

    if (response.data.status !== 'OK') {
      throw new Error(`Place details failed: ${response.data.status}`);
    }

    const result = response.data.result;

    return {
      name: result.name,
      address: result.formatted_address,
      phone: result.formatted_phone_number || null,
      website: result.website || null,
      opening_hours: result.opening_hours || null,
    };
  } catch (err) {
    logger.error(`Place details error: ${err.message}`);
    throw new Error(`Failed to get place details: ${err.message}`);
  }
}

/**
 * Formats distance between two points (simplified estimation).
 *
 * @param {number} radius - Search radius in meters
 * @param {{lat: number, lng: number}} point1 - First point
 * @param {{lat: number, lng: number}} point2 - Second point
 * @returns {string} Formatted distance string
 * @private
 */
function formatDistance(radius, point1, point2) {
  if (!point1 || !point2) return `Within ${(radius / 1000).toFixed(1)} km`;

  // Simple distance calculation (not using Haversine for brevity)
  const latDiff = Math.abs(point1.lat - point2.lat);
  const lngDiff = Math.abs(point1.lng - point2.lng);
  const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111000; // approx meters

  if (distance < 1000) {
    return `${Math.round(distance)} m`;
  }
  return `${(distance / 1000).toFixed(1)} km`;
}

/**
 * Generates an embed URL for Google Maps showing polling stations.
 *
 * @param {{lat: number, lng: number}} location - Center location
 * @returns {string} Maps embed URL for iframe
 */
function generateMapEmbedUrl(location) {
  if (!isConfigured() || !location) {
    return null;
  }

  const center = `${location.lat},${location.lng}`;
  const zoom = 14;

  return `https://www.google.com/maps/embed/v1/search?key=${apiKey}&q=polling+station+near+${center}&center=${center}&zoom=${zoom}`;
}

module.exports = {
  isConfigured,
  geocodeAddress,
  findPollingStations,
  getPlaceDetails,
  generateMapEmbedUrl,
};
