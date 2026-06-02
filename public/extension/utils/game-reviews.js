// CleanNews Vault v5.2 - Game Reviews Search
// DuckDuckGo HTML search + RAWG API + Steam Store API
// Full content extraction via readability.js

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
    { domain: 'hardcoregamer.com', name: 'Hardcore Gamer' },
    { domain: 'shacknews.com', name: 'Shacknews' },
    { domain: 'gematsu.com', name: 'Gematsu' },
    { domain: 'siliconera.com', name: 'Siliconera' },
    { domain: 'gamerant.com', name: 'Game Rant' }
  ];

  var REVIEW_KEYWORDS = ['review', 'reseña', 'resena', 'análisis', 'analisis', 'analysis',
    'puntuación', 'puntuacion', 'score', 'rating', 'veredicto', 'verdict',
    'jugabilidad', 'gameplay', 'gráficos', 'graficos', 'graphics', 'opinión', 'opinion'];

  // ── Private helpers ───────────────────────────────────────

  function _stripTags(html) {
    if (!html) return '';
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function _getDomain(url) {
    if (!url) return '';
    try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch (e) { return ''; }
  }

  function _getSourceName(domain) {
    var found = KNOWN_SOURCES.find(function (s) { return domain.indexOf(s.domain) !== -1; });
    return found ? found.name : domain;
  }

  function _isReviewResult(url, title) {
    var combined = ((url || '') + ' ' + (title || '')).toLowerCase();
    return REVIEW_KEYWORDS.some(function (kw) { return combined.indexOf(kw) !== -1; });
  }

  function _extractScore(text) {
    if (!text) return null;
    var m1 = text.match(/(\d+\.?\d*)\s*\/\s*10/);
    if (m1) return { score: parseFloat(m1[1]), max: 10 };
    var m2 = text.match(/(\d+\.?\d*)\s*\/\s*100/);
    if (m2) return { score: parseFloat(m2[1]), max: 100 };
    var m3 = text.match(/(\d+\.?\d*)%/);
    if (m3) return { score: parseFloat(m3[1]), max: 100 };
    var m4 = text.match(/(\d+\.?\d*)\s*\/?\s*5\s*stars?\b/i);
    if (m4) return { score: parseFloat(m4[1]), max: 5 };
    return null;
  }

  function _generateId(prefix) {
    var ts = Date.now().toString(36);
    var rand = Math.random().toString(36).substring(2, 9);
    return (prefix || 'rev') + '_' + ts + '_' + rand;
  }

  // ── DuckDuckGo HTML Parser (existing) ──────────────────────

  function _parseDuckDuckGoHtml(html) {
    var results = [];
    var resultRegex = /<div[^>]*class="[^"]*result[^"]*results_links[^"]*"[^>]*>[\s\S]*?<\/div>\s*(?:<\/div>\s*)*?<\/div>/gi;
    var blocks = html.match(resultRegex);

    if (!blocks || blocks.length === 0) {
      resultRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
      var m;
      while ((m = resultRegex.exec(html)) !== null) {
        var hrefMatch = m[0].match(/href="([^"]*)"/);
        var titleText = _stripTags(m[1]);
        if (hrefMatch && titleText) {
          var url = hrefMatch[1];
          if (url.startsWith('//')) url = 'https:' + url;
          if (url.indexOf('uddg=') !== -1) {
            var uddgMatch = url.match(/uddg=([^&]*)/);
            if (uddgMatch) { try { url = decodeURIComponent(uddgMatch[1]); } catch (e) { continue; } }
          }
          var domain = _getDomain(url);
          results.push({
            id: _generateId('rev'), title: titleText, url: url,
            source: _getSourceName(domain), domain: domain, excerpt: '',
            score: null, scoreMax: 10, imageUrl: '', isReview: _isReviewResult(url, titleText)
          });
        }
      }
      return results;
    }

    blocks.forEach(function (block) {
      var titleMatch = block.match(/<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
      if (!titleMatch) titleMatch = block.match(/<a[^>]*href="([^"]*)"[^>]*class="[^"]*result__a[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
      if (!titleMatch) return;

      var url = titleMatch[1];
      var title = _stripTags(titleMatch[2]);
      if (url.indexOf('uddg=') !== -1) {
        var uddgMatch = url.match(/uddg=([^&]*)/);
        if (uddgMatch) { try { url = decodeURIComponent(uddgMatch[1]); } catch (e) { return; } }
      }
      if (url.startsWith('//')) url = 'https:' + url;
      if (!url.startsWith('http')) return;
      if (_getDomain(url).indexOf('duckduckgo') !== -1) return;

      var snippetMatch = block.match(/<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i)
        || block.match(/class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|span|div)>/i);
      var snippet = snippetMatch ? _stripTags(snippetMatch[1]) : '';
      var domain = _getDomain(url);
      var scoreData = _extractScore(title) || _extractScore(snippet);

      results.push({
        id: _generateId('rev'), title: title, url: url,
        source: _getSourceName(domain), domain: domain, excerpt: snippet,
        score: scoreData ? scoreData.score : null, scoreMax: scoreData ? scoreData.max : 10,
        imageUrl: '', isReview: _isReviewResult(url, title)
      });
    });
    return results;
  }

  // ── Steam Store API ────────────────────────────────────────
  // Public API, no key needed

  /**
   * Search games on Steam Store
   * @param {string} gameName
   * @returns {Promise<object|null>}
   */
  async function searchSteam(gameName) {
    if (!gameName || !gameName.trim()) return null;
    var query = encodeURIComponent(gameName.trim());

    try {
      // Step 1: Search for the game
      var searchUrl = 'https://store.steampowered.com/api/storesearch/?term=' + query + '&l=spanish&cc=ES';
      var searchResp = await fetch(searchUrl, {
        headers: { 'Accept': 'application/json' }
      });
      if (!searchResp.ok) return null;
      var searchData = await searchResp.json();

      if (!searchData.items || searchData.items.length === 0) return null;

      // Get the best match (first result)
      var bestMatch = null;
      var exactMatch = searchData.items.find(function (item) {
        return item.name && item.name.toLowerCase() === gameName.trim().toLowerCase();
      });
      bestMatch = exactMatch || searchData.items[0];

      var appId = bestMatch.id;
      var tinyImage = bestMatch.tiny_image || '';

      // Step 2: Get full app details
      var detailsUrl = 'https://store.steampowered.com/api/appdetails?appids=' + appId + '&cc=ES&l=spanish';
      var detailsResp = await fetch(detailsUrl, {
        headers: { 'Accept': 'application/json' }
      });
      if (!detailsResp.ok) return null;
      var detailsData = await detailsResp.json();

      var appData = detailsData[appId];
      if (!appData || !appData.success || !appData.data) {
        // Fallback: return basic info from search
        return {
          name: bestMatch.name || gameName,
          image: tinyImage,
          platforms: bestMatch.platform ? _parseSteamPlatform(bestMatch.platform) : [],
          price: bestMatch.price ? _formatSteamPrice(bestMatch.price) : null,
          metascore: bestMatch.metascore || null,
          reviewScore: null,
          reviewCount: 0,
          releaseDate: '',
          developers: [],
          genres: [],
          shortDescription: '',
          storeUrl: 'https://store.steampowered.com/app/' + appId,
          steamAppId: appId
        };
      }

      var data = appData.data;
      var platforms = [];
      if (data.platforms) {
        if (data.platforms.windows) platforms.push({ name: 'Windows', icon: '🪟' });
        if (data.platforms.mac) platforms.push({ name: 'Mac', icon: '🍎' });
        if (data.platforms.linux) platforms.push({ name: 'Linux', icon: '🐧' });
      }

      var genres = (data.genres || []).map(function (g) { return g.description; });

      var price = null;
      if (data.price_overview) {
        price = {
          final: (data.price_overview.final / 100).toFixed(2),
          original: data.price_overview.initial ? (data.price_overview.initial / 100).toFixed(2) : null,
          discount: data.price_overview.discount_percent || 0,
          currency: data.price_overview.currency || 'EUR',
          free: data.price_overview.final === 0
        };
      } else if (data.is_free) {
        price = { final: '0.00', original: null, discount: 0, currency: 'EUR', free: true };
      }

      var reviewScore = null;
      var reviewCount = 0;
      if (data.steam_appid && data.steam_appid > 0) {
        // Use recommendations from appdetails if available
        if (data.recommendations) {
          reviewCount = data.recommendations.total || 0;
        }
      }

      var releaseDate = '';
      if (data.release_date) {
        releaseDate = data.release_date.date || '';
      }

      return {
        name: data.name || bestMatch.name || gameName,
        image: data.header_image || tinyImage,
        platforms: platforms,
        price: price,
        metascore: data.metacritic ? data.metacritic.score : null,
        reviewScore: reviewScore,
        reviewCount: reviewCount,
        releaseDate: releaseDate,
        developers: data.developers || [],
        publishers: data.publishers || [],
        genres: genres,
        categories: (data.categories || []).map(function (c) { return c.description; }),
        shortDescription: data.short_description || '',
        storeUrl: 'https://store.steampowered.com/app/' + appId,
        steamAppId: appId
      };
    } catch (err) {
      console.error('[GameReviews] searchSteam error:', err);
      return null;
    }
  }

  function _parseSteamPlatform(platform) {
    // Steam search returns platform as object {windows: true, mac: false, linux: false}
    // or as string
    if (typeof platform === 'object') {
      var p = [];
      if (platform.windows) p.push({ name: 'Windows', icon: '🪟' });
      if (platform.mac) p.push({ name: 'Mac', icon: '🍎' });
      if (platform.linux) p.push({ name: 'Linux', icon: '🐧' });
      return p;
    }
    return [{ name: 'PC', icon: '🪟' }];
  }

  function _formatSteamPrice(priceData) {
    if (!priceData) return null;
    return {
      final: (priceData.final / 100).toFixed(2),
      original: priceData.initial ? (priceData.initial / 100).toFixed(2) : null,
      discount: priceData.discount_percent || 0,
      currency: 'EUR',
      free: priceData.final === 0
    };
  }

  /**
   * Get Steam user review summary for an app
   * Uses the review API endpoint
   */
  async function getSteamReviews(appId) {
    if (!appId) return null;
    try {
      var url = 'https://store.steampowered.com/appreviews/' + appId +
        '?json=1&num_per_page=0&purchase_type=all&language=spanish';
      var resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!resp.ok) return null;
      var data = await resp.json();
      return {
        reviewScore: data.review_score || null,
        reviewScoreDesc: data.review_score_desc || '',
        totalReviews: data.total_reviews || 0,
        totalPositive: data.total_positive || 0,
        totalNegative: data.total_negative || 0,
        totalReviewsPercentage: data.total_review_percentage || 0
      };
    } catch (err) {
      console.error('[GameReviews] getSteamReviews error:', err);
      return null;
    }
  }

  // ── RAWG API ───────────────────────────────────────────────
  // Requires free API key from rawg.io/apidocs

  /**
   * Search games on RAWG
   * @param {string} gameName
   * @param {string} apiKey
   * @returns {Promise<object|null>}
   */
  async function searchRAWG(gameName, apiKey) {
    if (!gameName || !gameName.trim() || !apiKey) return null;
    var query = encodeURIComponent(gameName.trim());

    try {
      var url = 'https://api.rawg.io/api/games?key=' + apiKey +
        '&search=' + query + '&page_size=1&page=1';
      var resp = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });
      if (!resp.ok) {
        if (resp.status === 401 || resp.status === 403) {
          return { error: 'Clave RAWG inválida' };
        }
        return null;
      }
      var data = await resp.json();

      if (!data.results || data.results.length === 0) return null;

      var game = data.results[0];

      // Get detailed game info
      var detailUrl = 'https://api.rawg.io/api/games/' + game.id + '?key=' + apiKey;
      var detailResp = await fetch(detailUrl, {
        headers: { 'Accept': 'application/json' }
      });
      var detail = detailResp.ok ? await detailResp.json() : null;

      var platforms = (detail && detail.platforms) ?
        detail.platforms.map(function (p) { return p.platform ? p.platform.name : ''; }).filter(Boolean) :
        (game.platforms || []).map(function (p) { return typeof p === 'string' ? p : (p.platform ? p.platform.name : ''); }).filter(Boolean);

      var genres = (game.genres || []).map(function (g) { return g.name; });

      var stores = (detail && detail.stores) ?
        detail.stores.map(function (s) { return { name: s.store ? s.store.name : '', url: s.url || '' }; }) : [];

      return {
        name: game.name || gameName,
        image: game.background_image || '',
        rating: game.rating || null,
        ratingTop: game.rating_top || null,
        metacritic: detail ? detail.metacritic : (game.metacritic || null),
        platforms: platforms,
        genres: genres,
        released: game.released || '',
        playtime: game.playtime || 0,
        playtimeHours: Math.floor(game.playtime || 0),
        shortDescription: (detail && detail.description_raw) ? detail.description_raw.substring(0, 500) : '',
        stores: stores,
        website: detail ? detail.website : '',
        developers: (detail && detail.developers) ? detail.developers.map(function (d) { return d.name; }) : [],
        rawgUrl: 'https://rawg.io/games/' + game.slug
      };
    } catch (err) {
      console.error('[GameReviews] searchRAWG error:', err);
      return null;
    }
  }

  // ── Public API ─────────────────────────────────────────────

  return {

    /**
     * Search for game reviews via DuckDuckGo HTML search.
     */
    async searchReviews(gameName) {
      if (!gameName || !gameName.trim()) return [];
      var query = encodeURIComponent(gameName.trim() + ' game review reseña análisis');
      var searchUrl = 'https://html.duckduckgo.com/html/?q=' + query;
      try {
        var response = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
          }
        });
        if (!response.ok) return [];
        var html = await response.text();
        var results = _parseDuckDuckGoHtml(html);
        results.sort(function (a, b) {
          if (a.isReview && !b.isReview) return -1;
          if (!a.isReview && b.isReview) return 1;
          var aKnown = KNOWN_SOURCES.some(function (s) { return a.domain.indexOf(s.domain) !== -1; });
          var bKnown = KNOWN_SOURCES.some(function (s) { return b.domain.indexOf(s.domain) !== -1; });
          if (aKnown && !bKnown) return -1;
          if (!aKnown && bKnown) return 1;
          return 0;
        });
        return results.slice(0, 15);
      } catch (err) {
        console.error('[GameReviews] searchReviews error:', err);
        return [];
      }
    },

    /**
     * Search Steam for game data (no API key needed)
     * @param {string} gameName
     * @returns {Promise<object|null>}
     */
    searchSteam: searchSteam,

    /**
     * Get Steam user reviews for an app
     * @param {number|string} appId
     * @returns {Promise<object|null>}
     */
    getSteamReviews: getSteamReviews,

    /**
     * Search RAWG for game data (requires API key)
     * @param {string} gameName
     * @param {string} apiKey
     * @returns {Promise<object|null>}
     */
    searchRAWG: searchRAWG,

    /**
     * Normalize a score to 0-10 scale
     */
    normalizeScore(score, maxScore) {
      if (typeof score !== 'number' || isNaN(score)) return null;
      maxScore = typeof maxScore === 'number' && maxScore > 0 ? maxScore : 10;
      return Math.round((score / maxScore) * 10 * 10) / 10;
    },

    /**
     * Get a direct DuckDuckGo search URL
     */
    getSearchUrl(gameName) {
      return 'https://duckduckgo.com/?q=' + encodeURIComponent(gameName + ' game review reseña');
    }
  };
})();

// Export globally
if (typeof window !== 'undefined') { window.CleanNewsGameReviews = CleanNewsGameReviews; }
if (typeof self !== 'undefined') { self.CleanNewsGameReviews = CleanNewsGameReviews; }
