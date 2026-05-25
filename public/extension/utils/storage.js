// CleanNews Vault v2.0 - Complete Storage Layer
// Uses CleanNewsDB (IndexedDB) for all persistent operations.
// Exports: window.CleanNewsStorage

const CleanNewsStorage = (() => {
  'use strict';

  const STORES = {
    articles: 'articles',
    collections: 'collections',
    settings: 'settings'
  };

  // ── ID generation ──────────────────────────────────────────────

  /**
   * Generate a unique ID with an optional prefix.
   * @param {string} [prefix='id'] - e.g. 'art', 'col', 'set'
   * @returns {string}
   */
  function generateId(prefix = 'id') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    return `${prefix}_${timestamp}_${random}`;
  }

  // ── URL normalization helper ───────────────────────────────────

  /**
   * Normalize a URL for duplicate checking. Uses CleanNewsUrl.normalize
   * if available, otherwise falls back to basic normalization.
   * @param {string} url
   * @returns {string}
   */
  function _normalizeUrl(url) {
    if (typeof CleanNewsUrl !== 'undefined' && CleanNewsUrl.normalize) {
      return CleanNewsUrl.normalize(url);
    }
    // Basic fallback
    if (!url) return '';
    try {
      const u = new URL(url.trim());
      return u.origin + u.pathname.replace(/\/+$/, '') + u.search;
    } catch {
      return url.trim().split('#')[0];
    }
  }

  // ── Collection defaults ────────────────────────────────────────

  const DEFAULT_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
    '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#78716c'
  ];

  function _randomColor() {
    return DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];
  }

  // ── Public API ──────────────────────────────────────────────────

  return {

    // ─────────────────────────────────────────────────────────────
    // ARTICLES
    // ─────────────────────────────────────────────────────────────

    /**
     * Get all articles from the database.
     * @returns {Promise<object[]>}
     */
    async getArticles() {
      try {
        return await CleanNewsDB.getAll(STORES.articles);
      } catch (err) {
        console.error('[CleanNewsStorage] getArticles error:', err);
        return [];
      }
    },

    /**
     * Save a new article. Checks for duplicates via normalized sourceUrl.
     *
     * @param {object} articleData - Raw article data from extraction
     * @returns {Promise<{success: boolean, article?: object, error?: string}>}
     */
    async saveArticle(articleData) {
      try {
        // Check duplicate by normalized URL
        if (articleData.sourceUrl) {
          const normalizedUrl = _normalizeUrl(articleData.sourceUrl);
          const allArticles = await this.getArticles();
          const duplicate = allArticles.find(
            (a) => a.sourceUrl && _normalizeUrl(a.sourceUrl) === normalizedUrl
          );
          if (duplicate) {
            return { success: false, error: 'Este artículo ya está guardado', existingArticle: duplicate };
          }
        }

        const now = new Date().toISOString();
        const article = {
          id: generateId('art'),
          title: articleData.title || 'Sin título',
          author: articleData.author || '',
          source: articleData.source || '',
          sourceUrl: articleData.sourceUrl || '',
          contentHtml: articleData.contentHtml || '',
          contentText: articleData.contentText || articleData.content || '',
          excerpt: articleData.excerpt || '',
          featuredImage: articleData.featuredImage || '',
          publishedAt: articleData.publishedAt || '',
          savedAt: now,
          wordCount: articleData.wordCount || 0,
          readTime: articleData.readTime || 0,
          tags: articleData.tags || [],
          collectionIds: articleData.collectionIds || [],
          notes: articleData.notes || '',
          favorite: articleData.favorite || false,
          readProgress: articleData.readProgress || 0,
          readAt: articleData.readAt || null,
          createdAt: now,
          updatedAt: now
        };

        await CleanNewsDB.add(STORES.articles, article);
        return { success: true, article };
      } catch (err) {
        console.error('[CleanNewsStorage] saveArticle error:', err);
        return { success: false, error: err.message };
      }
    },

    /**
     * Get a single article by ID.
     * @param {string} id
     * @returns {Promise<object|null>}
     */
    async getArticle(id) {
      try {
        const article = await CleanNewsDB.get(STORES.articles, id);
        return article || null;
      } catch (err) {
        console.error('[CleanNewsStorage] getArticle error:', err);
        return null;
      }
    },

    /**
     * Update an article by ID with partial updates.
     * @param {string} id
     * @param {object} updates
     * @returns {Promise<{success: boolean, article?: object, error?: string}>}
     */
    async updateArticle(id, updates) {
      try {
        const article = await CleanNewsDB.get(STORES.articles, id);
        if (!article) {
          return { success: false, error: 'Artículo no encontrado' };
        }

        const updated = {
          ...article,
          ...updates,
          id: article.id,          // prevent id overwrite
          createdAt: article.createdAt, // prevent createdAt overwrite
          updatedAt: new Date().toISOString()
        };

        await CleanNewsDB.put(STORES.articles, updated);
        return { success: true, article: updated };
      } catch (err) {
        console.error('[CleanNewsStorage] updateArticle error:', err);
        return { success: false, error: err.message };
      }
    },

    /**
     * Delete an article by ID.
     * @param {string} id
     * @returns {Promise<{success: boolean}>}
     */
    async deleteArticle(id) {
      try {
        await CleanNewsDB.delete(STORES.articles, id);
        return { success: true };
      } catch (err) {
        console.error('[CleanNewsStorage] deleteArticle error:', err);
        return { success: false, error: err.message };
      }
    },

    // ─────────────────────────────────────────────────────────────
    // TAGS & SOURCES
    // ─────────────────────────────────────────────────────────────

    /**
     * Get all unique tags across all articles.
     * @returns {Promise<string[]>}
     */
    async getTags() {
      try {
        const articles = await this.getArticles();
        const tagSet = new Set();
        articles.forEach((a) => {
          if (a.tags && Array.isArray(a.tags)) {
            a.tags.forEach((t) => { if (t) tagSet.add(t); });
          }
        });
        return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
      } catch (err) {
        console.error('[CleanNewsStorage] getTags error:', err);
        return [];
      }
    },

    /**
     * Get all unique sources across all articles.
     * @returns {Promise<string[]>}
     */
    async getSources() {
      try {
        const articles = await this.getArticles();
        const sourceSet = new Set();
        articles.forEach((a) => {
          if (a.source) sourceSet.add(a.source);
        });
        return Array.from(sourceSet).sort((a, b) => a.localeCompare(b));
      } catch (err) {
        console.error('[CleanNewsStorage] getSources error:', err);
        return [];
      }
    },

    // ─────────────────────────────────────────────────────────────
    // SEARCH & FILTER
    // ─────────────────────────────────────────────────────────────

    /**
     * Fuzzy search across articles. Uses CleanNewsSearch if available,
     * otherwise falls back to simple text search.
     *
     * @param {string} query
     * @returns {Promise<object[]>}
     */
    async searchArticles(query) {
      if (!query || !query.trim()) {
        return this.getArticles();
      }

      try {
        const articles = await this.getArticles();

        if (typeof CleanNewsSearch !== 'undefined' && CleanNewsSearch.search) {
          return CleanNewsSearch.search(articles, query);
        }

        // Fallback: simple includes-based search
        const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
        return articles.filter((article) => {
          const haystack = [
            article.title, article.contentText, article.source,
            article.author, article.excerpt,
            ...(article.tags || [])
          ].filter(Boolean).join(' ').toLowerCase();
          return terms.every((t) => haystack.includes(t));
        });
      } catch (err) {
        console.error('[CleanNewsStorage] searchArticles error:', err);
        return [];
      }
    },

    /**
     * Filter articles with multiple criteria.
     *
     * @param {object} options
     * @param {string}   [options.query]          - Text search
     * @param {string[]} [options.tags]            - Filter by tags (any match)
     * @param {string[]} [options.sources]         - Filter by sources (any match)
     * @param {string[]} [options.collectionIds]   - Filter by collection membership
     * @param {boolean}  [options.favoritesOnly]   - Only favorites
     * @param {string}   [options.readStatus]      - 'unread', 'reading', 'read'
     * @param {string}   [options.sortBy]          - 'date', 'title', 'source', 'readTime', 'wordCount'
     * @param {string}   [options.sortDir]         - 'asc' or 'desc'
     * @returns {Promise<object[]>}
     */
    async filterArticles(options = {}) {
      try {
        let articles = await this.getArticles();

        const {
          query, tags, sources, collectionIds,
          favoritesOnly, readStatus, sortBy = 'date', sortDir = 'desc'
        } = options;

        // Text search
        if (query && query.trim()) {
          if (typeof CleanNewsSearch !== 'undefined' && CleanNewsSearch.search) {
            articles = CleanNewsSearch.search(articles, query);
          } else {
            const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
            articles = articles.filter((a) => {
              const haystack = [
                a.title, a.contentText, a.source, a.author, a.excerpt,
                ...(a.tags || [])
              ].filter(Boolean).join(' ').toLowerCase();
              return terms.every((t) => haystack.includes(t));
            });
          }
        }

        // Tag filter
        if (tags && tags.length > 0) {
          articles = articles.filter((a) => {
            if (!a.tags || !Array.isArray(a.tags)) return false;
            return tags.some((tag) => a.tags.includes(tag));
          });
        }

        // Source filter
        if (sources && sources.length > 0) {
          articles = articles.filter((a) => sources.includes(a.source));
        }

        // Collection filter
        if (collectionIds && collectionIds.length > 0) {
          articles = articles.filter((a) => {
            if (!a.collectionIds || !Array.isArray(a.collectionIds)) return false;
            return collectionIds.some((cid) => a.collectionIds.includes(cid));
          });
        }

        // Favorites only
        if (favoritesOnly) {
          articles = articles.filter((a) => a.favorite);
        }

        // Read status filter
        if (readStatus) {
          articles = articles.filter((a) => {
            switch (readStatus) {
              case 'unread': return a.readProgress === 0;
              case 'reading': return a.readProgress > 0 && a.readProgress < 100;
              case 'read': return a.readProgress >= 100;
              default: return true;
            }
          });
        }

        // Sorting
        const dir = sortDir === 'asc' ? 1 : -1;
        articles.sort((a, b) => {
          switch (sortBy) {
            case 'title':
              return dir * (a.title || '').localeCompare(b.title || '');
            case 'source':
              return dir * (a.source || '').localeCompare(b.source || '');
            case 'readTime':
              return dir * ((a.readTime || 0) - (b.readTime || 0));
            case 'wordCount':
              return dir * ((a.wordCount || 0) - (b.wordCount || 0));
            case 'date':
            default:
              return dir * (new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          }
        });

        return articles;
      } catch (err) {
        console.error('[CleanNewsStorage] filterArticles error:', err);
        return [];
      }
    },

    // ─────────────────────────────────────────────────────────────
    // STATS
    // ─────────────────────────────────────────────────────────────

    /**
     * Get aggregated statistics.
     * @returns {Promise<object>}
     */
    async getStats() {
      try {
        const articles = await this.getArticles();
        const collections = await this.getCollections();
        const tags = await this.getTags();
        const sources = await this.getSources();

        const totalFavorites = articles.filter((a) => a.favorite).length;
        const totalWords = articles.reduce((sum, a) => sum + (a.wordCount || 0), 0);
        const totalRead = articles.filter((a) => a.readProgress >= 100).length;
        const totalReadProgress = articles.reduce((sum, a) => sum + (a.readProgress || 0), 0);
        const avgReadProgress = articles.length > 0
          ? Math.round(totalReadProgress / articles.length)
          : 0;

        return {
          totalArticles: articles.length,
          totalTags: tags.length,
          totalSources: sources.length,
          totalCollections: collections.length,
          totalFavorites,
          totalWords,
          totalRead,
          avgReadProgress
        };
      } catch (err) {
        console.error('[CleanNewsStorage] getStats error:', err);
        return {
          totalArticles: 0, totalTags: 0, totalSources: 0,
          totalCollections: 0, totalFavorites: 0, totalWords: 0,
          totalRead: 0, avgReadProgress: 0
        };
      }
    },

    // ─────────────────────────────────────────────────────────────
    // COLLECTIONS
    // ─────────────────────────────────────────────────────────────

    /**
     * Get all collections.
     * @returns {Promise<object[]>}
     */
    async getCollections() {
      try {
        return await CleanNewsDB.getAll(STORES.collections);
      } catch (err) {
        console.error('[CleanNewsStorage] getCollections error:', err);
        return [];
      }
    },

    /**
     * Create a new collection.
     * @param {string} name
     * @param {string} [description='']
     * @param {string} [color] - Hex color string; defaults to random
     * @returns {Promise<object>} The created collection
     */
    async createCollection(name, description = '', color) {
      const now = new Date().toISOString();
      const collection = {
        id: generateId('col'),
        name: name || 'Sin nombre',
        description: description || '',
        color: color || _randomColor(),
        icon: '📁',
        createdAt: now,
        updatedAt: now
      };
      await CleanNewsDB.put(STORES.collections, collection);
      return collection;
    },

    /**
     * Update a collection.
     * @param {string} id
     * @param {object} updates
     * @returns {Promise<object>} The updated collection
     */
    async updateCollection(id, updates) {
      const collection = await CleanNewsDB.get(STORES.collections, id);
      if (!collection) throw new Error('Colección no encontrada');

      const updated = {
        ...collection,
        ...updates,
        id: collection.id,
        createdAt: collection.createdAt,
        updatedAt: new Date().toISOString()
      };
      await CleanNewsDB.put(STORES.collections, updated);
      return updated;
    },

    /**
     * Delete a collection and remove its ID from all articles.
     * @param {string} id
     * @returns {Promise<{success: boolean}>}
     */
    async deleteCollection(id) {
      try {
        await CleanNewsDB.delete(STORES.collections, id);

        // Remove collection ID from all articles that reference it
        const articles = await this.getArticles();
        for (const article of articles) {
          if (article.collectionIds && article.collectionIds.includes(id)) {
            const updated = article.collectionIds.filter((cid) => cid !== id);
            await CleanNewsDB.put(STORES.articles, {
              ...article,
              collectionIds: updated,
              updatedAt: new Date().toISOString()
            });
          }
        }

        return { success: true };
      } catch (err) {
        console.error('[CleanNewsStorage] deleteCollection error:', err);
        return { success: false, error: err.message };
      }
    },

    /**
     * Get all articles belonging to a collection.
     * @param {string} collectionId
     * @returns {Promise<object[]>}
     */
    async getCollectionArticles(collectionId) {
      try {
        const articles = await this.getArticles();
        return articles.filter(
          (a) => a.collectionIds && a.collectionIds.includes(collectionId)
        );
      } catch (err) {
        console.error('[CleanNewsStorage] getCollectionArticles error:', err);
        return [];
      }
    },

    /**
     * Add an article to a collection.
     * @param {string} articleId
     * @param {string} collectionId
     * @returns {Promise<{success: boolean}>}
     */
    async addArticleToCollection(articleId, collectionId) {
      try {
        const article = await CleanNewsDB.get(STORES.articles, articleId);
        if (!article) return { success: false, error: 'Artículo no encontrado' };

        const collectionIds = [...(article.collectionIds || [])];
        if (collectionIds.includes(collectionId)) {
          return { success: true }; // Already in collection
        }

        collectionIds.push(collectionId);
        await CleanNewsDB.put(STORES.articles, {
          ...article,
          collectionIds,
          updatedAt: new Date().toISOString()
        });

        return { success: true };
      } catch (err) {
        console.error('[CleanNewsStorage] addArticleToCollection error:', err);
        return { success: false, error: err.message };
      }
    },

    /**
     * Remove an article from a collection.
     * @param {string} articleId
     * @param {string} collectionId
     * @returns {Promise<{success: boolean}>}
     */
    async removeArticleFromCollection(articleId, collectionId) {
      try {
        const article = await CleanNewsDB.get(STORES.articles, articleId);
        if (!article) return { success: false, error: 'Artículo no encontrado' };

        const collectionIds = (article.collectionIds || []).filter(
          (cid) => cid !== collectionId
        );

        await CleanNewsDB.put(STORES.articles, {
          ...article,
          collectionIds,
          updatedAt: new Date().toISOString()
        });

        return { success: true };
      } catch (err) {
        console.error('[CleanNewsStorage] removeArticleFromCollection error:', err);
        return { success: false, error: err.message };
      }
    },

    // ─────────────────────────────────────────────────────────────
    // FAVORITES & READING PROGRESS
    // ─────────────────────────────────────────────────────────────

    /**
     * Toggle favorite status on an article.
     * @param {string} articleId
     * @returns {Promise<{success: boolean, favorite: boolean}>}
     */
    async toggleFavorite(articleId) {
      try {
        const article = await CleanNewsDB.get(STORES.articles, articleId);
        if (!article) return { success: false, favorite: false };

        const favorite = !article.favorite;
        await CleanNewsDB.put(STORES.articles, {
          ...article,
          favorite,
          updatedAt: new Date().toISOString()
        });

        return { success: true, favorite };
      } catch (err) {
        console.error('[CleanNewsStorage] toggleFavorite error:', err);
        return { success: false, favorite: false };
      }
    },

    /**
     * Update reading progress on an article.
     * @param {string} articleId
     * @param {number} progress - 0 to 100
     * @returns {Promise<{success: boolean}>}
     */
    async updateReadProgress(articleId, progress) {
      try {
        const article = await CleanNewsDB.get(STORES.articles, articleId);
        if (!article) return { success: false };

        const clampedProgress = Math.max(0, Math.min(100, progress || 0));
        await CleanNewsDB.put(STORES.articles, {
          ...article,
          readProgress: clampedProgress,
          updatedAt: new Date().toISOString()
        });

        return { success: true };
      } catch (err) {
        console.error('[CleanNewsStorage] updateReadProgress error:', err);
        return { success: false };
      }
    },

    /**
     * Mark an article as fully read (progress = 100).
     * @param {string} articleId
     * @returns {Promise<{success: boolean}>}
     */
    async markAsRead(articleId) {
      return this.updateReadProgress(articleId, 100).then(async (result) => {
        if (result.success) {
          const article = await CleanNewsDB.get(STORES.articles, articleId);
          if (article) {
            await CleanNewsDB.put(STORES.articles, {
              ...article,
              readAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        }
        return result;
      });
    },

    /**
     * Mark an article as unread (progress = 0).
     * @param {string} articleId
     * @returns {Promise<{success: boolean}>}
     */
    async markAsUnread(articleId) {
      return this.updateReadProgress(articleId, 0).then(async (result) => {
        if (result.success) {
          const article = await CleanNewsDB.get(STORES.articles, articleId);
          if (article) {
            await CleanNewsDB.put(STORES.articles, {
              ...article,
              readAt: null,
              updatedAt: new Date().toISOString()
            });
          }
        }
        return result;
      });
    },

    // ─────────────────────────────────────────────────────────────
    // BACKUP & RESTORE
    // ─────────────────────────────────────────────────────────────

    /**
     * Export all data (articles + collections) as a JSON string.
     * @returns {Promise<string>}
     */
    async exportBackup() {
      try {
        const articles = await this.getArticles();
        const collections = await this.getCollections();

        const backup = {
          version: 2,
          exportDate: new Date().toISOString(),
          app: 'CleanNews Vault',
          articles,
          collections
        };

        return JSON.stringify(backup, null, 2);
      } catch (err) {
        console.error('[CleanNewsStorage] exportBackup error:', err);
        return JSON.stringify({ version: 2, exportDate: new Date().toISOString(), articles: [], collections: [] });
      }
    },

    /**
     * Import data from a backup JSON string.
     * @param {string} jsonString
     * @returns {Promise<{success: boolean, count: number}>}
     */
    async importBackup(jsonString) {
      try {
        const data = JSON.parse(jsonString);

        let articles = [];
        let collections = [];

        // Support both v1 (flat array) and v2 (structured) formats
        if (Array.isArray(data)) {
          articles = data;
        } else if (data && data.articles) {
          articles = data.articles;
          collections = data.collections || [];
        } else {
          return { success: false, count: 0 };
        }

        let imported = 0;

        // Import collections first
        for (const col of collections) {
          if (col.id && col.name) {
            const existing = await CleanNewsDB.get(STORES.collections, col.id);
            if (!existing) {
              await CleanNewsDB.put(STORES.collections, col);
            }
          }
        }

        // Import articles (check duplicates)
        for (const article of articles) {
          if (!article.id || !article.sourceUrl) continue;

          // Check duplicate by normalized URL
          const normalizedUrl = _normalizeUrl(article.sourceUrl);
          const existing = await CleanNewsDB.get(STORES.articles, article.id);

          if (!existing) {
            // Also check by URL
            try {
              const byUrl = await CleanNewsDB.getByIndex(STORES.articles, 'sourceUrl', normalizedUrl);
              if (byUrl && byUrl.length > 0) continue;
            } catch {
              // Index lookup may fail if URL is slightly different; fall through
            }

            // Ensure all required fields
            const now = new Date().toISOString();
            const normalized = {
              ...article,
              contentHtml: article.contentHtml || article.contentText || '',
              contentText: article.contentText || article.content || '',
              tags: article.tags || [],
              collectionIds: article.collectionIds || [],
              notes: article.notes || '',
              favorite: article.favorite || false,
              readProgress: article.readProgress || 0,
              readAt: article.readAt || null,
              createdAt: article.createdAt || now,
              updatedAt: article.updatedAt || now
            };

            await CleanNewsDB.put(STORES.articles, normalized);
            imported++;
          }
        }

        return { success: true, count: imported };
      } catch (err) {
        console.error('[CleanNewsStorage] importBackup error:', err);
        return { success: false, count: 0 };
      }
    },

    // ─────────────────────────────────────────────────────────────
    // LEGACY MIGRATION
    // ─────────────────────────────────────────────────────────────

    /**
     * Migrate articles from chrome.storage.local (v1) to IndexedDB (v2).
     * Reads from key 'cleannews_vault_articles' and imports any articles
     * not already present in the database.
     *
     * @returns {Promise<{migrated: number}>}
     */
    async migrateFromLegacy() {
      try {
        const result = await new Promise((resolve) => {
          chrome.storage.local.get(['cleannews_vault_articles'], (data) => {
            resolve(data.cleannews_vault_articles || []);
          });
        });

        if (!Array.isArray(result) || result.length === 0) {
          return { migrated: 0 };
        }

        let migrated = 0;
        const now = new Date().toISOString();

        for (const legacyArticle of result) {
          if (!legacyArticle.id) continue;

          // Check if already in IndexedDB
          const existing = await CleanNewsDB.get(STORES.articles, legacyArticle.id);
          if (existing) continue;

          // Check duplicate URL
          if (legacyArticle.sourceUrl) {
            try {
              const normalizedUrl = _normalizeUrl(legacyArticle.sourceUrl);
              const byUrl = await CleanNewsDB.getByIndex(STORES.articles, 'sourceUrl', normalizedUrl);
              if (byUrl && byUrl.length > 0) continue;
            } catch {
              // fall through
            }
          }

          const migratedArticle = {
            id: legacyArticle.id,
            title: legacyArticle.title || 'Sin título',
            author: legacyArticle.author || '',
            source: legacyArticle.source || '',
            sourceUrl: legacyArticle.sourceUrl || '',
            contentHtml: legacyArticle.contentHtml || legacyArticle.content || '',
            contentText: legacyArticle.contentText || legacyArticle.content || '',
            excerpt: legacyArticle.excerpt || '',
            featuredImage: legacyArticle.featuredImage || '',
            publishedAt: legacyArticle.publishedAt || '',
            savedAt: legacyArticle.savedAt || legacyArticle.createdAt || now,
            wordCount: legacyArticle.wordCount || 0,
            readTime: legacyArticle.readTime || 0,
            tags: legacyArticle.tags || [],
            collectionIds: legacyArticle.collectionIds || [],
            notes: legacyArticle.notes || '',
            favorite: legacyArticle.favorite || false,
            readProgress: legacyArticle.readProgress || 0,
            readAt: legacyArticle.readAt || null,
            createdAt: legacyArticle.createdAt || now,
            updatedAt: legacyArticle.updatedAt || now
          };

          await CleanNewsDB.put(STORES.articles, migratedArticle);
          migrated++;
        }

        // Optionally clear legacy data after successful migration
        if (migrated > 0) {
          try {
            await new Promise((resolve) => {
              chrome.storage.local.remove(['cleannews_vault_articles'], resolve);
            });
          } catch (e) {
            console.warn('[CleanNewsStorage] Could not clear legacy data:', e);
          }
        }

        console.log(`[CleanNewsStorage] Migrated ${migrated} articles from legacy storage`);
        return { migrated };
      } catch (err) {
        console.error('[CleanNewsStorage] migrateFromLegacy error:', err);
        return { migrated: 0 };
      }
    },

    // ─────────────────────────────────────────────────────────────
    // UTILITY
    // ─────────────────────────────────────────────────────────────

    generateId
  };
})();

// Export globally
if (typeof window !== 'undefined') {
  window.CleanNewsStorage = CleanNewsStorage;
}
