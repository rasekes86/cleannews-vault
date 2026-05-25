// CleanNews Vault - Utilidades de almacenamiento
// Maneja todas las operaciones con chrome.storage.local

const STORAGE_KEY = 'cleannews_vault_articles';

const CleanNewsStorage = {
  /**
   * Genera un ID único para artículos
   */
  generateId() {
    return 'art_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
  },

  /**
   * Obtiene todos los artículos almacenados
   */
  async getArticles() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        resolve(result[STORAGE_KEY] || []);
      });
    });
  },

  /**
   * Guarda un nuevo artículo
   */
  async saveArticle(article) {
    const articles = await this.getArticles();

    // Verificar duplicados por URL
    const existingIndex = articles.findIndex(a => a.sourceUrl === article.sourceUrl);
    if (existingIndex !== -1) {
      return {
        success: false,
        error: 'Este artículo ya está guardado',
        existingArticle: articles[existingIndex]
      };
    }

    const newArticle = {
      id: this.generateId(),
      ...article,
      tags: article.tags || [],
      notes: article.notes || '',
      favorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    articles.unshift(newArticle);
    await this._setArticles(articles);

    return { success: true, article: newArticle };
  },

  /**
   * Obtiene un artículo por ID
   */
  async getArticle(id) {
    const articles = await this.getArticles();
    return articles.find(a => a.id === id) || null;
  },

  /**
   * Actualiza un artículo
   */
  async updateArticle(id, updates) {
    const articles = await this.getArticles();
    const index = articles.findIndex(a => a.id === id);

    if (index === -1) {
      return { success: false, error: 'Artículo no encontrado' };
    }

    articles[index] = {
      ...articles[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await this._setArticles(articles);
    return { success: true, article: articles[index] };
  },

  /**
   * Elimina un artículo por ID
   */
  async deleteArticle(id) {
    const articles = await this.getArticles();
    const filtered = articles.filter(a => a.id !== id);

    if (filtered.length === articles.length) {
      return { success: false, error: 'Artículo no encontrado' };
    }

    await this._setArticles(filtered);
    return { success: true };
  },

  /**
   * Obtiene todas las etiquetas únicas
   */
  async getTags() {
    const articles = await this.getArticles();
    const tagSet = new Set();

    articles.forEach(article => {
      if (article.tags && Array.isArray(article.tags)) {
        article.tags.forEach(tag => tagSet.add(tag));
      }
    });

    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  },

  /**
   * Obtiene todas las fuentes únicas
   */
  async getSources() {
    const articles = await this.getArticles();
    const sourceSet = new Set();

    articles.forEach(article => {
      if (article.source) {
        sourceSet.add(article.source);
      }
    });

    return Array.from(sourceSet).sort((a, b) => a.localeCompare(b));
  },

  /**
   * Busca artículos por query
   */
  async searchArticles(query) {
    if (!query || query.trim() === '') {
      return this.getArticles();
    }

    const articles = await this.getArticles();
    const lowerQuery = query.toLowerCase().trim();
    const terms = lowerQuery.split(/\s+/);

    return articles.filter(article => {
      const searchText = [
        article.title,
        article.content,
        article.source,
        article.author,
        article.excerpt,
        ...(article.tags || [])
      ].filter(Boolean).join(' ').toLowerCase();

      // Búsqueda por todos los términos
      return terms.every(term => searchText.includes(term));
    });
  },

  /**
   * Filtra artículos
   */
  async filterArticles({ query, tags, sources, favoritesOnly, sortBy }) {
    let articles = await this.getArticles();

    // Filtrar por búsqueda
    if (query && query.trim()) {
      const lowerQuery = query.toLowerCase().trim();
      const terms = lowerQuery.split(/\s+/);
      articles = articles.filter(article => {
        const searchText = [
          article.title,
          article.content,
          article.source,
          article.author,
          article.excerpt,
          ...(article.tags || [])
        ].filter(Boolean).join(' ').toLowerCase();
        return terms.every(term => searchText.includes(term));
      });
    }

    // Filtrar por etiquetas
    if (tags && tags.length > 0) {
      articles = articles.filter(article => {
        if (!article.tags || !Array.isArray(article.tags)) return false;
        return tags.some(tag => article.tags.includes(tag));
      });
    }

    // Filtrar por fuentes
    if (sources && sources.length > 0) {
      articles = articles.filter(article => sources.includes(article.source));
    }

    // Filtrar favoritos
    if (favoritesOnly) {
      articles = articles.filter(article => article.favorite);
    }

    // Ordenar
    switch (sortBy) {
      case 'title':
        articles.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'source':
        articles.sort((a, b) => (a.source || '').localeCompare(b.source || ''));
        break;
      case 'readTime':
        articles.sort((a, b) => (b.readTime || 0) - (a.readTime || 0));
        break;
      case 'date':
      default:
        articles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return articles;
  },

  /**
   * Obtiene estadísticas
   */
  async getStats() {
    const articles = await this.getArticles();
    const tags = await this.getTags();
    const sources = await this.getSources();

    return {
      totalArticles: articles.length,
      totalTags: tags.length,
      totalSources: sources.length,
      totalFavorites: articles.filter(a => a.favorite).length,
      totalWords: articles.reduce((sum, a) => sum + (a.wordCount || 0), 0)
    };
  },

  // Método interno para guardar artículos
  async _setArticles(articles) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY]: articles }, resolve);
    });
  }
};

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
  window.CleanNewsStorage = CleanNewsStorage;
}
