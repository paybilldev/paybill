import {URL} from 'node:url';
import net from 'node:net';

/**
 * Cache compiled allow-list regexes
 */
let cachedAllowList: RegExp[] | null = null;

/**
 * Parse and cache URI allow list from env
 *
 * Expected env format:
 *   URI_ALLOW_LIST="^https://app.example.com,^myapp://.*"
 */
export function getUriAllowList(): RegExp[] {
  if (cachedAllowList) {
    return cachedAllowList;
  }

  const raw = process.env.URI_ALLOW_LIST;

  if (!raw || raw.trim() === '') {
    cachedAllowList = [];
    return cachedAllowList;
  }

  cachedAllowList = raw
    .split(',')
    .map(pattern => pattern.trim())
    .filter((pattern): pattern is string => pattern.length > 0)
    .map(pattern => {
      try {
        return new RegExp(pattern);
      } catch {
        throw new Error(`Invalid URI_ALLOW_LIST regex: ${pattern}`);
      }
    });

  return cachedAllowList;
}

/**
 * Regex that matches decimal IPs like "2130706433"
 */
const DECIMAL_IP_REGEX = /^\d+$/;

/**
 * Conservative hostname validation (mirrors Go)
 */
const REGULAR_HOSTNAME_REGEX =
  /^(?=.{1,253}$)(?!-)[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*$/;

/**
 * Validate redirect / origin URL
 * Mirrors utilities.IsRedirectURLValid from Go
 */
export function isRedirectURLValid(redirectURL: string | undefined): boolean {
  if (!redirectURL) {
    return false;
  }

  let baseURL: URL;
  let refURL: URL;

  try {
    const siteURL = process.env.SITE_URL;
    if (!siteURL) {
      return false;
    }

    baseURL = new URL(siteURL);
    refURL = new URL(redirectURL);
  } catch {
    return false;
  }

  // Same hostname as site URL → OK
  if (baseURL.hostname === refURL.hostname) {
    return true;
  }

  const scheme = refURL.protocol.replace(':', '').toLowerCase();
  const isHttp = scheme === 'http' || scheme === 'https';

  // Decimal IPs are forbidden
  if (DECIMAL_IP_REGEX.test(refURL.hostname)) {
    return false;
  }

  // IP literals
  const ipType = net.isIP(refURL.hostname);
  if (ipType !== 0) {
    // Only loopback IPs are allowed
    return refURL.hostname === '127.0.0.1' || refURL.hostname === '::1';
  }

  // Hostname contains invalid characters
  if (isHttp && !REGULAR_HOSTNAME_REGEX.test(refURL.hostname)) {
    return false;
  }

  // Allow-list matching (strip fragment)
  const matchAgainst = redirectURL.split('#')[0] ?? redirectURL;
  const allowList = getUriAllowList();

  return allowList.some(pattern => pattern.test(matchAgainst));
}
