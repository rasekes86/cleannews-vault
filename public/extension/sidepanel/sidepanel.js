// CleanNews Vault v4.0 - Side Panel Logic
// On-demand extraction via chrome.scripting.executeScript
// Communicates with background.js for page extraction

(async function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════

  var state = {
    currentTab: 'extract',
    allArticles: [],
    allCollections: [],
    allExistingTags: [],
    currentData: null,
    currentTags: [],
    selectedCollectionId: '',
    activeFilter: 'all',
    searchQuery: '',
    isExtracting: false,
    existingArticleId: null,
    activeTabId: null,
    activeTabUrl: null,
    activeTabTitle: null,
    collectionFilterId: '',
    newCollectionColor: '#ef4444',
    searchTimeout: null
  };

  var COLLECTION_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
  ];

  // ═══════════════════════════════════════════════════════════════
  // DOM ELEMENTS
  // ═══════════════════════════════════════════════════════════════

  var themeToggle = document.getElementById('theme-toggle');
  var pageTitle = document.getElementById('page-title');
  var pageUrl = document.getElementById('page-url');
  var extractActions = document.getElementById('extract-actions');
  var searchInput = document.getElementById('search-input');
  var articlesList = document.getElementById('articles-list');
  var emptyState = document.getElementById('empty-state');
  var statTotal = document.getElementById('stat-total');
  var statUnread = document.getElementById('stat-unread');
  var libraryLink = document.getElementById('library-link');
  var collectionFilterHeader = document.getElementById('collection-filter-header');
  var collectionFilterDot = document.getElementById('collection-filter-dot');
  var collectionFilterName = document.getElementById('collection-filter-name');
  var collectionFilterClear = document.getElementById('collection-filter-clear');
  var toggleNewCollection = document.getElementById('toggle-new-collection');
  var collectionForm = document.getElementById('collection-form');
  var newCollectionName = document.getElementById('new-collection-name');
  var colorDotsContainer = document.getElementById('color-dots');
  var createCollectionBtn = document.getElementById('create-collection');
  var cancelCollectionBtn = document.getElementById('cancel-collection');
  var collectionsList = document.getElementById('collections-list');
  var collectionsEmpty = document.getElementById('collections-empty');
  var toastContainer = document.getElementById('toast-container');

  // ═══════════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════════

  async function init() {
    try {
      await CleanNewsDB.init();
      await CleanNewsStorage.migrateFromLegacy();
      await loadTheme();
      renderColorDots();
      await getActiveTabInfo();
      await loadAllData();
      bindEvents();
      renderExtractTab();
    } catch (err) {
      console.error('[CleanNews SidePanel] Init error:', err);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // THEME
  // ═══════════════════════════════════════════════════════════════

  async function loadTheme() {
    try {
      var setting = await CleanNewsDB.get('settings', 'theme');
      if (setting && setting.value === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    } catch (e) { /* ignore */ }
  }

  async function toggleTheme() {
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    var newTheme = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    try {
      await CleanNewsDB.put('settings', { key: 'theme', value: newTheme });
    } catch (e) { /* ignore */ }
  }

  // ═══════════════════════════════════════════════════════════════
  // ACTIVE TAB INFO
  // ═══════════════════════════════════════════════════════════════

  async function getActiveTabInfo() {
    try {
      var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length > 0) {
        var tab = tabs[0];
        state.activeTabId = tab.id;
        state.activeTabUrl = tab.url || '';
        state.activeTabTitle = tab.title || '';

        pageTitle.textContent = state.activeTabTitle || 'Página desconocida';
        pageUrl.textContent = state.activeTabUrl ? new URL(state.activeTabUrl).hostname : '';
      }
    } catch (e) {
      pageTitle.textContent = 'Página no disponible';
      pageUrl.textContent = '';
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════════════════════════════

  async function loadAllData() {
    try {
      var results = await Promise.all([
        CleanNewsStorage.getArticles(),
        CleanNewsStorage.getCollections(),
        CleanNewsStorage.getTags()
      ]);

      state.allArticles = results[0] || [];
      state.allCollections = results[1] || [];
      state.allExistingTags = results[2] || [];

      // Sort by date desc
      state.allArticles.sort(function (a, b) {
        var dateA = new Date(a.savedAt || a.createdAt || 0).getTime();
        var dateB = new Date(b.savedAt || b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      checkIfAlreadySaved();
      updateStats();
    } catch (err) {
      console.error('[CleanNews SidePanel] loadAllData error:', err);
    }
  }

  function updateStats() {
    var total = state.allArticles.length;
    var unread = state.allArticles.filter(function (a) { return (a.readProgress || 0) < 100; }).length;
    statTotal.textContent = total + ' art\u00edculo' + (total !== 1 ? 's' : '');
    statUnread.textContent = unread + ' sin leer';
  }

  function checkIfAlreadySaved() {
    if (!state.activeTabUrl) {
      state.existingArticleId = null;
      return;
    }

    var normalized = typeof CleanNewsUrl !== 'undefined'
      ? CleanNewsUrl.normalize(state.activeTabUrl)
      : state.activeTabUrl;

    var found = state.allArticles.find(function (a) {
      if (!a.sourceUrl) return false;
      var artNorm = typeof CleanNewsUrl !== 'undefined'
        ? CleanNewsUrl.normalize(a.sourceUrl)
        : a.sourceUrl;
      return artNorm === normalized;
    });

    state.existingArticleId = found ? found.id : null;
  }

  // ═══════════════════════════════════════════════════════════════
  // TAB SWITCHING
  // ═══════════════════════════════════════════════════════════════

  function switchTab(tabName) {
    state.currentTab = tabName;

    // Update tab buttons
    document.querySelectorAll('.sp-tab').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    // Update panels
    document.querySelectorAll('.sp-tab-panel').forEach(function (panel) {
      panel.classList.toggle('active', panel.getAttribute('data-panel') === tabName);
    });

    if (tabName === 'library') {
      renderLibrary();
    } else if (tabName === 'collections') {
      renderCollections();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // EXTRACT TAB
  // ═══════════════════════════════════════════════════════════════

  function renderExtractTab() {
    var html = '';

    // Already saved
    if (state.existingArticleId && !state.currentData) {
      html += '<div class="sp-already-saved">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' +
        '<span>Ya guardado</span>' +
        '<button class="sp-already-saved-btn" data-action="open-existing">Abrir</button>' +
        '</div>';
    }
    // Extracting
    else if (state.isExtracting) {
      html += '<button class="sp-extract-btn" disabled>' +
        '<span class="sp-spinner"></span>' +
        '<span>Extrayendo...</span>' +
        '</button>';
    }
    // Extract button
    else if (!state.currentData) {
      html += '<button class="sp-extract-btn" data-action="extract">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>' +
        '<span>Extraer Art\u00edculo</span>' +
        '</button>';
    }

    // Preview
    if (state.currentData) {
      var d = state.currentData;
      html += '<div class="sp-preview">';
      if (d.featuredImage) {
        html += '<img class="sp-preview-image" src="' + escapeAttr(d.featuredImage) + '" alt="" onerror="this.style.display=\'none\'">';
      }
      html += '<h3 class="sp-preview-title">' + escapeHtml(d.title || 'Sin t\u00edtulo') + '</h3>';
      html += '<div class="sp-preview-meta">';
      if (d.author) {
        html += '<span>' + escapeHtml(d.author) + '</span>';
      }
      if (d.source) {
        html += '<span class="sp-card-source">' + escapeHtml(d.source) + '</span>';
      }
      if (d.publishedAt) {
        html += '<span>' + escapeHtml(d.publishedAt) + '</span>';
      }
      if (d.wordCount) {
        html += '<span>' + d.wordCount.toLocaleString() + ' palabras</span>';
      }
      if (d.readTime) {
        html += '<span>~' + d.readTime + ' min lectura</span>';
      }
      html += '</div>';
      if (d.excerpt) {
        html += '<p class="sp-preview-excerpt">' + escapeHtml(d.excerpt) + '</p>';
      }
      html += '</div>';

      // Tags
      html += '<div class="sp-tags-section" style="position:relative">';
      html += '<div class="sp-tags-label">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>' +
        ' Etiquetas</div>';
      html += '<div class="sp-tags-container" data-action="tags-container">';
      state.currentTags.forEach(function (tag, idx) {
        html += '<span class="sp-tag-chip" data-tag-idx="' + idx + '">' +
          escapeHtml(tag) +
          '<button class="sp-tag-chip-remove" data-action="remove-tag" data-tag="' + escapeAttr(tag) + '">&times;</button>' +
          '</span>';
      });
      html += '<input class="sp-tag-input" type="text" placeholder="Agregar etiqueta..." data-action="tag-input">';
      html += '</div>';
      html += '<div class="sp-tag-suggestions" data-action="tag-suggestions"></div>';
      html += '</div>';

      // Collection selector
      html += '<div class="sp-collection-select">';
      html += '<select data-action="collection-select">';
      html += '<option value="">Sin colecci\u00f3n</option>';
      state.allCollections.forEach(function (col) {
        var sel = col.id === state.selectedCollectionId ? ' selected' : '';
        html += '<option value="' + escapeAttr(col.id) + '"' + sel + '>' + escapeHtml(col.name) + '</option>';
      });
      html += '</select>';
      html += '</div>';

      // Save / Discard
      html += '<div class="sp-extract-actions-buttons">';
      html += '<button class="sp-btn sp-btn-primary" data-action="save-article">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>' +
        ' Guardar</button>';
      html += '<button class="sp-btn sp-btn-secondary" data-action="discard-article">Descartar</button>';
      html += '</div>';
    }

    extractActions.innerHTML = html;
    bindExtractEvents();
  }

  async function doExtract() {
    if (state.isExtracting) return;
    state.isExtracting = true;
    renderExtractTab();

    try {
      // Send message to background to inject and extract
      var response = await chrome.runtime.sendMessage({ type: 'EXTRACT_PAGE' });

      if (response && response.success && response.data) {
        state.currentData = response.data;

        // Auto-suggest tags
        if (typeof CleanNewsAutoTagger !== 'undefined') {
          state.currentTags = CleanNewsAutoTagger.suggestTags(response.data);
        }

        showToast('Art\u00edculo extra\u00eddo correctamente', 'success');
      } else {
        var errorMsg = (response && response.error) ? response.error : 'No se pudo extraer el contenido';
        showToast(errorMsg, 'error');
      }
    } catch (err) {
      console.error('[CleanNews SidePanel] Extract error:', err);
      showToast('Error al extraer: ' + (err.message || 'Desconocido'), 'error');
    }

    state.isExtracting = false;
    renderExtractTab();
  }

  async function doSaveArticle() {
    if (!state.currentData) return;

    var data = state.currentData;
    data.tags = state.currentTags;
    data.collectionIds = state.selectedCollectionId ? [state.selectedCollectionId] : [];
    data.sourceUrl = data.sourceUrl || state.activeTabUrl || '';

    try {
      var result = await CleanNewsStorage.saveArticle(data);
      if (result.success) {
        showToast('Art\u00edculo guardado', 'success');
        state.currentData = null;
        state.currentTags = [];
        state.selectedCollectionId = '';
        await loadAllData();
        renderExtractTab();

        // Notify background to update badge
        try { chrome.runtime.sendMessage({ type: 'ARTICLE_SAVED' }); } catch (e) { /* ignore */ }
      } else {
        showToast(result.error || 'Error al guardar', 'error');
      }
    } catch (err) {
      console.error('[CleanNews SidePanel] Save error:', err);
      showToast('Error al guardar: ' + err.message, 'error');
    }
  }

  function bindExtractEvents() {
    var extractBtn = extractActions.querySelector('[data-action="extract"]');
    if (extractBtn) {
      extractBtn.addEventListener('click', doExtract);
    }

    var openExisting = extractActions.querySelector('[data-action="open-existing"]');
    if (openExisting) {
      openExisting.addEventListener('click', function () {
        if (state.existingArticleId) {
          chrome.tabs.create({
            url: chrome.runtime.getURL('reader/reader.html?id=' + state.existingArticleId)
          });
        }
      });
    }

    var saveBtn = extractActions.querySelector('[data-action="save-article"]');
    if (saveBtn) {
      saveBtn.addEventListener('click', doSaveArticle);
    }

    var discardBtn = extractActions.querySelector('[data-action="discard-article"]');
    if (discardBtn) {
      discardBtn.addEventListener('click', function () {
        state.currentData = null;
        state.currentTags = [];
        state.selectedCollectionId = '';
        renderExtractTab();
      });
    }

    // Tag input
    var tagInput = extractActions.querySelector('[data-action="tag-input"]');
    if (tagInput) {
      tagInput.addEventListener('input', function () {
        updateTagSuggestions(tagInput.value);
      });
      tagInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          var val = tagInput.value.trim();
          if (val) {
            addTag(val);
            tagInput.value = '';
            updateTagSuggestions('');
          }
        } else if (e.key === 'Backspace' && !tagInput.value && state.currentTags.length > 0) {
          removeTag(state.currentTags[state.currentTags.length - 1]);
        } else if (e.key === 'Escape') {
          var sugBox = extractActions.querySelector('[data-action="tag-suggestions"]');
          if (sugBox) {
            sugBox.classList.remove('visible');
            sugBox.innerHTML = '';
          }
        }
      });
      // Close suggestions on blur
      tagInput.addEventListener('blur', function () {
        setTimeout(function () {
          var sugBox = extractActions.querySelector('[data-action="tag-suggestions"]');
          if (sugBox) {
            sugBox.classList.remove('visible');
            sugBox.innerHTML = '';
          }
        }, 200);
      });
    }

    // Remove tag buttons
    extractActions.querySelectorAll('[data-action="remove-tag"]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        removeTag(btn.getAttribute('data-tag'));
      });
    });

    // Collection select
    var collectionSelect = extractActions.querySelector('[data-action="collection-select"]');
    if (collectionSelect) {
      collectionSelect.addEventListener('change', function () {
        state.selectedCollectionId = collectionSelect.value;
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // TAG AUTOCOMPLETE
  // ═══════════════════════════════════════════════════════════════

  function updateTagSuggestions(inputValue) {
    var suggestionsEl = extractActions.querySelector('[data-action="tag-suggestions"]');
    if (!suggestionsEl) return;

    if (!inputValue || !inputValue.trim()) {
      suggestionsEl.classList.remove('visible');
      suggestionsEl.innerHTML = '';
      return;
    }

    var lower = inputValue.toLowerCase().trim();
    var suggestions = [];

    // Auto-tagger suggestions
    if (state.currentData && typeof CleanNewsAutoTagger !== 'undefined') {
      var autoTags = CleanNewsAutoTagger.suggestTags(state.currentData);
      autoTags.forEach(function (tag) {
        if (tag.toLowerCase().indexOf(lower) !== -1 && state.currentTags.indexOf(tag) === -1) {
          if (suggestions.indexOf(tag) === -1) suggestions.push(tag);
        }
      });
    }

    // Existing tags from DB
    state.allExistingTags.forEach(function (tag) {
      if (tag.toLowerCase().indexOf(lower) !== -1 && state.currentTags.indexOf(tag) === -1) {
        if (suggestions.indexOf(tag) === -1) suggestions.push(tag);
      }
    });

    // Suggest the input itself if not already a tag
    var trimmed = inputValue.trim();
    if (trimmed && suggestions.indexOf(trimmed) === -1 && state.currentTags.indexOf(trimmed) === -1) {
      suggestions.unshift(trimmed);
    }

    suggestions = suggestions.slice(0, 6);

    if (suggestions.length === 0) {
      suggestionsEl.classList.remove('visible');
      suggestionsEl.innerHTML = '';
      return;
    }

    var html = '';
    suggestions.forEach(function (sug) {
      html += '<button class="sp-tag-suggestion" data-action="add-tag-suggestion" data-tag="' + escapeAttr(sug) + '">' + escapeHtml(sug) + '</button>';
    });
    suggestionsEl.innerHTML = html;
    suggestionsEl.classList.add('visible');

    // Bind click events on suggestions
    suggestionsEl.querySelectorAll('[data-action="add-tag-suggestion"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        addTag(btn.getAttribute('data-tag'));
        var tagInput = extractActions.querySelector('[data-action="tag-input"]');
        if (tagInput) tagInput.value = '';
        updateTagSuggestions('');
      });
    });
  }

  function addTag(tag) {
    tag = (tag || '').trim();
    if (!tag || state.currentTags.indexOf(tag) !== -1) return;
    state.currentTags.push(tag);
    renderExtractTab();
  }

  function removeTag(tag) {
    var idx = state.currentTags.indexOf(tag);
    if (idx !== -1) state.currentTags.splice(idx, 1);
    renderExtractTab();
  }

  // ═══════════════════════════════════════════════════════════════
  // LIBRARY TAB
  // ═══════════════════════════════════════════════════════════════

  function getFilteredArticles() {
    var articles = state.allArticles;

    // Collection filter
    if (state.collectionFilterId) {
      articles = articles.filter(function (a) {
        return a.collectionIds && a.collectionIds.indexOf(state.collectionFilterId) !== -1;
      });
    }

    // Status filter
    if (state.activeFilter === 'favorites') {
      articles = articles.filter(function (a) { return a.favorite; });
    } else if (state.activeFilter === 'unread') {
      articles = articles.filter(function (a) { return (a.readProgress || 0) < 100; });
    }

    // Search
    if (state.searchQuery && state.searchQuery.trim()) {
      if (typeof CleanNewsSearch !== 'undefined' && CleanNewsSearch.search) {
        articles = CleanNewsSearch.search(articles, state.searchQuery);
      } else {
        var terms = state.searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
        articles = articles.filter(function (a) {
          var hay = [a.title, a.source, a.author, a.excerpt].filter(Boolean).join(' ').toLowerCase();
          return terms.every(function (t) { return hay.includes(t); });
        });
      }
    }

    return articles;
  }

  function renderLibrary() {
    // Collection filter header
    if (state.collectionFilterId) {
      var col = state.allCollections.find(function (c) { return c.id === state.collectionFilterId; });
      collectionFilterDot.style.background = col ? col.color : '#999';
      collectionFilterName.textContent = escapeHtml(col ? col.name : 'Colecci\u00f3n');
      collectionFilterHeader.classList.remove('hidden');
    } else {
      collectionFilterHeader.classList.add('hidden');
    }

    var articles = getFilteredArticles();

    if (articles.length === 0) {
      articlesList.classList.add('hidden');
      emptyState.classList.remove('hidden');
      if (state.allArticles.length === 0) {
        emptyState.querySelector('p').textContent = 'No hay art\u00edculos guardados.';
      } else {
        emptyState.querySelector('p').textContent = 'Sin resultados para esta b\u00fasqueda.';
      }
      return;
    }

    emptyState.classList.add('hidden');
    articlesList.classList.remove('hidden');

    articlesList.innerHTML = articles.map(function (a) { return renderCard(a); }).join('');
    bindCardEvents();
  }

  function renderCard(article) {
    var progress = article.readProgress || 0;
    var progressClass = progress >= 100 ? ' complete' : '';

    var metaHtml = '';
    if (article.source) {
      metaHtml += '<span class="sp-card-source">' + escapeHtml(article.source) + '</span>';
    }
    var dateStr = formatDate(article.savedAt || article.createdAt);
    if (dateStr) {
      if (metaHtml) metaHtml += '<span>\u00b7</span>';
      metaHtml += '<span>' + dateStr + '</span>';
    }
    if (article.readTime) {
      metaHtml += '<span>' + article.readTime + ' min</span>';
    }

    var favClass = article.favorite ? ' fav-active' : '';
    var favFill = article.favorite ? ' fill="currentColor"' : '';

    return '<div class="sp-card" data-id="' + escapeAttr(article.id) + '">' +
      '<div class="sp-card-progress"><div class="sp-card-progress-fill' + progressClass + '" style="width:' + progress + '%"></div></div>' +
      '<div class="sp-card-content">' +
        '<div class="sp-card-title">' + escapeHtml(article.title || 'Sin t\u00edtulo') + '</div>' +
        '<div class="sp-card-meta">' + metaHtml + '</div>' +
      '</div>' +
      '<div class="sp-card-actions">' +
        '<button class="sp-card-action-btn' + favClass + '" data-action="fav" data-id="' + escapeAttr(article.id) + '" title="Favorito">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"' + favFill + '><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>' +
        '</button>' +
        '<button class="sp-card-action-btn delete-btn" data-action="delete" data-id="' + escapeAttr(article.id) + '" title="Eliminar">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>' +
        '</button>' +
      '</div>' +
      '</div>';
  }

  function bindCardEvents() {
    articlesList.querySelectorAll('.sp-card').forEach(function (card) {
      var id = card.getAttribute('data-id');

      // Click → open reader
      card.addEventListener('click', function (e) {
        if (e.target.closest('[data-action]')) return;
        chrome.tabs.create({
          url: chrome.runtime.getURL('reader/reader.html?id=' + id)
        });
      });

      // Favorite
      var favBtn = card.querySelector('[data-action="fav"]');
      if (favBtn) {
        favBtn.addEventListener('click', async function (e) {
          e.stopPropagation();
          var result = await CleanNewsStorage.toggleFavorite(id);
          if (result.success) {
            var article = state.allArticles.find(function (a) { return a.id === id; });
            if (article) article.favorite = result.favorite;
            renderLibrary();
            try { chrome.runtime.sendMessage({ type: 'ARTICLE_SAVED' }); } catch (ex) { /* ignore */ }
          }
        });
      }

      // Delete
      var deleteBtn = card.querySelector('[data-action="delete"]');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', async function (e) {
          e.stopPropagation();
          await CleanNewsStorage.deleteArticle(id);
          showToast('Art\u00edculo eliminado', 'success');
          await loadAllData();
          renderLibrary();
          try { chrome.runtime.sendMessage({ type: 'ARTICLE_DELETED' }); } catch (ex) { /* ignore */ }
        });
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // COLLECTIONS TAB
  // ═══════════════════════════════════════════════════════════════

  function renderColorDots() {
    colorDotsContainer.innerHTML = COLLECTION_COLORS.map(function (color) {
      var selClass = state.newCollectionColor === color ? ' selected' : '';
      return '<button class="sp-color-dot' + selClass + '" style="background:' + color + '" data-color="' + color + '"></button>';
    }).join('');

    colorDotsContainer.querySelectorAll('.sp-color-dot').forEach(function (dot) {
      dot.addEventListener('click', function () {
        state.newCollectionColor = dot.getAttribute('data-color');
        renderColorDots();
      });
    });
  }

  function renderCollections() {
    if (state.allCollections.length === 0) {
      collectionsList.innerHTML = '';
      collectionsList.classList.add('hidden');
      collectionsEmpty.classList.remove('hidden');
      return;
    }

    collectionsEmpty.classList.add('hidden');
    collectionsList.classList.remove('hidden');

    collectionsList.innerHTML = state.allCollections.map(function (col) {
      var count = state.allArticles.filter(function (a) {
        return a.collectionIds && a.collectionIds.indexOf(col.id) !== -1;
      }).length;

      return '<div class="sp-collection-item" data-collection-id="' + escapeAttr(col.id) + '" data-action="open-collection">' +
        '<span class="sp-collection-dot" style="background:' + escapeAttr(col.color) + '"></span>' +
        '<span class="sp-collection-name">' + escapeHtml(col.name) + '</span>' +
        '<span class="sp-collection-count">' + count + '</span>' +
        '<button class="sp-collection-delete" data-action="delete-collection" data-collection-id="' + escapeAttr(col.id) + '" title="Eliminar">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>' +
        '</button>' +
        '</div>';
    }).join('');

    // Bind events
    collectionsList.querySelectorAll('[data-action="open-collection"]').forEach(function (item) {
      item.addEventListener('click', function (e) {
        if (e.target.closest('[data-action="delete-collection"]')) return;
        var colId = item.getAttribute('data-collection-id');
        if (colId) {
          state.collectionFilterId = colId;
          switchTab('library');
        }
      });
    });

    collectionsList.querySelectorAll('[data-action="delete-collection"]').forEach(function (btn) {
      btn.addEventListener('click', async function (e) {
        e.stopPropagation();
        var colId = btn.getAttribute('data-collection-id');
        if (colId) {
          await CleanNewsStorage.deleteCollection(colId);
          if (state.collectionFilterId === colId) {
            state.collectionFilterId = '';
          }
          showToast('Colecci\u00f3n eliminada', 'success');
          await loadAllData();
          renderCollections();
          try { chrome.runtime.sendMessage({ type: 'ARTICLE_DELETED' }); } catch (ex) { /* ignore */ }
        }
      });
    });
  }

  async function doCreateCollection() {
    var name = newCollectionName ? newCollectionName.value : '';
    if (!name || !name.trim()) {
      showToast('Nombre requerido', 'error');
      return;
    }

    try {
      await CleanNewsStorage.createCollection(name.trim(), '', state.newCollectionColor);
      showToast('Colecci\u00f3n creada', 'success');
      newCollectionName.value = '';
      collectionForm.classList.add('hidden');
      await loadAllData();
      renderCollections();
    } catch (err) {
      showToast('Error al crear colecci\u00f3n', 'error');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // EVENT BINDING
  // ═══════════════════════════════════════════════════════════════

  function bindEvents() {
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);

    // Tab buttons
    document.querySelectorAll('.sp-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        switchTab(btn.getAttribute('data-tab'));
      });
    });

    // Search with debounce
    searchInput.addEventListener('input', function () {
      clearTimeout(state.searchTimeout);
      state.searchTimeout = setTimeout(function () {
        state.searchQuery = searchInput.value;
        renderLibrary();
      }, 300);
    });

    // Filter buttons
    document.querySelectorAll('.sp-filter-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.sp-filter-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        state.activeFilter = btn.getAttribute('data-filter');
        renderLibrary();
      });
    });

    // Clear collection filter
    collectionFilterClear.addEventListener('click', function () {
      state.collectionFilterId = '';
      renderLibrary();
    });

    // Library link → open full library
    libraryLink.addEventListener('click', function (e) {
      e.preventDefault();
      chrome.tabs.create({
        url: chrome.runtime.getURL('library/library.html')
      });
    });

    // New collection form toggle
    toggleNewCollection.addEventListener('click', function () {
      collectionForm.classList.toggle('hidden');
      if (!collectionForm.classList.contains('hidden') && newCollectionName) {
        newCollectionName.focus();
      }
    });

    // Create collection
    createCollectionBtn.addEventListener('click', doCreateCollection);

    // Cancel collection
    cancelCollectionBtn.addEventListener('click', function () {
      collectionForm.classList.add('hidden');
      newCollectionName.value = '';
    });

    // Create collection on Enter
    if (newCollectionName) {
      newCollectionName.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          doCreateCollection();
        }
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function formatDate(isoStr) {
    if (!isoStr) return '';
    try {
      var d = new Date(isoStr);
      var now = new Date();
      var diffMs = now - d;
      var diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return 'Ahora';
      if (diffMin < 60) return 'Hace ' + diffMin + 'min';
      var diffHrs = Math.floor(diffMin / 60);
      if (diffHrs < 24) return 'Hace ' + diffHrs + 'h';
      var diffDays = Math.floor(diffHrs / 24);
      if (diffDays < 7) return 'Hace ' + diffDays + 'd';
      return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    } catch (e) {
      return '';
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // TOAST NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════

  function showToast(message, type) {
    type = type || 'success';
    var toast = document.createElement('div');
    toast.className = 'sp-toast sp-toast-' + type;

    var iconSvg = type === 'success'
      ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
      : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

    toast.innerHTML = iconSvg + '<span>' + escapeHtml(message) + '</span>';
    toastContainer.appendChild(toast);

    setTimeout(function () {
      toast.classList.add('exit');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 250);
    }, 2500);
  }

  // ═══════════════════════════════════════════════════════════════
  // BOOT
  // ═══════════════════════════════════════════════════════════════

  document.addEventListener('DOMContentLoaded', init);
})();
