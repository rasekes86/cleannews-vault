// CleanNews Vault v5.1 - Game Reviews Search
// Fetches REAL review results by parsing DuckDuckGo HTML search
// Used by background.js service worker (has host_permissions for duckduckgo.com)

const CleanNewsGameReviews = (() => {
  'use strict';

  // ── Known gaming review sources ───────────────────────────
  var KNOWN_SOURCES = [
    { domain: 'ign.com', name: 'IGN' },
    { domain: 'gamespot.com', name: 'GameSpot' },
    { domain: 'eurogamer.net', name: 'Eurogamer' },
    { domain: 'pcgamer.com', name: 'PC Gamer' },
    { domain: 'polygon.com', name: 'Polygon' },
    { domain: '3djuegos.com', name: '3DJuegos' },
    { domain: 'vandal.net', name: 'Vandal' },
    { domain: 'metacritic.com', name: 'Metacritic' },
    { domain: 'kotaku.com', name: 'Kotaku' },
    { domain: 'destructoid.com', name: 'Destructoid' },
    { domain: 'rockpapershotgun.com', name: 'Rock Paper Shotgun' },
    { domain: 'pushsquare.com', name: 'Push Square' },
    { domain: 'nintendolife.com', name: 'Nintendo Life' },
    { domain: 'vg247.com', name: 'VG247' },
    { domain: 'gameinformer.com', name: 'Game Informer' },
    { domain: 'worthplaying.com', name: 'Worth Playing' },
    { domain: 'rpgamer.com', name: 'RPGamer' },
    { domain: 'hardcoregamer.com', name: 'Hardcore Gamer' },
    { domain: 'shacknews.com', name: 'Shacknews' },
    { domain: 'gematsu.com', name: 'Gematsu' },
    { domain: 'siliconera.com', name: 'Siliconera' },
    { domain: 'theverge.com', name: 'The Verge' },
    { domain: 'wired.com', name: 'Wired' },
    { domain: 'digitaltrends.com', name: 'Digital Trends' },
    { domain: 'screenrant.com', name: 'Screen Rant' },
    { domain: 'gamerant.com', name: 'Game Rant' }
  ];

  // ── Review-related keywords ─────────────────────────────────
  var REVIEW_KEYWORDS = ['review', 'reseña', 'resena', 'análisis', 'analisis', 'analysis',
    'puntuación', 'puntuacion', 'score', 'rating', 'veredicto', 'verdict',
    'jugabilidad', 'gameplay', 'gráficos', 'graficos', 'graphics', 'opinión', 'opinion'];

  // ── Private helpers ───────────────────────────────────────

  /**
   * Remove HTML tags from a string
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
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract the domain from a URL
   */
  function _getDomain(url) {
    if (!url) return '';
    try {
      return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    } catch (e) {
      return '';
    }
  }

  /**
   * Get a friendly source name from a domain
   */
  function _getSourceName(domain) {
    var found = KNOWN_SOURCES.find(function (s) {
      return domain.indexOf(s.domain) !== -1;
    });
    return found ? found.name : domain;
  }

  /**
   * Check if a result is likely a review (by URL and title keywords)
   */
  function _isReviewResult(url, title) {
    var lowerUrl = (url || '').toLowerCase();
    var lowerTitle = (title || '').toLowerCase();
    var combined = lowerUrl + ' ' + lowerTitle;

    return REVIEW_KEYWORDS.some(function (kw) {
      return combined.indexOf(kw) !== -1;
    });
  }

  /**
   * Try to extract a score from text
   */
  function _extractScore(text) {
    if (!text) return null;
    // X.X/10 or X/10
    var m1 = text.match(/(\d+\.?\d*)\s*\/\s*10/);
    if (m1) return { score: parseFloat(m1[1]), max: 10 };
    // X/100 or X%
    var m2 = text.match(/(\d+\.?\d*)\s*\/\s*100/);
    if (m2) return { score: parseFloat(m2[1]), max: 100 };
    var m3 = text.match(/(\d+\.?\d*)%/);
    if (m3) return { score: parseFloat(m3[1]), max: 100 };
    // X.X/5 stars
    var m4 = text.match(/(\d+\.?\d*)\s*\/?\s*5\s*stars?\b/i);
    if (m4) return { score: parseFloat(m4[1]), max: 5 };
    // "10/10" at start
    var m5 = text.match(/^(\d+\.?\d*)\s*\/\s*(\d+)/);
    if (m5) return { score: parseFloat(m5[1]), max: parseFloat(m5[2]) };
    return null;
  }

  /**
   * Generate a unique ID for a review result
   */
  function _generateId(prefix) {
    var ts = Date.now().toString(36);
    var rand = Math.random().toString(36).substring(2, 9);
    return (prefix || 'rev') + '_' + ts + '_' + rand;
  }

  /**
   * Parse DuckDuckGo HTML search results
   * @param {string} html - Raw HTML from DuckDuckGo
   * @param {string} gameName - Original search query
   * @returns {object[]}
   */
  function _parseDuckDuckGoHtml(html, gameName) {
    var results = [];

    // DuckDuckGo HTML results are in <div class="result results_links">
    // Each result has:
    //   <a class="result__a">  → title + URL
    //   <a class="result__snippet"> → snippet text
    //   <span class="result__url"> → display URL

    // Find all result blocks using regex (no DOM in service worker)
    var resultRegex = /<div[^>]*class="[^"]*result[^"]*results_links[^"]*"[^>]*>[\s\S]*?<\/div>\s*(?:<\/div>\s*)*?<\/div>/gi;
    var blocks = html.match(resultRegex);

    if (!blocks || blocks.length === 0) {
      // Fallback: try another pattern
      resultRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
      var titleMatches = [];
      var m;
      while ((m = resultRegex.exec(html)) !== null) {
        titleMatches.push(m);
      }

      titleMatches.forEach(function (match) {
        var hrefMatch = match[0].match(/href="([^"]*)"/);
        var titleText = _stripTags(match[1]);

        if (hrefMatch && titleText) {
          var url = hrefMatch[1];
          if (url.startsWith('//')) url = 'https:' + url;
          if (url.startsWith('/')) url = 'https://html.duckduckgo.com' + url;

          // Skip DuckDuckGo internal links
          if (url.indexOf('duckduckgo.com') !== -1 && url.indexOf('uddg=') === -1) return;
          if (url.indexOf('duckduckgo.com') !== -1 && url.indexOf('uddg=') !== -1) {
            // Extract the actual URL from DuckDuckGo redirect
            var uddgMatch = url.match(/uddg=([^&]*)/);
            if (uddgMatch) {
              try { url = decodeURIComponent(uddgMatch[1]); } catch (e) { return; }
            }
          }

          var domain = _getDomain(url);
          results.push({
            id: _generateId('rev'),
            title: titleText,
            url: url,
            source: _getSourceName(domain),
            domain: domain,
            excerpt: '',
            score: null,
            scoreMax: 10,
            imageUrl: '',
            isReview: _isReviewResult(url, titleText)
          });
        }
      });

      return results;
    }

    blocks.forEach(function (block) {
      // Extract title and URL
      var titleMatch = block.match(/<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
      if (!titleMatch) {
        titleMatch = block.match(/<a[^>]*href="([^"]*)"[^>]*class="[^"]*result__a[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
      }

      if (!titleMatch) return;

      var url = titleMatch[1];
      var title = _stripTags(titleMatch[2]);

      // Handle DuckDuckGo redirect URLs
      if (url.indexOf('uddg=') !== -1) {
        var uddgMatch = url.match(/uddg=([^&]*)/);
        if (uddgMatch) {
          try { url = decodeURIComponent(uddgMatch[1]); } catch (e) { return; }
        }
      }
      if (url.startsWith('//')) url = 'https:' + url;

      // Skip non-http links
      if (!url.startsWith('http')) return;
      // Skip DuckDuckGo own pages
      if (_getDomain(url).indexOf('duckduckgo') !== -1) return;

      // Extract snippet
      var snippetMatch = block.match(/<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i)
        || block.match(/class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|span|div)>/i);
      var snippet = snippetMatch ? _stripTags(snippetMatch[1]) : '';

      var domain = _getDomain(url);

      // Try to extract score from title or snippet
      var scoreData = _extractScore(title) || _extractScore(snippet);

      results.push({
        id: _generateId('rev'),
        title: title,
        url: url,
        source: _getSourceName(domain),
        domain: domain,
        excerpt: snippet,
        score: scoreData ? scoreData.score : null,
        scoreMax: scoreData ? scoreData.max : 10,
        imageUrl: '',
        isReview: _isReviewResult(url, title)
      });
    });

    return results;
  }

  // ── Public API ─────────────────────────────────────────────

  return {

    /**
     * Search for game reviews via DuckDuckGo HTML search.
     * MUST be called from background.js (needs host_permissions).
     *
     * @param {string} gameName - Name of the game to search
     * @returns {Promise<object[]>} Array of review results
     */
    async searchReviews(gameName) {
      if (!gameName || !gameName.trim()) return [];

      var query = encodeURIComponent(gameName.trim() + ' game review reseña análisis');
      var searchUrl = 'https://html.duckduckgo.com/html/?q=' + query;

      try {
        var response = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
          }
        });

        if (!response.ok) {
          console.error('[GameReviews] HTTP error:', response.status);
          return [];
        }

        var html = await response.text();
        var results = _parseDuckDuckGoHtml(html, gameName.trim());

        // Sort: review results first, then by known source
        results.sort(function (a, b) {
          // Prioritize actual review results
          if (a.isReview && !b.isReview) return -1;
          if (!a.isReview && b.isReview) return 1;

          // Then prioritize known gaming sources
          var aKnown = KNOWN_SOURCES.some(function (s) { return a.domain.indexOf(s.domain) !== -1; });
          var bKnown = KNOWN_SOURCES.some(function (s) { return b.domain.indexOf(s.domain) !== -1; });
          if (aKnown && !bKnown) return -1;
          if (!aKnown && bKnown) return 1;

          return 0;
        });

        // Limit to 15 results
        return results.slice(0, 15);

      } catch (err) {
        console.error('[GameReviews] searchReviews error:', err);
        return [];
      }
    },

    /**
     * Normalize a score to 0-10 scale
     * @param {number} score
     * @param {number} maxScore
     * @returns {number|null}
     */
    normalizeScore(score, maxScore) {
      if (typeof score !== 'number' || isNaN(score)) return null;
      maxScore = typeof maxScore === 'number' && maxScore > 0 ? maxScore : 10;
      return Math.round((score / maxScore) * 10 * 10) / 10;
    },

    /**
     * Get a direct DuckDuckGo search URL (for opening in a new tab)
     * @param {string} gameName
     * @returns {string}
     */
    getSearchUrl(gameName) {
      return 'https://duckduckgo.com/?q=' + encodeURIComponent(gameName + ' game review reseña');
    }
  };
})();

// Export globally
if (typeof window !== 'undefined') {
  window.CleanNewsGameReviews = CleanNewsGameReviews;
}
if (typeof self !== 'undefined') {
  self.CleanNewsGameReviews = CleanNewsGameReviews;
}
