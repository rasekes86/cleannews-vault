// CleanNews Vault v5.0 - Game Reviews Search
// Search game reviews via web search URLs and DuckDuckGo Instant Answer API

const CleanNewsGameReviews = (() => {
  'use strict';

  // ── Constants ────────────────────────────────────────────────────

  const SEARCH_URL = 'https://duckduckgo.com/html/?q=';
  const INSTANT_ANSWER_URL = 'https://api.duckduckgo.com/?q=';

  // ── Private helpers ──────────────────────────────────────────────

  /**
   * Simple HTML text extraction (no DOM parsing needed for basic fetch)
   * @param {string} html
   * @param {string} tag
   * @returns {string}
   */
  function _extractBetween(html, startMarker, endMarker) {
    const startIdx = html.indexOf(startMarker);
    if (startIdx === -1) return '';
    const endIdx = html.indexOf(endMarker, startIdx + startMarker.length);
    if (endIdx === -1) return '';
    return html.substring(startIdx + startMarker.length, endIdx).trim();
  }

  /**
   * Remove HTML tags from a string
   * @param {string} html
   * @returns {string}
   */
  function _stripTags(html) {
    if (!html) return '';
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim();
  }

  /**
   * Build a search URL for game queries
   * @param {string} query
   * @returns {string}
   */
  function _buildSearchUrl(query) {
    const encoded = encodeURIComponent(query);
    return SEARCH_URL + encoded + '+review';
  }

  /**
   * Build DuckDuckGo Instant Answer API URL
   * @param {string} query
   * @returns {string}
   */
  function _buildInstantAnswerUrl(query) {
    const encoded = encodeURIComponent(query);
    return INSTANT_ANSWER_URL + encoded + '&format=json&no_html=1';
  }

  /**
   * Extract score from a text string (e.g. "8.5/10", "85%", "4.5 stars")
   * @param {string} text
   * @returns {number|null}
   */
  function _extractScore(text) {
    if (!text) return null;

    // Pattern: X/10 or X.X/10
    const match1 = text.match(/(\d+\.?\d*)\s*\/\s*10/);
    if (match1) {
      return { score: parseFloat(match1[1]), maxScore: 10 };
    }

    // Pattern: X/100
    const match2 = text.match(/(\d+)\s*\/\s*100/);
    if (match2) {
      return { score: parseFloat(match2[1]), maxScore: 100 };
    }

    // Pattern: X%
    const match3 = text.match(/(\d+\.?\d*)%/);
    if (match3) {
      return { score: parseFloat(match3[1]), maxScore: 100 };
    }

    // Pattern: X.X stars
    const match4 = text.match(/(\d+\.?\d*)\s*stars?\b/i);
    if (match4) {
      return { score: parseFloat(match4[1]), maxScore: 5 };
    }

    return null;
  }

  // ── Public API ──────────────────────────────────────────────────

  return {

    /**
     * Search for games by query. Returns game info from DuckDuckGo Instant Answer API.
     * @param {string} query - Game name to search
     * @returns {Promise<{title: string, platform: string, releaseYear: string}[]>}
     */
    async searchGames(query) {
      try {
        const url = _buildInstantAnswerUrl(query + ' video game');
        const response = await fetch(url);
        const data = await response.json();

        const games = [];

        // Check Abstract for game info
        if (data.Abstract) {
          games.push({
            title: data.Heading || query,
            platform: _stripTags(data.Abstract).substring(0, 100),
            releaseYear: data.Heading ? '' : ''
          });
        }

        // Check RelatedTopics for additional results
        if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
          for (const topic of data.RelatedTopics.slice(0, 5)) {
            if (topic.Text) {
              games.push({
                title: _stripTags(topic.Text).split(/[-–—|]/)[0].trim().substring(0, 80),
                platform: '',
                releaseYear: ''
              });
            }
          }
        }

        return games;
      } catch (err) {
        console.error('[CleanNewsGameReviews] searchGames error:', err);
        // Return a fallback game entry
        return [{ title: query, platform: '', releaseYear: '' }];
      }
    },

    /**
     * Search for game reviews. Constructs search URLs and parses basic HTML results.
     * Note: In Chrome extension context, use chrome.runtime.sendMessage to proxy fetch.
     * @param {string} gameName - Name of the game to find reviews for
     * @returns {Promise<{title: string, source: string, url: string, score: number, maxScore: number, excerpt: string, date: string, imageUrl: string}[]>}
     */
    async searchReviews(gameName) {
      try {
        const query = gameName + ' game review';
        const url = _buildInstantAnswerUrl(query);
        const response = await fetch(url);
        const data = await response.json();

        const reviews = [];

        // Process Abstract as main review source
        if (data.Abstract || data.AbstractText) {
          const text = data.AbstractText || data.Abstract || '';
          const scoreData = _extractScore(text);
          reviews.push({
            title: data.Heading || gameName + ' - Reseña',
            source: data.AbstractSource || 'DuckDuckGo',
            url: data.AbstractURL || '',
            score: scoreData ? scoreData.score : null,
            maxScore: scoreData ? scoreData.maxScore : 10,
            excerpt: _stripTags(text).substring(0, 300),
            date: '',
            imageUrl: data.Image || ''
          });
        }

        // Process RelatedTopics for additional review sources
        if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
          for (const topic of data.RelatedTopics.slice(0, 4)) {
            const topicText = topic.Text || '';
            if (topicText.length > 20) {
              const scoreData = _extractScore(topicText);
              reviews.push({
                title: _stripTags(topicText).split(/[-–—|]/)[0].trim().substring(0, 80),
                source: topic.FirstURL ? new URL(topic.FirstURL).hostname : '',
                url: topic.FirstURL || '',
                score: scoreData ? scoreData.score : null,
                maxScore: scoreData ? scoreData.maxScore : 10,
                excerpt: _stripTags(topicText).substring(0, 250),
                date: '',
                imageUrl: topic.Icon ? (topic.Icon.URL || '') : ''
              });
            }
          }
        }

        return reviews;
      } catch (err) {
        console.error('[CleanNewsGameReviews] searchReviews error:', err);
        return [];
      }
    },

    /**
     * Normalize any score to a 0-10 scale.
     * @param {number} score - The score value
     * @param {number} maxScore - The maximum possible score (10, 100, 5, etc.)
     * @returns {number} Score normalized to 0-10 scale
     */
    normalizeScore(score, maxScore) {
      if (typeof score !== 'number' || isNaN(score)) return null;
      maxScore = typeof maxScore === 'number' && maxScore > 0 ? maxScore : 10;
      return Math.round((score / maxScore) * 10 * 10) / 10; // Round to 1 decimal
    },

    /**
     * Get the DuckDuckGo search URL for a game review query.
     * Useful for opening in a new tab.
     * @param {string} gameName
     * @returns {string}
     */
    getSearchUrl(gameName) {
      return _buildSearchUrl(gameName + ' game review');
    }
  };
})();

// Export globally
if (typeof window !== 'undefined') {
  window.CleanNewsGameReviews = CleanNewsGameReviews;
}
