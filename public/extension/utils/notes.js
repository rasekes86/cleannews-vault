// CleanNews Vault v5.0 - Notes CRUD
// Singleton for managing notes stored in IndexedDB
// Note object: { id, title, content, color, articleId, tags, pinned, createdAt, updatedAt }

const CleanNewsNotes = (() => {
  'use strict';

  const STORE = 'notes';

  // ── ID generation ────────────────────────────────────────────────

  function _generateId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    return `note_${timestamp}_${random}`;
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
     * Get all notes, sorted by createdAt (newest first).
     * @returns {Promise<object[]>}
     */
    async getAll() {
      try {
        await _ensureInit();
        const notes = await CleanNewsDB.getAll(STORE);
        return notes.sort((a, b) => {
          // Pinned first, then by date
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
      } catch (err) {
        console.error('[CleanNewsNotes] getAll error:', err);
        return [];
      }
    },

    /**
     * Get a single note by ID.
     * @param {string} id
     * @returns {Promise<object|null>}
     */
    async get(id) {
      try {
        await _ensureInit();
        const note = await CleanNewsDB.get(STORE, id);
        return note || null;
      } catch (err) {
        console.error('[CleanNewsNotes] get error:', err);
        return null;
      }
    },

    /**
     * Save a new note.
     * @param {object} noteData - { title, content, color, articleId, tags, pinned }
     * @returns {Promise<{success: boolean, note?: object, error?: string}>}
     */
    async save(noteData) {
      try {
        await _ensureInit();
        const now = new Date().toISOString();
        const note = {
          id: _generateId(),
          title: noteData.title || 'Sin título',
          content: noteData.content || '',
          color: noteData.color || '#fef3c7',
          articleId: noteData.articleId || null,
          tags: Array.isArray(noteData.tags) ? noteData.tags : [],
          pinned: noteData.pinned || false,
          createdAt: now,
          updatedAt: now
        };
        await CleanNewsDB.add(STORE, note);
        return { success: true, note };
      } catch (err) {
        console.error('[CleanNewsNotes] save error:', err);
        return { success: false, error: err.message };
      }
    },

    /**
     * Update an existing note by ID with partial updates.
     * @param {string} id
     * @param {object} updates - Partial fields to update
     * @returns {Promise<{success: boolean, note?: object, error?: string}>}
     */
    async update(id, updates) {
      try {
        await _ensureInit();
        const note = await CleanNewsDB.get(STORE, id);
        if (!note) {
          return { success: false, error: 'Nota no encontrada' };
        }

        const updated = {
          ...note,
          ...updates,
          id: note.id,
          createdAt: note.createdAt,
          updatedAt: new Date().toISOString()
        };

        await CleanNewsDB.put(STORE, updated);
        return { success: true, note: updated };
      } catch (err) {
        console.error('[CleanNewsNotes] update error:', err);
        return { success: false, error: err.message };
      }
    },

    /**
     * Delete a note by ID.
     * @param {string} id
     * @returns {Promise<{success: boolean}>}
     */
    async delete(id) {
      try {
        await _ensureInit();
        await CleanNewsDB.delete(STORE, id);
        return { success: true };
      } catch (err) {
        console.error('[CleanNewsNotes] delete error:', err);
        return { success: false, error: err.message };
      }
    },

    /**
     * Get all notes associated with an article.
     * @param {string} articleId
     * @returns {Promise<object[]>}
     */
    async getByArticle(articleId) {
      try {
        await _ensureInit();
        const notes = await CleanNewsDB.getByIndex(STORE, 'articleId', articleId);
        return notes.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
      } catch (err) {
        console.error('[CleanNewsNotes] getByArticle error:', err);
        return [];
      }
    },

    /**
     * Search notes by query string. Matches against title, content, and tags.
     * @param {string} query
     * @returns {Promise<object[]>}
     */
    async search(query) {
      try {
        if (!query || !query.trim()) {
          return this.getAll();
        }

        const notes = await this.getAll();
        const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);

        return notes.filter((note) => {
          const haystack = [
            note.title,
            note.content,
            ...(note.tags || [])
          ].filter(Boolean).join(' ').toLowerCase();
          return terms.every((t) => haystack.includes(t));
        });
      } catch (err) {
        console.error('[CleanNewsNotes] search error:', err);
        return [];
      }
    }
  };
})();

// Export globally
if (typeof window !== 'undefined') {
  window.CleanNewsNotes = CleanNewsNotes;
}
