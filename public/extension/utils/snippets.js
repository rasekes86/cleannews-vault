// CleanNews Vault v5.0 - Snippets CRUD
// Singleton for managing text snippets saved from web pages
// Snippet object: { id, text, note, sourceUrl, sourceTitle, tags, articleId, createdAt }

const CleanNewsSnippets = (() => {
  'use strict';

  const STORE = 'snippets';

  // ── ID generation ────────────────────────────────────────────────

  function _generateId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    return `snip_${timestamp}_${random}`;
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
     * Get all snippets, sorted by createdAt (newest first).
     * @returns {Promise<object[]>}
     */
    async getAll() {
      try {
        await _ensureInit();
        const snippets = await CleanNewsDB.getAll(STORE);
        return snippets.sort((a, b) => {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
      } catch (err) {
        console.error('[CleanNewsSnippets] getAll error:', err);
        return [];
      }
    },

    /**
     * Get a single snippet by ID.
     * @param {string} id
     * @returns {Promise<object|null>}
     */
    async get(id) {
      try {
        await _ensureInit();
        const snippet = await CleanNewsDB.get(STORE, id);
        return snippet || null;
      } catch (err) {
        console.error('[CleanNewsSnippets] get error:', err);
        return null;
      }
    },

    /**
     * Save a new snippet.
     * @param {object} snippetData - { text, note, sourceUrl, sourceTitle, tags, articleId }
     * @returns {Promise<{success: boolean, snippet?: object, error?: string}>}
     */
    async save(snippetData) {
      try {
        await _ensureInit();
        const now = new Date().toISOString();
        const snippet = {
          id: _generateId(),
          text: snippetData.text || '',
          note: snippetData.note || '',
          sourceUrl: snippetData.sourceUrl || '',
          sourceTitle: snippetData.sourceTitle || '',
          tags: Array.isArray(snippetData.tags) ? snippetData.tags : [],
          articleId: snippetData.articleId || null,
          createdAt: now
        };
        await CleanNewsDB.add(STORE, snippet);
        return { success: true, snippet };
      } catch (err) {
        console.error('[CleanNewsSnippets] save error:', err);
        return { success: false, error: err.message };
      }
    },

    /**
     * Update an existing snippet by ID with partial updates.
     * @param {string} id
     * @param {object} updates - Partial fields to update
     * @returns {Promise<{success: boolean, snippet?: object, error?: string}>}
     */
    async update(id, updates) {
      try {
        await _ensureInit();
        const snippet = await CleanNewsDB.get(STORE, id);
        if (!snippet) {
          return { success: false, error: 'Fragmento no encontrado' };
        }

        const updated = {
          ...snippet,
          ...updates,
          id: snippet.id,
          createdAt: snippet.createdAt
        };

        await CleanNewsDB.put(STORE, updated);
        return { success: true, snippet: updated };
      } catch (err) {
        console.error('[CleanNewsSnippets] update error:', err);
        return { success: false, error: err.message };
      }
    },

    /**
     * Delete a snippet by ID.
     * @param {string} id
     * @returns {Promise<{success: boolean}>}
     */
    async delete(id) {
      try {
        await _ensureInit();
        await CleanNewsDB.delete(STORE, id);
        return { success: true };
      } catch (err) {
        console.error('[CleanNewsSnippets] delete error:', err);
        return { success: false, error: err.message };
      }
    },

    /**
     * Search snippets by query string. Matches against text, note, sourceTitle, and tags.
     * @param {string} query
     * @returns {Promise<object[]>}
     */
    async search(query) {
      try {
        if (!query || !query.trim()) {
          return this.getAll();
        }

        const snippets = await this.getAll();
        const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);

        return snippets.filter((snippet) => {
          const haystack = [
            snippet.text,
            snippet.note,
            snippet.sourceTitle,
            ...(snippet.tags || [])
          ].filter(Boolean).join(' ').toLowerCase();
          return terms.every((t) => haystack.includes(t));
        });
      } catch (err) {
        console.error('[CleanNewsSnippets] search error:', err);
        return [];
      }
    }
  };
})();

// Export globally
if (typeof window !== 'undefined') {
  window.CleanNewsSnippets = CleanNewsSnippets;
}
