// CleanNews Vault v2.0 - URL Utilities
// Normalize URLs, compare pages, extract domains and paths

const CleanNewsUrl = (() => {

  /**
   * Comprehensive list of tracking / analytics parameters to strip from URLs.
   */
  const TRACKING_PARAMS = new Set([
    // Google Analytics / Ads
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    '_ga', '_gl', 'gclid',
    // Facebook / Meta
    'fbclid',
    // Microsoft Ads
    'msclkid',
    // HubSpot
    '_hsenc', '_hsmi', 'hsCtaTracking',
    // Mailchimp
    'mc_eid', 'mc_cid',
    // Vero
    'vero_id',
    'mkt_tok',
    // Yandex
    '_openstat', 'yclid',
    // Wicked Reports
    'wickedid',
    // DoubleClick
    'dclid',
    // Generic (often used for tracking)
    'ref', 'source', 'medium', 'campaign',
    // Others
    'oly_anon_id', 'spm', 'scm'
  ]);

  /**
   * Normalize a URL by removing tracking params, trailing slashes, and hash fragments.
   * Lowercases the hostname.
   *
   * @param {string} url - The raw URL string
   * @returns {string} The normalized URL
   */
  function normalize(url) {
    if (!url || typeof url !== 'string') return '';

    try {
      const parsed = new URL(url.trim());

      // Lowercase hostname
      parsed.hostname = parsed.hostname.toLowerCase();

      // Remove tracking parameters
      const params = new URLSearchParams(parsed.search);
      for (const key of Array.from(params.keys())) {
        if (TRACKING_PARAMS.has(key.toLowerCase())) {
          params.delete(key);
        }
      }
      parsed.search = params.toString() ? '?' + params.toString() : '';

      // Remove hash fragment
      parsed.hash = '';

      // Remove trailing slash (but keep root '/' as-is)
      let pathname = parsed.pathname;
      if (pathname.length > 1 && pathname.endsWith('/')) {
        pathname = pathname.replace(/\/+$/, '');
      }
      parsed.pathname = pathname;

      // Remove port if it's the default for the protocol
      if (
        (parsed.protocol === 'https:' && parsed.port === '443') ||
        (parsed.protocol === 'http:' && parsed.port === '80')
      ) {
        parsed.port = '';
      }

      return parsed.toString();
    } catch (e) {
      // Fallback: basic cleanup
      return url.trim().split('#')[0];
    }
  }

  /**
   * Compare two URLs after normalization.
   *
   * @param {string} url1
   * @param {string} url2
   * @returns {boolean}
   */
  function isSamePage(url1, url2) {
    if (!url1 && !url2) return true;
    if (!url1 || !url2) return false;
    return normalize(url1) === normalize(url2);
  }

  /**
   * Extract the domain (hostname) from a URL.
   *
   * @param {string} url
   * @returns {string}
   */
  function getDomain(url) {
    if (!url) return '';
    try {
      return new URL(url.trim()).hostname.toLowerCase();
    } catch (e) {
      // Attempt a basic extraction
      const match = url.match(/(?:https?:\/\/)?([^\/\?#]+)/i);
      return match ? match[1].toLowerCase() : '';
    }
  }

  /**
   * Extract the path from a URL without query parameters or hash.
   *
   * @param {string} url
   * @returns {string}
   */
  function extractPath(url) {
    if (!url) return '';
    try {
      const parsed = new URL(url.trim());
      return parsed.pathname || '/';
    } catch (e) {
      // Fallback: strip domain and query
      const match = url.match(/(?:https?:\/\/)?[^\/]*([\/][^\?#]*)/i);
      return match ? match[1] : '/';
    }
  }

  return {
    normalize,
    isSamePage,
    getDomain,
    extractPath,
    TRACKING_PARAMS
  };
})();

// Export globally
if (typeof window !== 'undefined') {
  window.CleanNewsUrl = CleanNewsUrl;
}
