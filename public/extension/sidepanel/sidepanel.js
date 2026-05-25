// CleanNews Vault v2.0 - Side Panel Logic
// Compact library view for Chrome side panel

(async function() {
  'use strict';

  // ── State ─────────────────────────────────────────────────
  let allArticles = [];
  let activeFilter = 'all'; // all, favorites, unread
  let searchTimeout = null;

  // ── DOM Elements ──────────────────────────────────────────
  const searchInput = document.getElementById('search-input');
  const articlesList = document.getElementById('articles-list');
  const emptyState = document.getElementById('empty-state');
  const statTotal = document.getElementById('stat-total');
  const statUnread = document.getElementById('stat-unread');
  const libraryLink = document.getElementById('library-link');
  const themeToggle = document.getElementById('theme-toggle');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');

  // ── Init ──────────────────────────────────────────────────
  async function init() {
    try {
      await CleanNewsDB.init();
      await CleanNewsStorage.migrateFromLegacy();
      await loadTheme();
      await loadArticles();
      bindEvents();
    } catch (err) {
      console.error('[CleanNews SidePanel] Init error:', err);
    }
  }

  // ── Theme ─────────────────────────────────────────────────
  async function loadTheme() {
    try {
      const setting = await CleanNewsDB.get('settings', 'theme');
      if (setting && setting.value === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    } catch (e) { /* ignore */ }
  }

  async function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    try {
      await CleanNewsDB.put('settings', { key: 'theme', value: newTheme });
    } catch (e) { /* ignore */ }
  }

  // ── Load & Render ─────────────────────────────────────────
  async function loadArticles() {
    allArticles = await CleanNewsStorage.getArticles();
    // Sort by savedAt desc
    allArticles.sort((a, b) => {
      const dateA = new Date(a.savedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.savedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });
    updateStats();
    renderArticles();
  }

  function updateStats() {
    const total = allArticles.length;
    const unread = allArticles.filter(a => (a.readProgress || 0) < 100).length;
    statTotal.textContent = `${total} artículo${total !== 1 ? 's' : ''}`;
    statUnread.textContent = `${unread} sin leer`;
  }

  function getFilteredArticles() {
    const query = searchInput.value.trim().toLowerCase();
    let articles = [...allArticles];

    // Search
    if (query) {
      articles = CleanNewsSearch.search(articles, query);
    }

    // Filter
    if (activeFilter === 'favorites') {
      articles = articles.filter(a => a.favorite);
    } else if (activeFilter === 'unread') {
      articles = articles.filter(a => (a.readProgress || 0) < 100);
    }

    return articles;
  }

  function renderArticles() {
    const articles = getFilteredArticles();

    if (articles.length === 0) {
      articlesList.classList.add('hidden');
      emptyState.classList.remove('hidden');
      if (allArticles.length === 0) {
        emptyState.querySelector('p').textContent = 'No hay artículos guardados.';
      } else {
        emptyState.querySelector('p').textContent = 'Sin resultados para esta búsqueda.';
      }
      return;
    }

    emptyState.classList.add('hidden');
    articlesList.classList.remove('hidden');

    articlesList.innerHTML = articles.map(a => renderCard(a)).join('');
    bindCardEvents();
  }

  function renderCard(article) {
    const progress = article.readProgress || 0;
    const progressClass = progress >= 100 ? 'complete' : '';

    let metaHtml = '';
    if (article.source) metaHtml += `<span class="sp-card-source">${escapeHtml(article.source)}</span>`;
    if (article.publishedAt || article.readTime) {
      if (metaHtml) metaHtml += '<span>·</span>';
      metaHtml += `<span>${article.publishedAt || (article.readTime + ' min')}</span>`;
    }

    return `
      <div class="sp-card" data-id="${escapeAttr(article.id)}">
        <div class="sp-card-progress">
          <div class="sp-card-progress-fill ${progressClass}" style="width:${progress}%"></div>
        </div>
        <div class="sp-card-content">
          <div class="sp-card-title">${escapeHtml(article.title || 'Sin título')}</div>
          <div class="sp-card-meta">${metaHtml}</div>
        </div>
        <div class="sp-card-actions">
          <button class="sp-card-fav ${article.favorite ? 'active' : ''}" data-action="fav" title="Favorito">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          </button>
        </div>
      </div>`;
  }

  function bindCardEvents() {
    articlesList.querySelectorAll('.sp-card').forEach(card => {
      const id = card.dataset.id;

      // Click -> open reader in new tab
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-action]')) return;
        chrome.tabs.create({
          url: chrome.runtime.getURL('reader/reader.html?id=' + id)
        });
      });

      // Favorite
      const favBtn = card.querySelector('[data-action="fav"]');
      if (favBtn) {
        favBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const result = await CleanNewsStorage.toggleFavorite(id);
          if (result.success) {
            const article = allArticles.find(a => a.id === id);
            if (article) article.favorite = result.favorite;
            renderArticles();
            updateStats();
          }
        });
      }
    });
  }

  // ── Events ───────────────────────────────────────────────
  function bindEvents() {
    // Search with debounce
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(renderArticles, 300);
    });

    // Filter buttons
    document.querySelectorAll('.sp-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.sp-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.filter;
        renderArticles();
      });
    });

    // Library link
    libraryLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({
        url: chrome.runtime.getURL('library/library.html')
      });
    });

    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
  }

  // ── HTML Escape ───────────────────────────────────────────
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#039;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ── Toast ─────────────────────────────────────────────────
  function showToast(message) {
    toastMessage.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => { toast.classList.add('hidden'); }, 2500);
  }

  // ── Boot ──────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);
})();
