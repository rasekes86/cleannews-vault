// CleanNews Vault v2.0 - Fuzzy Search Utilities
// Trigram-based similarity scoring with weighted field matching

const CleanNewsSearch = (() => {

  // ── Trigram helpers ─────────────────────────────────────────────

  /**
   * Generate the set of character trigrams from a string.
   * Normalizes to lowercase first.
   * @param {string} text
   * @returns {Set<string>}
   */
  function _trigrams(text) {
    const str = '  ' + text.toLowerCase() + ' '; // pad for edge trigrams
    const set = new Set();
    for (let i = 0; i < str.length - 2; i++) {
      set.add(str.substring(i, i + 3));
    }
    return set;
  }

  /**
   * Sørensen–Dice coefficient between two trigram sets.
   * @param {Set<string>} a
   * @param {Set<string>} b
   * @returns {number} 0..1
   */
  function _diceCoefficient(a, b) {
    if (a.size === 0 && b.size === 0) return 1;
    if (a.size === 0 || b.size === 0) return 0;

    let intersection = 0;
    for (const tri of a) {
      if (b.has(tri)) intersection++;
    }

    return (2 * intersection) / (a.size + b.size);
  }

  // ── Scoring ─────────────────────────────────────────────────────

  /**
   * Calculate a match score for a single term against a single text field.
   * @param {string} text  - The field value
   * @param {string} term - A single search term
   * @returns {number} 0..1
   */
  function _scoreTerm(text, term) {
    if (!text || !term) return 0;

    const lowerText = text.toLowerCase();
    const lowerTerm = term.toLowerCase();

    // Exact full-text match
    if (lowerText === lowerTerm) return 1.0;

    // Starts with
    if (lowerText.startsWith(lowerTerm)) return 0.8;

    // Word-boundary starts-with
    const wordStartRegex = new RegExp('\\b' + _escapeRegex(lowerTerm), 'i');
    if (wordStartRegex.test(lowerText)) return 0.75;

    // Contains
    if (lowerText.includes(lowerTerm)) return 0.5;

    // Trigram fuzzy match
    const textTrigrams = _trigrams(text);
    const termTrigrams = _trigrams(term);
    const dice = _diceCoefficient(textTrigrams, termTrigrams);

    // Only return a fuzzy score if it's above a reasonable threshold
    if (dice >= 0.3) return dice * 0.5; // scale down so fuzzy doesn't beat contains

    return 0;
  }

  /**
   * Escape special regex characters.
   * @param {string} str
   * @returns {string}
   */
  function _escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // ── Field weights ───────────────────────────────────────────────

  const FIELD_WEIGHTS = {
    title: 3.0,
    tags: 2.0,
    author: 1.5,
    source: 1.2,
    contentText: 1.0,
    contentHtml: 0.8,
    excerpt: 1.0
  };

  // ── Public API ──────────────────────────────────────────────────

  return {
    /**
     * Compute a fuzzy match score between a text and a query.
     *
     * @param {string} text   - The text to match against
     * @param {string} query  - The search query (may contain multiple terms)
     * @returns {number} A score between 0 and 1
     */
    fuzzyMatch(text, query) {
      if (!text || !query) return 0;

      const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
      if (terms.length === 0) return 0;

      const scores = terms.map((term) => _scoreTerm(text, term));

      // Combine term scores: average of per-term scores
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

      // Bonus: if ALL terms match (score > 0), boost slightly
      const allMatch = scores.every((s) => s > 0);
      return Math.min(1, allMatch ? avgScore * 1.1 : avgScore);
    },

    /**
     * Search an array of articles, scoring and sorting by relevance.
     *
     * @param {Array<object>} articles - Array of article objects
     * @param {string}         query    - The search query
     * @returns {Array<object>} Articles sorted by relevance (best first)
     */
    search(articles, query) {
      if (!query || !query.trim()) {
        return [...articles];
      }

      const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
      if (terms.length === 0) return [...articles];

      const scored = articles.map((article) => {
        let totalScore = 0;

        for (const term of terms) {
          // Score each field
          for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
            let fieldValue = article[field];

            // Handle tags as an array
            if (field === 'tags' && Array.isArray(fieldValue)) {
              fieldValue = fieldValue.join(' ');
            }

            const termScore = _scoreTerm(fieldValue, term);
            totalScore += termScore * weight;
          }
        }

        // Normalize by number of terms
        totalScore /= terms.length;

        return { article, score: totalScore };
      });

      // Filter out zero-score results and sort descending
      return scored
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((s) => s.article);
    },

    /**
     * Highlight matching terms in text by wrapping them in `<mark>` tags.
     *
     * @param {string} text  - Plain text to highlight
     * @param {string} query - Search query
     * @returns {string} HTML string with <mark> tags
     */
    highlightMatches(text, query) {
      if (!text || !query || !query.trim()) {
        return _escapeHtml(text || '');
      }

      const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
      if (terms.length === 0) return _escapeHtml(text);

      let escaped = _escapeHtml(text);

      // Sort terms by length descending so longer matches take priority
      const sortedTerms = [...terms].sort((a, b) => b.length - a.length);

      // Track which character positions have already been wrapped
      // We'll use a simple placeholder approach to avoid nested marks
      const placeholders = [];
      let placeholderIdx = 0;

      sortedTerms.forEach((term) => {
        const regex = new RegExp(`(${_escapeRegex(_escapeHtml(term))})`, 'gi');
        escaped = escaped.replace(regex, (match) => {
          const ph = `\x00PH${placeholderIdx++}\x00`;
          placeholders.push({ ph, html: `<mark>${match}</mark>` });
          return ph;
        });
      });

      // Restore placeholders
      placeholders.forEach(({ ph, html }) => {
        escaped = escaped.split(ph).join(html);
      });

      return escaped;
    }
  };
})();

// ── Internal HTML escape ──────────────────────────────────────────
function _escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Export globally
if (typeof window !== 'undefined') {
  window.CleanNewsSearch = CleanNewsSearch;
}
