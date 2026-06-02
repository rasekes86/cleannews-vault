// CleanNews Vault v5.0 - Highlights CRUD
// Singleton for managing text highlights stored in IndexedDB
// Highlight object: { id, articleId, text, color, note, startOffset, endOffset, createdAt }

const CleanNewsHighlights = (() => {
  'use strict';

  const STORE = 'highlights';

  // ── ID generation ────────────────────────────────────────────────

  function _generateId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    return `hl_${timestamp}_${random}`;
  }

  // ── Private helpers ──────────────────────────────────────────────

  async function _ensureInit() {
    if (typeof CleanNewsDB !== 'undefined') {
      await CleanNewsDB.init();
    }
  }

  // ── Public API ──────────────────────────────────────────────────

  return {

    /**
     * Get all highlights, sorted by createdAt (newest first).
     * @returns {Promise<object[]>}
     */
    async getAll() {
      try {
        await _ensureInit();
        const highlights = await CleanNewsDB.getAll(STORE);
        return highlights.sort((a, b) => {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
      } catch (err) {
        console.error('[CleanNewsHighlights] getAll error:', err);
        return [];
      }
    },

    /**
     * Get a single highlight by ID.
     * @param {string} id
     * @returns {Promise<object|null>}
     */
    async get(id) {
      try {
        await _ensureInit();
        const highlight = await CleanNewsDB.get(STORE, id);
        return highlight || null;
      } catch (err) {
        console.error('[CleanNewsHighlights] get error:', err);
        return null;
      }
    },

    /**
     * Save a new highlight.
     * @param {object} highlightData - { articleId, text, color, note, startOffset, endOffset }
     * @returns {Promise<{success: boolean, highlight?: object, error?: string}>}
     */
    async save(highlightData) {
      try {
        await _ensureInit();
        const now = new Date().toISOString();
        const highlight = {
          id: _generateId(),
          articleId: highlightData.articleId || null,
          text: highlightData.text || '',
          color: highlightData.color || '#fbbf24',
          note: highlightData.note || '',
          startOffset: typeof highlightData.startOffset === 'number' ? highlightData.startOffset : null,
          endOffset: typeof highlightData.endOffset === 'number' ? highlightData.endOffset : null,
          createdAt: now
        };
        await CleanNewsDB.add(STORE, highlight);
        return { success: true, highlight };
      } catch (err) {
        console.error('[CleanNewsHighlights] save error:', err);
        return { success: false, error: err.message };
      }
    },

    /**
     * Delete a highlight by ID.
     * @param {string} id
     * @returns {Promise<{success: boolean}>}
     */
    async delete(id) {
      try {
        await _ensureInit();
        await CleanNewsDB.delete(STORE, id);
        return { success: true };
      } catch (err) {
        console.error('[CleanNewsHighlights] delete error:', err);
        return { success: false, error: err.message };
      }
    },

    /**
     * Get all highlights for a specific article.
     * @param {string} articleId
     * @returns {Promise<object[]>}
     */
    async getByArticle(articleId) {
      try {
        await _ensureInit();
        const highlights = await CleanNewsDB.getByIndex(STORE, 'articleId', articleId);
        return highlights.sort((a, b) => {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
      } catch (err) {
        console.error('[CleanNewsHighlights] getByArticle error:', err);
        return [];
      }
    },

    /**
     * Delete all highlights for a specific article.
     * @param {string} articleId
     * @returns {Promise<{success: boolean, deleted: number}>}
     */
    async deleteByArticle(articleId) {
      try {
        await _ensureInit();
        const highlights = await CleanNewsDB.getByIndex(STORE, 'articleId', articleId);
        let deleted = 0;
        for (const hl of highlights) {
          await CleanNewsDB.delete(STORE, hl.id);
          deleted++;
        }
        return { success: true, deleted };
      } catch (err) {
        console.error('[CleanNewsHighlights] deleteByArticle error:', err);
        return { success: false, deleted: 0, error: err.message };
      }
    }
  };
})();

// Export globally
if (typeof window !== 'undefined') {
  window.CleanNewsHighlights = CleanNewsHighlights;
}
