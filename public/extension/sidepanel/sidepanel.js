// CleanNews Vault v5.0 - Side Panel Logic
// Complete 7-tab side panel: Extract, Library, Collections, Notes, Snippets, Tools, Reviews
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
    searchTimeout: null,
    // Notes
    allNotes: [],
    notesSearchQuery: '',
    newNoteColor: '#059669',
    expandedNoteId: null,
    // Snippets
    allSnippets: [],
    snippetsSearchQuery: '',
    // Tools
    activeTool: null,
    toolResults: null,
    // Game Reviews
    gameSearchQuery: '',
    gameSearchResults: [],
    isSearchingGames: false,
    // Batch extract
    isBatchExtracting: false,
    batchExtractProgress: { current: 0, total: 0 },
    // Share dropdown
    shareDropdownOpen: false,
    // Pomodoro
    pomodoroState: null,
    pomodoroInterval: null
  };

  var COLLECTION_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
  ];

  var NOTE_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#06b6d4', '#3b82f6'
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
  var statNotes = document.getElementById('stat-notes');
  var statSnippets = document.getElementById('stat-snippets');
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
  var shareDropdown = document.getElementById('share-dropdown');
  // Notes
  var notesSearchInput = document.getElementById('notes-search-input');
  var toggleNewNote = document.getElementById('toggle-new-note');
  var noteForm = document.getElementById('note-form');
  var newNoteTitle = document.getElementById('new-note-title');
  var newNoteContent = document.getElementById('new-note-content');
  var newNoteTags = document.getElementById('new-note-tags');
  var noteColorDotsContainer = document.getElementById('note-color-dots');
  var saveNoteBtn = document.getElementById('save-note');
  var cancelNoteBtn = document.getElementById('cancel-note');
  var notesList = document.getElementById('notes-list');
  var notesEmpty = document.getElementById('notes-empty');
  // Snippets
  var snippetsSearchInput = document.getElementById('snippets-search-input');
  var snippetsList = document.getElementById('snippets-list');
  var snippetsEmpty = document.getElementById('snippets-empty');
  // Tools
  var toolsGrid = document.getElementById('tools-grid');
  var toolView = document.getElementById('tool-view');
  var toolViewTitle = document.getElementById('tool-view-title');
  var toolViewContent = document.getElementById('tool-view-content');
  // Game Reviews
  var gameSearchInput = document.getElementById('game-search-input');
  var gameSearchBtn = document.getElementById('game-search-btn');
  var gameResults = document.getElementById('game-results');
  var gameEmpty = document.getElementById('game-empty');
  // Pomodoro
  var pomodoroWidget = document.getElementById('pomodoro-widget');
  var pomodoroTimer = document.getElementById('pomodoro-timer');
  // Batch extract
  var batchExtractBtn = document.getElementById('batch-extract-btn');
  var batchExtractProgress = document.getElementById('batch-extract-progress');
  var batchProgressText = document.getElementById('batch-progress-text');

  // ═══════════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════════

  async function init() {
    try {
      await CleanNewsDB.init();
      await CleanNewsStorage.migrateFromLegacy();
      await loadTheme();
      renderColorDots();
      renderNoteColorDots();
      await getActiveTabInfo();
      await loadAllData();
      initPomodoro();
      initRAWGKey();
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

        pageTitle.textContent = state.activeTabTitle || 'P\u00e1gina desconocida';
        pageUrl.textContent = state.activeTabUrl ? new URL(state.activeTabUrl).hostname : '';
      }
    } catch (e) {
      pageTitle.textContent = 'P\u00e1gina no disponible';
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

      // Load notes
      try {
        if (typeof CleanNewsNotes !== 'undefined' && CleanNewsNotes.getAll) {
          state.allNotes = await CleanNewsNotes.getAll();
          state.allNotes.sort(function (a, b) {
            var dateA = new Date(a.createdAt || 0).getTime();
            var dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          });
        }
      } catch (e) { /* ignore */ }

      // Load snippets
      try {
        if (typeof CleanNewsSnippets !== 'undefined' && CleanNewsSnippets.getAll) {
          state.allSnippets = await CleanNewsSnippets.getAll();
          state.allSnippets.sort(function (a, b) {
            var dateA = new Date(a.createdAt || 0).getTime();
            var dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          });
        }
      } catch (e) { /* ignore */ }

      checkIfAlreadySaved();
      updateStats();
    } catch (err) {
      console.error('[CleanNews SidePanel] loadAllData error:', err);
    }
  }

  function updateStats() {
    var total = state.allArticles.length;
    var unread = state.allArticles.filter(function (a) { return (a.readProgress || 0) < 100; }).length;
    var notesCount = state.allNotes.length;
    var snippetsCount = state.allSnippets.length;
    statTotal.textContent = total + ' art\u00edculo' + (total !== 1 ? 's' : '');
    statUnread.textContent = unread + ' sin leer';
    statNotes.textContent = notesCount + ' nota' + (notesCount !== 1 ? 's' : '');
    statSnippets.textContent = snippetsCount + ' fragmento' + (snippetsCount !== 1 ? 's' : '');
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

    // Close share dropdown
    closeShareDropdown();

    if (tabName === 'library') {
      renderLibrary();
    } else if (tabName === 'collections') {
      renderCollections();
    } else if (tabName === 'notes') {
      renderNotes();
    } else if (tabName === 'snippets') {
      renderSnippets();
    } else if (tabName === 'tools') {
      renderToolsView();
    } else if (tabName === 'reviews') {
      // nothing to render unless searching
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

      // Save / Discard / Share row
      html += '<div class="sp-extract-share-row">';
      html += '<button class="sp-btn sp-btn-primary" data-action="save-article">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>' +
        ' Guardar</button>';
      html += '<button class="sp-btn sp-btn-secondary" data-action="discard-article">Descartar</button>';
      html += '<button class="sp-btn sp-btn-secondary" data-action="toggle-share" id="share-btn">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>' +
        '</button>';
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
      var response = await chrome.runtime.sendMessage({ type: 'EXTRACT_PAGE' });

      if (response && response.success && response.data) {
        state.currentData = response.data;

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
        closeShareDropdown();
        await loadAllData();
        renderExtractTab();

        try { chrome.runtime.sendMessage({ type: 'ARTICLE_SAVED' }); } catch (e) { /* ignore */ }
      } else {
        showToast(result.error || 'Error al guardar', 'error');
      }
    } catch (err) {
      console.error('[CleanNews SidePanel] Save error:', err);
      showToast('Error al guardar: ' + err.message, 'error');
    }
  }

  // ── Share Dropdown ──

  function closeShareDropdown() {
    state.shareDropdownOpen = false;
    shareDropdown.classList.add('hidden');
  }

  function toggleShareDropdown() {
    state.shareDropdownOpen = !state.shareDropdownOpen;
    if (state.shareDropdownOpen) {
      // Position below share button
      var shareBtn = document.getElementById('share-btn');
      if (shareBtn) {
        var rect = shareBtn.getBoundingClientRect();
        shareDropdown.style.top = (rect.bottom + 4) + 'px';
        shareDropdown.style.left = Math.max(4, rect.left) + 'px';
      }
      shareDropdown.classList.remove('hidden');
    } else {
      shareDropdown.classList.add('hidden');
    }
  }

  async function doShareCopyLink() {
    if (!state.currentData) return;
    var url = state.currentData.sourceUrl || state.activeTabUrl || '';
    if (url) {
      try {
        await navigator.clipboard.writeText(url);
        showToast('Enlace copiado', 'success');
      } catch (e) {
        showToast('No se pudo copiar', 'error');
      }
    }
    closeShareDropdown();
  }

  async function doShareCopyContent() {
    if (!state.currentData) return;
    var content = state.currentData.contentText || state.currentData.content || '';
    if (!content && state.currentData.title) {
      content = state.currentData.title + '\n\n' + (state.currentData.excerpt || '');
    }
    if (content) {
      try {
        await navigator.clipboard.writeText(content);
        showToast('Contenido copiado', 'success');
      } catch (e) {
        showToast('No se pudo copiar', 'error');
      }
    }
    closeShareDropdown();
  }

  // ── Batch Extract ──

  async function doBatchExtract() {
    if (state.isBatchExtracting) return;

    try {
      var tabs = await chrome.tabs.query({ currentWindow: true });
      var extractableTabs = tabs.filter(function (t) {
        return t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('chrome-extension://') && !t.url.startsWith('about:');
      });

      if (extractableTabs.length === 0) {
        showToast('No hay pesta\u00f1as extra\u00edbles', 'error');
        return;
      }

      state.isBatchExtracting = true;
      state.batchExtractProgress = { current: 0, total: extractableTabs.length };
      batchExtractBtn.classList.add('hidden');
      batchExtractProgress.classList.remove('hidden');
      batchProgressText.textContent = 'Extrayendo 0/' + extractableTabs.length + '...';

      var saved = 0;
      for (var i = 0; i < extractableTabs.length; i++) {
        var tab = extractableTabs[i];
        state.batchExtractProgress.current = i + 1;
        batchProgressText.textContent = 'Extrayendo ' + (i + 1) + '/' + extractableTabs.length + '...';

        try {
          var response = await chrome.runtime.sendMessage({ type: 'EXTRACT_PAGE', tabId: tab.id });
          if (response && response.success && response.data) {
            var data = response.data;
            data.sourceUrl = data.sourceUrl || tab.url || '';
            data.tags = typeof CleanNewsAutoTagger !== 'undefined' ? CleanNewsAutoTagger.suggestTags(data) : [];
            var result = await CleanNewsStorage.saveArticle(data);
            if (result.success) saved++;
          }
        } catch (ex) {
          // Skip this tab, continue
        }
      }

      await loadAllData();
      showToast(saved + ' art\u00edculo' + (saved !== 1 ? 's' : '') + ' guardado' + (saved !== 1 ? 's' : ''), 'success');
      try { chrome.runtime.sendMessage({ type: 'ARTICLE_SAVED' }); } catch (ex) { /* ignore */ }
    } catch (err) {
      console.error('[CleanNews SidePanel] Batch extract error:', err);
      showToast('Error en extracci\u00f3n masiva', 'error');
    }

    state.isBatchExtracting = false;
    batchExtractBtn.classList.remove('hidden');
    batchExtractProgress.classList.add('hidden');
  }

  // ── Extract Events ──

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
        closeShareDropdown();
        renderExtractTab();
      });
    }

    var shareBtn = extractActions.querySelector('[data-action="toggle-share"]');
    if (shareBtn) {
      shareBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleShareDropdown();
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
          closeShareDropdown();
          var sugBox = extractActions.querySelector('[data-action="tag-suggestions"]');
          if (sugBox) {
            sugBox.classList.remove('visible');
            sugBox.innerHTML = '';
          }
        }
      });
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

    if (state.currentData && typeof CleanNewsAutoTagger !== 'undefined') {
      var autoTags = CleanNewsAutoTagger.suggestTags(state.currentData);
      autoTags.forEach(function (tag) {
        if (tag.toLowerCase().indexOf(lower) !== -1 && state.currentTags.indexOf(tag) === -1) {
          if (suggestions.indexOf(tag) === -1) suggestions.push(tag);
        }
      });
    }

    state.allExistingTags.forEach(function (tag) {
      if (tag.toLowerCase().indexOf(lower) !== -1 && state.currentTags.indexOf(tag) === -1) {
        if (suggestions.indexOf(tag) === -1) suggestions.push(tag);
      }
    });

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
  // POMODORO WIDGET
  // ═══════════════════════════════════════════════════════════════

  function initPomodoro() {
    state.pomodoroState = {
      duration: 25 * 60,
      remaining: 25 * 60,
      running: false
    };
    pomodoroWidget.classList.remove('hidden');
    updatePomodoroDisplay();
  }

  function updatePomodoroDisplay() {
    var mins = Math.floor(state.pomodoroState.remaining / 60);
    var secs = state.pomodoroState.remaining % 60;
    pomodoroTimer.textContent = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
  }

  function togglePomodoro() {
    if (state.pomodoroInterval) {
      clearInterval(state.pomodoroInterval);
      state.pomodoroInterval = null;
    }

    state.pomodoroState.running = !state.pomodoroState.running;

    if (state.pomodoroState.running) {
      state.pomodoroInterval = setInterval(function () {
        if (state.pomodoroState.remaining > 0) {
          state.pomodoroState.remaining--;
          updatePomodoroDisplay();
        } else {
          clearInterval(state.pomodoroInterval);
          state.pomodoroInterval = null;
          state.pomodoroState.running = false;
          showToast('\u00a1Tiempo Pomodoro completado!', 'success');
        }
      }, 1000);
    } else {
      clearInterval(state.pomodoroInterval);
      state.pomodoroInterval = null;
    }
  }

  function resetPomodoro() {
    if (state.pomodoroInterval) {
      clearInterval(state.pomodoroInterval);
      state.pomodoroInterval = null;
    }
    state.pomodoroState.remaining = state.pomodoroState.duration;
    state.pomodoroState.running = false;
    updatePomodoroDisplay();
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
    } else if (state.activeFilter === 'queued') {
      articles = articles.filter(function (a) {
        return a.tags && a.tags.indexOf('cola') !== -1;
      });
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

      card.addEventListener('click', function (e) {
        if (e.target.closest('[data-action]')) return;
        chrome.tabs.create({
          url: chrome.runtime.getURL('reader/reader.html?id=' + id)
        });
      });

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
  // NOTES TAB
  // ═══════════════════════════════════════════════════════════════

  function renderNoteColorDots() {
    noteColorDotsContainer.innerHTML = NOTE_COLORS.map(function (color) {
      var selClass = state.newNoteColor === color ? ' selected' : '';
      return '<button class="sp-note-color' + selClass + '" style="background:' + color + '" data-color="' + color + '"></button>';
    }).join('');

    noteColorDotsContainer.querySelectorAll('.sp-note-color').forEach(function (dot) {
      dot.addEventListener('click', function () {
        state.newNoteColor = dot.getAttribute('data-color');
        renderNoteColorDots();
      });
    });
  }

  function renderNotes() {
    var notes = state.allNotes;

    // Search filter
    if (state.notesSearchQuery && state.notesSearchQuery.trim()) {
      var query = state.notesSearchQuery.toLowerCase().trim();
      notes = notes.filter(function (n) {
        var hay = [n.title, n.content].filter(Boolean).join(' ').toLowerCase();
        return hay.indexOf(query) !== -1;
      });
    }

    // Sort: pinned first, then by date desc
    notes.sort(function (a, b) {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      var dateA = new Date(a.createdAt || 0).getTime();
      var dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    if (notes.length === 0) {
      notesList.innerHTML = '';
      notesList.classList.add('hidden');
      notesEmpty.classList.remove('hidden');
      return;
    }

    notesEmpty.classList.add('hidden');
    notesList.classList.remove('hidden');

    notesList.innerHTML = notes.map(function (note) {
      var isExpanded = state.expandedNoteId === note.id;
      var contentClass = isExpanded ? ' sp-note-card-content expanded' : ' sp-note-card-content';
      var pinSvg = note.pinned
        ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M12 2v8m0 0l-3-3m3 3l3-3M2 17l.621 2.485A2 2 0 0 0 4.561 21h14.878a2 2 0 0 0 1.94-1.515L22 17"></path></svg>'
        : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v8m0 0l-3-3m3 3l3-3M2 17l.621 2.485A2 2 0 0 0 4.561 21h14.878a2 2 0 0 0 1.94-1.515L22 17"></path></svg>';

      var tagsHtml = '';
      if (note.tags && note.tags.length > 0) {
        tagsHtml = '<div class="sp-note-card-tags">' +
          note.tags.map(function (t) { return '<span class="sp-note-card-tag">' + escapeHtml(t) + '</span>'; }).join('') +
          '</div>';
      }

      return '<div class="sp-note-card" data-note-id="' + escapeAttr(note.id) + '">' +
        '<div class="sp-note-card-stripe" style="background:' + escapeAttr(note.color || '#059669') + '"></div>' +
        '<div class="sp-note-card-body">' +
          '<div class="sp-note-card-header">' +
            '<span class="sp-note-card-pin" data-action="pin-note" data-note-id="' + escapeAttr(note.id) + '">' + pinSvg + '</span>' +
            '<span class="sp-note-card-title">' + escapeHtml(note.title || 'Sin t\u00edtulo') + '</span>' +
          '</div>' +
          '<div class="' + contentClass + '">' + escapeHtml(note.content || '') + '</div>' +
          '<div class="sp-note-card-meta">' +
            '<span>' + formatDate(note.createdAt) + '</span>' +
            tagsHtml +
          '</div>' +
        '</div>' +
        '<div class="sp-note-card-actions">' +
          '<button class="sp-card-action-btn" data-action="edit-note" data-note-id="' + escapeAttr(note.id) + '" title="Editar">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>' +
          '</button>' +
          '<button class="sp-card-action-btn delete-btn" data-action="delete-note" data-note-id="' + escapeAttr(note.id) + '" title="Eliminar">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>' +
          '</button>' +
        '</div>' +
        '</div>';
    }).join('');

    // Bind note events
    bindNoteEvents();
  }

  function bindNoteEvents() {
    notesList.querySelectorAll('.sp-note-card').forEach(function (card) {
      var noteId = card.getAttribute('data-note-id');

      // Click card → expand/collapse
      card.addEventListener('click', function (e) {
        if (e.target.closest('[data-action]')) return;
        state.expandedNoteId = state.expandedNoteId === noteId ? null : noteId;
        renderNotes();
      });

      // Pin
      var pinBtn = card.querySelector('[data-action="pin-note"]');
      if (pinBtn) {
        pinBtn.addEventListener('click', async function (e) {
          e.stopPropagation();
          try {
            if (typeof CleanNewsNotes !== 'undefined' && CleanNewsNotes.togglePin) {
              await CleanNewsNotes.togglePin(noteId);
              await loadAllData();
              renderNotes();
              showToast('Nota ' + (state.expandedNoteId === noteId ? 'fijada' : 'desfijada'), 'success');
            }
          } catch (ex) { showToast('Error al fijar nota', 'error'); }
        });
      }

      // Edit
      var editBtn = card.querySelector('[data-action="edit-note"]');
      if (editBtn) {
        editBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          var note = state.allNotes.find(function (n) { return n.id === noteId; });
          if (note) {
            newNoteTitle.value = note.title || '';
            newNoteContent.value = note.content || '';
            newNoteTags.value = (note.tags || []).join(', ');
            state.newNoteColor = note.color || '#059669';
            state._editingNoteId = noteId;
            renderNoteColorDots();
            noteForm.classList.remove('hidden');
            newNoteTitle.focus();
          }
        });
      }

      // Delete
      var deleteBtn = card.querySelector('[data-action="delete-note"]');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', async function (e) {
          e.stopPropagation();
          try {
            if (typeof CleanNewsNotes !== 'undefined' && CleanNewsNotes.delete) {
              await CleanNewsNotes.delete(noteId);
              showToast('Nota eliminada', 'success');
              await loadAllData();
              renderNotes();
            }
          } catch (ex) { showToast('Error al eliminar nota', 'error'); }
        });
      }
    });
  }

  async function doSaveNote() {
    var title = (newNoteTitle.value || '').trim();
    var content = (newNoteContent.value || '').trim();
    if (!title && !content) {
      showToast('T\u00edtulo o contenido requerido', 'error');
      return;
    }

    var tags = (newNoteTags.value || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean);

    try {
      if (typeof CleanNewsNotes !== 'undefined') {
        if (state._editingNoteId) {
          await CleanNewsNotes.update(state._editingNoteId, {
            title: title,
            content: content,
            color: state.newNoteColor,
            tags: tags
          });
          state._editingNoteId = null;
          showToast('Nota actualizada', 'success');
        } else {
          await CleanNewsNotes.create({
            title: title,
            content: content,
            color: state.newNoteColor,
            tags: tags,
            pinned: false
          });
          showToast('Nota creada', 'success');
        }
      } else {
        // Fallback: save to DB directly
        var note = {
          id: CleanNewsStorage.generateId('not'),
          title: title,
          content: content,
          color: state.newNoteColor,
          tags: tags,
          pinned: false,
          articleId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        if (state._editingNoteId) {
          note.id = state._editingNoteId;
          note.updatedAt = new Date().toISOString();
          state._editingNoteId = null;
        }
        await CleanNewsDB.put('notes', note);
        showToast(state._editingNoteId ? 'Nota actualizada' : 'Nota creada', 'success');
      }

      newNoteTitle.value = '';
      newNoteContent.value = '';
      newNoteTags.value = '';
      state.newNoteColor = '#059669';
      renderNoteColorDots();
      noteForm.classList.add('hidden');
      await loadAllData();
      renderNotes();
    } catch (err) {
      showToast('Error al guardar nota', 'error');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SNIPPETS TAB
  // ═══════════════════════════════════════════════════════════════

  function renderSnippets() {
    var snippets = state.allSnippets;

    if (state.snippetsSearchQuery && state.snippetsSearchQuery.trim()) {
      var query = state.snippetsSearchQuery.toLowerCase().trim();
      snippets = snippets.filter(function (s) {
        var hay = [s.text, s.sourceTitle].filter(Boolean).join(' ').toLowerCase();
        return hay.indexOf(query) !== -1;
      });
    }

    if (snippets.length === 0) {
      snippetsList.innerHTML = '';
      snippetsList.classList.add('hidden');
      snippetsEmpty.classList.remove('hidden');
      return;
    }

    snippetsEmpty.classList.add('hidden');
    snippetsList.classList.remove('hidden');

    snippetsList.innerHTML = snippets.map(function (snippet) {
      var source = snippet.sourceTitle || snippet.source || 'Fuente desconocida';
      var snippetUrl = snippet.sourceUrl || '';

      return '<div class="sp-snippet-card" data-snippet-id="' + escapeAttr(snippet.id) + '">' +
        '<div class="sp-snippet-card-header">' +
          '<span class="sp-snippet-card-source">' + escapeHtml(source) + '</span>' +
          '<span class="sp-snippet-card-date">' + formatDate(snippet.createdAt) + '</span>' +
        '</div>' +
        '<div class="sp-snippet-card-text">' + escapeHtml(snippet.text || '') + '</div>' +
        '<div class="sp-snippet-card-footer">' +
          '<button class="sp-card-action-btn" data-action="add-note-to-snippet" data-snippet-id="' + escapeAttr(snippet.id) + '" title="Agregar nota">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>' +
          '</button>' +
          '<button class="sp-card-action-btn" data-action="copy-snippet" data-snippet-id="' + escapeAttr(snippet.id) + '" title="Copiar">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>' +
          '</button>' +
          '<button class="sp-card-action-btn delete-btn" data-action="delete-snippet" data-snippet-id="' + escapeAttr(snippet.id) + '" title="Eliminar">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>' +
          '</button>' +
        '</div>' +
        '</div>';
    }).join('');

    bindSnippetEvents();
  }

  function bindSnippetEvents() {
    snippetsList.querySelectorAll('.sp-snippet-card').forEach(function (card) {
      var snippetId = card.getAttribute('data-snippet-id');

      // Copy snippet
      var copyBtn = card.querySelector('[data-action="copy-snippet"]');
      if (copyBtn) {
        copyBtn.addEventListener('click', async function () {
          var snippet = state.allSnippets.find(function (s) { return s.id === snippetId; });
          if (snippet && snippet.text) {
            try {
              await navigator.clipboard.writeText(snippet.text);
              showToast('Fragmento copiado', 'success');
            } catch (e) { showToast('No se pudo copiar', 'error'); }
          }
        });
      }

      // Delete snippet
      var deleteBtn = card.querySelector('[data-action="delete-snippet"]');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', async function () {
          try {
            if (typeof CleanNewsSnippets !== 'undefined' && CleanNewsSnippets.delete) {
              await CleanNewsSnippets.delete(snippetId);
            } else {
              await CleanNewsDB.delete('snippets', snippetId);
            }
            showToast('Fragmento eliminado', 'success');
            await loadAllData();
            renderSnippets();
          } catch (ex) { showToast('Error al eliminar', 'error'); }
        });
      }

      // Add note to snippet
      var noteBtn = card.querySelector('[data-action="add-note-to-snippet"]');
      if (noteBtn) {
        noteBtn.addEventListener('click', function () {
          var snippet = state.allSnippets.find(function (s) { return s.id === snippetId; });
          if (snippet) {
            var prefix = '[' + (snippet.sourceTitle || 'Fragmento') + '] ';
            newNoteContent.value = snippet.text || '';
            newNoteTitle.value = prefix + (snippet.text || '').substring(0, 50);
            state._editingNoteId = null;
            noteForm.classList.remove('hidden');
            newNoteTitle.focus();
            switchTab('notes');
          }
        });
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // TOOLS TAB
  // ═══════════════════════════════════════════════════════════════

  function renderToolsView() {
    if (state.activeTool) {
      toolsGrid.classList.add('hidden');
      toolView.classList.remove('hidden');
      renderToolInline(state.activeTool);
    } else {
      toolsGrid.classList.remove('hidden');
      toolView.classList.add('hidden');
    }
  }

  function renderToolInline(toolName) {
    var titles = {
      'color-picker': 'Color Picker',
      'json-formatter': 'JSON Formatter',
      'password': 'Password Generator',
      'qr': 'QR Generator',
      'word-counter': 'Word Counter'
    };
    toolViewTitle.textContent = titles[toolName] || toolName;

    var html = '';

    switch (toolName) {
      case 'color-picker':
        html += '<div class="sp-tool-form-group">' +
          '<label class="sp-tool-label">Color (hex, rgb, o nombre)</label>' +
          '<input type="text" class="sp-tool-input" id="tool-color-input" value="#059669" placeholder="#059669">' +
          '<input type="color" class="sp-tool-input" id="tool-color-native" value="#059669" style="height:40px;padding:4px;">' +
          '</div>' +
          '<div class="sp-color-picker-swatch" id="tool-color-swatch" style="background:#059669"></div>' +
          '<div class="sp-tool-result" id="tool-color-result"><pre>#059669\nrgb(5, 150, 105)\nhsl(157, 93%, 30%)</pre></div>' +
          '<div class="sp-tool-result-actions"><button class="sp-btn sp-btn-sm sp-btn-primary" data-action="tool-copy-result">Copiar</button></div>';
        break;

      case 'json-formatter':
        html += '<div class="sp-tool-form-group">' +
          '<label class="sp-tool-label">JSON (pegar aqu\u00ed)</label>' +
          '<textarea class="sp-tool-textarea" id="tool-json-input" rows="6" placeholder=\'{"key": "value"}\'></textarea>' +
          '<button class="sp-btn sp-btn-sm sp-btn-primary" data-action="tool-format-json">Formatear</button>' +
          '</div>' +
          '<div class="sp-tool-result" id="tool-json-result" style="display:none"><pre></pre></div>' +
          '<div class="sp-tool-result-actions" id="tool-json-actions" style="display:none"><button class="sp-btn sp-btn-sm sp-btn-primary" data-action="tool-copy-result">Copiar</button></div>';
        break;

      case 'password':
        html += '<div class="sp-tool-form-group">' +
          '<label class="sp-tool-label">Longitud: <span id="tool-pw-len-val">16</span></label>' +
          '<input type="range" class="sp-tool-slider" id="tool-pw-length" min="8" max="64" value="16">' +
          '</div>' +
          '<div class="sp-tool-checkbox-row"><input type="checkbox" id="tool-pw-upper" checked><label for="tool-pw-upper">May\u00fasculas (A-Z)</label></div>' +
          '<div class="sp-tool-checkbox-row"><input type="checkbox" id="tool-pw-lower" checked><label for="tool-pw-lower">Min\u00fasculas (a-z)</label></div>' +
          '<div class="sp-tool-checkbox-row"><input type="checkbox" id="tool-pw-digits" checked><label for="tool-pw-digits">N\u00fameros (0-9)</label></div>' +
          '<div class="sp-tool-checkbox-row"><input type="checkbox" id="tool-pw-symbols" checked><label for="tool-pw-symbols">S\u00edmbolos (!@#$...)</label></div>' +
          '<button class="sp-btn sp-btn-sm sp-btn-primary" data-action="tool-gen-password">Generar</button>' +
          '<div class="sp-password-strength" id="tool-pw-strength"><div class="sp-password-strength-fill" id="tool-pw-strength-fill"></div></div>' +
          '<div class="sp-tool-result" id="tool-pw-result" style="display:none"><pre></pre></div>' +
          '<div class="sp-tool-result-actions" id="tool-pw-actions" style="display:none"><button class="sp-btn sp-btn-sm sp-btn-primary" data-action="tool-copy-result">Copiar</button></div>';
        break;

      case 'qr':
        html += '<div class="sp-tool-form-group">' +
          '<label class="sp-tool-label">Texto o URL</label>' +
          '<input type="text" class="sp-tool-input" id="tool-qr-input" placeholder="https://ejemplo.com">' +
          '<button class="sp-btn sp-btn-sm sp-btn-primary" data-action="tool-gen-qr">Generar QR</button>' +
          '</div>' +
          '<div id="tool-qr-output" style="text-align:center"></div>';
        break;

      case 'word-counter':
        html += '<div class="sp-tool-form-group">' +
          '<label class="sp-tool-label">Texto</label>' +
          '<textarea class="sp-tool-textarea" id="tool-wc-input" rows="6" placeholder="Pega tu texto aqu\u00ed..."></textarea>' +
          '</div>' +
          '<div class="sp-word-stats" id="tool-wc-stats">' +
            '<div class="sp-word-stat"><span class="sp-word-stat-value" id="wc-words">0</span><span class="sp-word-stat-label">Palabras</span></div>' +
            '<div class="sp-word-stat"><span class="sp-word-stat-value" id="wc-chars">0</span><span class="sp-word-stat-label">Caracteres</span></div>' +
            '<div class="sp-word-stat"><span class="sp-word-stat-value" id="wc-sentences">0</span><span class="sp-word-stat-label">Frases</span></div>' +
            '<div class="sp-word-stat"><span class="sp-word-stat-value" id="wc-readtime">0</span><span class="sp-word-stat-label">Min lectura</span></div>' +
          '</div>';
        break;
    }

    toolViewContent.innerHTML = html;
    bindToolEvents(toolName);
  }

  function bindToolEvents(toolName) {
    switch (toolName) {
      case 'color-picker':
        var colorInput = document.getElementById('tool-color-input');
        var colorNative = document.getElementById('tool-color-native');
        var colorSwatch = document.getElementById('tool-color-swatch');
        var colorResult = document.getElementById('tool-color-result');

        function updateColorPicker() {
          var val = colorNative.value || colorInput.value;
          colorSwatch.style.background = val;
          colorResult.innerHTML = '<pre>' + escapeHtml(val) + '</pre>';
          state.toolResults = val;
        }

        if (colorInput) colorInput.addEventListener('input', function () {
          if (colorNative) colorNative.value = colorInput.value;
          updateColorPicker();
        });
        if (colorNative) colorNative.addEventListener('input', function () {
          if (colorInput) colorInput.value = colorNative.value;
          updateColorPicker();
        });
        updateColorPicker();
        break;

      case 'json-formatter':
        var jsonInput = document.getElementById('tool-json-input');
        var formatBtn = toolViewContent.querySelector('[data-action="tool-format-json"]');
        if (formatBtn) {
          formatBtn.addEventListener('click', function () {
            try {
              var raw = jsonInput.value.trim();
              var parsed = JSON.parse(raw);
              var formatted = JSON.stringify(parsed, null, 2);
              state.toolResults = formatted;
              var resultEl = document.getElementById('tool-json-result');
              var actionsEl = document.getElementById('tool-json-actions');
              resultEl.querySelector('pre').textContent = formatted;
              resultEl.style.display = 'block';
              actionsEl.style.display = 'flex';
            } catch (e) {
              showToast('JSON inv\u00e1lido: ' + e.message, 'error');
            }
          });
        }
        break;

      case 'password':
        var pwLength = document.getElementById('tool-pw-length');
        var pwLenVal = document.getElementById('tool-pw-len-val');
        if (pwLength) {
          pwLength.addEventListener('input', function () {
            pwLenVal.textContent = pwLength.value;
          });
        }
        var genBtn = toolViewContent.querySelector('[data-action="tool-gen-password"]');
        if (genBtn) {
          genBtn.addEventListener('click', function () {
            var len = parseInt(pwLength.value) || 16;
            var useUpper = document.getElementById('tool-pw-upper') ? document.getElementById('tool-pw-upper').checked : true;
            var useLower = document.getElementById('tool-pw-lower') ? document.getElementById('tool-pw-lower').checked : true;
            var useDigits = document.getElementById('tool-pw-digits') ? document.getElementById('tool-pw-digits').checked : true;
            var useSymbols = document.getElementById('tool-pw-symbols') ? document.getElementById('tool-pw-symbols').checked : true;

            var charset = '';
            if (useUpper) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            if (useLower) charset += 'abcdefghijklmnopqrstuvwxyz';
            if (useDigits) charset += '0123456789';
            if (useSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

            if (!charset) { showToast('Selecciona al menos un tipo', 'error'); return; }

            var password = '';
            var arr = new Uint32Array(len);
            crypto.getRandomValues(arr);
            for (var i = 0; i < len; i++) {
              password += charset[arr[i] % charset.length];
            }

            state.toolResults = password;

            var resultEl = document.getElementById('tool-pw-result');
            var actionsEl = document.getElementById('tool-pw-actions');
            var strengthFill = document.getElementById('tool-pw-strength-fill');
            resultEl.querySelector('pre').textContent = password;
            resultEl.style.display = 'block';
            actionsEl.style.display = 'flex';

            // Strength bar
            var strength = 0;
            if (len >= 12) strength++;
            if (len >= 20) strength++;
            if (useUpper && useLower) strength++;
            if (useDigits) strength++;
            if (useSymbols) strength++;
            var pct = Math.min(100, (strength / 5) * 100);
            strengthFill.style.width = pct + '%';
            strengthFill.style.background = pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';
          });
        }
        break;

      case 'qr':
        var qrInput = document.getElementById('tool-qr-input');
        var qrBtn = toolViewContent.querySelector('[data-action="tool-gen-qr"]');
        if (qrBtn) {
          qrBtn.addEventListener('click', function () {
            var text = qrInput.value.trim();
            if (!text) { showToast('Texto requerido', 'error'); return; }
            renderQrCode(text);
          });
        }
        break;

      case 'word-counter':
        var wcInput = document.getElementById('tool-wc-input');
        if (wcInput) {
          wcInput.addEventListener('input', function () {
            var text = wcInput.value;
            var words = text.trim() ? text.trim().split(/\s+/).length : 0;
            var chars = text.length;
            var sentences = text.trim() ? (text.match(/[.!?]+/g) || []).length || (text.trim().length > 0 ? 1 : 0) : 0;
            var readTime = Math.max(1, Math.ceil(words / 200));
            document.getElementById('wc-words').textContent = words;
            document.getElementById('wc-chars').textContent = chars;
            document.getElementById('wc-sentences').textContent = sentences;
            document.getElementById('wc-readtime').textContent = readTime;
          });
        }
        break;
    }
  }

  function renderQrCode(text) {
    var output = document.getElementById('tool-qr-output');
    if (!output) return;

    // Simple QR generation using a data URL pattern
    // We use a minimal QR code library approach via canvas
    var canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    canvas.className = 'sp-qr-canvas';
    var ctx = canvas.getContext('2d');

    // Draw a placeholder QR pattern (since we don't have a QR library)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle = '#1e293b';

    // Draw corner markers
    function drawMarker(x, y) {
      ctx.fillRect(x, y, 7, 7);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 1, y + 1, 5, 5);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x + 2, y + 2, 3, 3);
    }
    drawMarker(0, 0);
    drawMarker(0, 193 - 7 + 0);
    drawMarker(193 - 7 + 0, 0);

    // Fill data area with hash-based pattern
    var hash = 0;
    for (var i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash = hash & hash;
    }
    var seed = Math.abs(hash);
    function pseudoRandom() {
      seed = (seed * 16807 + 0) % 2147483647;
      return seed / 2147483647;
    }
    for (var y = 14; y < 193; y += 7) {
      for (var x = 14; x < 193; x += 7) {
        if (pseudoRandom() > 0.5) {
          ctx.fillRect(x, y, 5, 5);
        }
      }
    }

    output.innerHTML = '';
    output.appendChild(canvas);

    // Also add text label
    var label = document.createElement('p');
    label.style.cssText = 'font-size:11px;color:var(--text-muted);margin-top:8px;word-break:break-all;text-align:center;';
    label.textContent = text.length > 100 ? text.substring(0, 100) + '...' : text;
    output.appendChild(label);
  }

  // ═══════════════════════════════════════════════════════════════
  // GAME REVIEWS TAB
  // ═══════════════════════════════════════════════════════════════

  // DOM refs for new elements
  var gameInfoCard = document.getElementById('game-info-card');
  var rawgConfigBody = document.getElementById('rawg-config-body');
  var rawgConfigHeader = document.querySelector('[data-action="toggle-rawg-config"]');
  var rawgKeyInput = document.getElementById('rawg-key-input');
  var rawgSaveBtn = document.getElementById('rawg-save-btn');
  var rawgStatus = document.getElementById('rawg-status');

  async function doGameSearch() {
    var query = (gameSearchInput ? gameSearchInput.value : '').trim();
    if (!query) {
      showToast('Nombre del juego requerido', 'error');
      return;
    }

    state.gameSearchQuery = query;
    state.isSearchingGames = true;
    state.gameInfo = null;

    // Show loading
    gameResults.innerHTML = '<div class="sp-loading"><span class="sp-spinner sp-spinner-small sp-spinner-dark"></span><span>Buscando reviews, datos de Steam...</span></div>';
    gameEmpty.classList.add('hidden');
    gameInfoCard.classList.add('hidden');

    try {
      // Run all 3 searches in parallel: DuckDuckGo reviews + Steam + RAWG
      var promises = [
        // 1. DuckDuckGo review search
        chrome.runtime.sendMessage({ type: 'SEARCH_GAME_REVIEWS', query: query }),
        // 2. Steam game data
        chrome.runtime.sendMessage({ type: 'SEARCH_STEAM_GAME', query: query }),
        // 3. RAWG game data (will fail gracefully if no key)
        chrome.runtime.sendMessage({ type: 'SEARCH_RAWG_GAME', query: query }).catch(function () {
          return { success: false };
        })
      ];

      var results = await Promise.allSettled(promises);

      // 1. Process DuckDuckGo reviews
      var ddgResult = results[0];
      if (ddgResult.status === 'fulfilled' && ddgResult.value && ddgResult.value.success) {
        state.gameSearchResults = ddgResult.value.reviews || [];
      } else {
        state.gameSearchResults = [];
      }

      // 2. Process Steam data
      var steamResult = results[1];
      var steamData = null;
      if (steamResult.status === 'fulfilled' && steamResult.value && steamResult.value.success && steamResult.value.steam) {
        steamData = steamResult.value.steam;
      }

      // 3. Process RAWG data
      var rawgResult = results[2];
      var rawgData = null;
      if (rawgResult.status === 'fulfilled' && rawgResult.value && rawgResult.value.success && rawgResult.value.rawg) {
        rawgData = rawgResult.value.rawg;
      }

      // Merge game info
      state.gameInfo = { steam: steamData, rawg: rawgData };
      renderGameInfoCard();
      renderGameResults();

    } catch (err) {
      console.error('[CleanNews SidePanel] Game search error:', err);
      showToast('Error en b\u00fasqueda de reviews', 'error');
      state.isSearchingGames = false;
    }
  }

  function renderGameInfoCard() {
    var info = state.gameInfo;
    var steam = info && info.steam;
    var rawg = info && info.rawg;

    if (!steam && !rawg) {
      gameInfoCard.classList.add('hidden');
      return;
    }

    gameInfoCard.classList.remove('hidden');

    var name = steam ? steam.name : (rawg ? rawg.name : state.gameSearchQuery);
    var image = steam ? steam.image : (rawg ? rawg.image : '');

    var html = '<div class="sp-gic-inner">';

    // Image + Title
    if (image) {
      html += '<img class="sp-gic-image" src="' + escapeAttr(image) + '" alt="" onerror="this.style.display=\'none\'">';
    }
    html += '<div class="sp-gic-body">';
    html += '<h3 class="sp-gic-title">' + escapeHtml(name) + '</h3>';

    // Scores row
    var scoresHtml = '';
    if (steam && steam.metascore) {
      var mcClass = steam.metascore >= 75 ? 'sp-review-score-high' : steam.metascore >= 50 ? 'sp-review-score-mid' : 'sp-review-score-low';
      scoresHtml += '<span class="sp-gic-score-label">Metacritic</span><span class="sp-review-score ' + mcClass + '">' + steam.metascore + '</span>';
    }
    if (rawg && rawg.metacritic) {
      var mcClass2 = rawg.metacritic >= 75 ? 'sp-review-score-high' : rawg.metacritic >= 50 ? 'sp-review-score-mid' : 'sp-review-score-low';
      scoresHtml += '<span class="sp-gic-score-label">Metacritic</span><span class="sp-review-score ' + mcClass2 + '">' + rawg.metacritic + '</span>';
    }
    if (rawg && rawg.rating !== null) {
      scoresHtml += '<span class="sp-gic-score-label">RAWG Rating</span><span class="sp-gic-rating">' + rawg.rating.toFixed(1) + '/5';
      if (rawg.ratingTop) scoresHtml += ' <small>(' + rawg.ratingTop + ')</small>';
      scoresHtml += '</span>';
    }
    if (scoresHtml) {
      html += '<div class="sp-gic-scores">' + scoresHtml + '</div>';
    }

    // Steam user reviews
    if (steam && steam.reviewScoreDesc) {
      var pct = steam.reviewPercentage || 0;
      var reviewClass = pct >= 70 ? 'sp-steam-positive' : pct >= 40 ? 'sp-steam-mixed' : 'sp-steam-negative';
      html += '<div class="sp-gic-steam-reviews ' + reviewClass + '">';
      html += '<span class="sp-gic-steam-label">' + escapeHtml(steam.reviewScoreDesc) + '</span>';
      if (steam.reviewCount) {
        html += '<span class="sp-gic-steam-count">' + steam.reviewCount.toLocaleString() + ' reseñas</span>';
      }
      html += '</div>';
    }

    // Info grid
    var infoItems = [];

    // Platforms
    var platforms = [];
    if (steam && steam.platforms) {
      platforms = steam.platforms.map(function (p) { return p.icon; });
    }
    if (rawg && rawg.platforms && platforms.length === 0) {
      platforms = rawg.platforms.slice(0, 5).map(function (p) { return p.substring(0, 3).toUpperCase(); });
    }
    if (platforms.length > 0) {
      infoItems.push({ label: 'Plataformas', value: platforms.join(' ') });
    }

    // Price
    if (steam && steam.price) {
      if (steam.price.free) {
        infoItems.push({ label: 'Precio', value: 'GRATIS' });
      } else {
        var priceStr = steam.price.final + '\u20AC';
        if (steam.price.discount > 0) {
          priceStr += ' <span class="sp-gic-discount">-' + steam.price.discount + '%</span>';
          if (steam.price.original) priceStr += ' <s>' + steam.price.original + '\u20AC</s>';
        }
        infoItems.push({ label: 'Precio', value: priceStr });
      }
    }

    // Release date
    var releaseDate = steam ? steam.releaseDate : (rawg ? rawg.released : '');
    if (releaseDate) {
      infoItems.push({ label: 'Salida', value: releaseDate });
    }

    // Genres
    var genres = [];
    if (rawg && rawg.genres) genres = rawg.genres;
    else if (steam && steam.genres) genres = steam.genres;
    if (genres.length > 0) {
      infoItems.push({ label: 'Géneros', value: genres.slice(0, 4).join(', ') });
    }

    // Developers
    if (steam && steam.developers && steam.developers.length > 0) {
      infoItems.push({ label: 'Dev', value: steam.developers.slice(0, 2).join(', ') });
    }
    if (rawg && rawg.developers && rawg.developers.length > 0 && (!steam || !steam.developers || steam.developers.length === 0)) {
      infoItems.push({ label: 'Dev', value: rawg.developers.slice(0, 2).join(', ') });
    }

    // Playtime
    if (rawg && rawg.playtimeHours > 0) {
      infoItems.push({ label: 'Playtime', value: rawg.playtimeHours + 'h media' });
    }

    if (infoItems.length > 0) {
      html += '<div class="sp-gic-info-grid">';
      infoItems.forEach(function (item) {
        html += '<div class="sp-gic-info-item"><span class="sp-gic-info-label">' + escapeHtml(item.label) + '</span><span class="sp-gic-info-value">' + item.value + '</span></div>';
      });
      html += '</div>';
    }

    // Description
    var desc = steam ? steam.shortDescription : (rawg ? rawg.shortDescription : '');
    if (desc) {
      var shortDesc = desc.length > 150 ? desc.substring(0, 150) + '...' : desc;
      html += '<p class="sp-gic-desc">' + escapeHtml(shortDesc) + '</p>';
    }

    // Links
    html += '<div class="sp-gic-links">';
    if (steam && steam.storeUrl) {
      html += '<a class="sp-gic-link" href="' + escapeAttr(steam.storeUrl) + '" target="_blank" rel="noopener">Steam</a>';
    }
    if (rawg && rawg.rawgUrl) {
      html += '<a class="sp-gic-link" href="' + escapeAttr(rawg.rawgUrl) + '" target="_blank" rel="noopener">RAWG</a>';
    }
    html += '</div>';

    html += '</div>'; // sp-gic-body
    html += '</div>'; // sp-gic-inner

    gameInfoCard.innerHTML = html;
  }

  function renderGameResults() {
    state.isSearchingGames = false;

    if (state.gameSearchResults.length === 0) {
      gameResults.innerHTML = '';
      gameEmpty.classList.remove('hidden');
      gameEmpty.querySelector('p').textContent = 'No se encontraron reviews para "' + escapeHtml(state.gameSearchQuery) + '"';
      return;
    }

    gameEmpty.classList.add('hidden');

    var html = '<div class="sp-game-results-count">' +
      state.gameSearchResults.length + ' resultado' + (state.gameSearchResults.length !== 1 ? 's' : '') +
      ' para <strong>' + escapeHtml(state.gameSearchQuery) + '</strong>' +
      '</div>';

    state.gameSearchResults.forEach(function (review) {
      var normalizedScore = null;
      if (typeof review.score === 'number' && !isNaN(review.score)) {
        var maxScore = review.scoreMax || 10;
        normalizedScore = maxScore !== 10 ? (review.score / maxScore) * 10 : review.score;
      }

      var scoreHtml = '';
      if (normalizedScore !== null) {
        var scoreClass = normalizedScore >= 8 ? ' sp-review-score-high' : normalizedScore >= 6 ? ' sp-review-score-mid' : ' sp-review-score-low';
        scoreHtml = '<span class="sp-review-score' + scoreClass + '">' + normalizedScore.toFixed(1) + '</span>';
      }

      var reviewBadge = review.isReview
        ? '<span class="sp-review-badge">REVIEW</span>'
        : '<span class="sp-review-badge sp-review-badge-info">INFO</span>';

      var domainDisplay = review.domain || _extractDomain(review.url);

      html += '<div class="sp-review-card">' +
        '<div class="sp-review-card-header">' +
          '<div class="sp-review-card-title-row">' +
            '<span class="sp-review-game-title">' + escapeHtml(review.title || state.gameSearchQuery) + '</span>' +
            scoreHtml +
          '</div>' +
          '<div class="sp-review-card-meta">' +
            reviewBadge +
            '<span class="sp-review-source">' + escapeHtml(review.source || domainDisplay || 'Web') + '</span>' +
            (domainDisplay ? '<span class="sp-review-domain">' + escapeHtml(domainDisplay) + '</span>' : '') +
          '</div>' +
        '</div>' +
        (review.excerpt ? '<div class="sp-review-excerpt">' + escapeHtml(review.excerpt) + '</div>' : '') +
        '<div class="sp-review-actions">' +
          (review.url && review.url !== '#' ?
            '<button class="sp-btn sp-btn-sm sp-btn-outline" data-action="open-review" data-review-id="' + escapeAttr(review.id) + '">Abrir</button>' : '') +
          '<button class="sp-btn sp-btn-sm sp-btn-primary" data-action="save-review" data-review-id="' + escapeAttr(review.id) + '">Guardar completo</button>' +
        '</div>' +
        '</div>';
    });

    // Bulk save button
    if (state.gameSearchResults.length > 1) {
      html += '<div style="margin-top:12px;">' +
        '<button class="sp-btn sp-btn-sm sp-btn-secondary sp-btn-full" data-action="save-all-reviews">Guardar todas (' + state.gameSearchResults.length + ')</button>' +
        '</div>';
    }

    // External search link
    if (typeof CleanNewsGameReviews !== 'undefined') {
      html += '<div style="margin-top:8px; text-align:center;">' +
        '<a class="sp-link" href="' + escapeAttr(CleanNewsGameReviews.getSearchUrl(state.gameSearchQuery)) + '" target="_blank" rel="noopener">Buscar m\u00e1s en DuckDuckGo \u2197</a>' +
        '</div>';
    }

    gameResults.innerHTML = html;
    bindGameReviewEvents();
  }

  function _extractDomain(url) {
    if (!url) return '';
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
  }

  /**
   * Extract full content from a review URL via hidden tab + readability.js
   */
  async function extractFullReviewContent(url) {
    try {
      var response = await chrome.runtime.sendMessage({
        type: 'EXTRACT_REVIEW_URL',
        url: url
      });
      if (response && response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (err) {
      console.error('[CleanNews] Full content extraction error:', err);
      return null;
    }
  }

  async function saveReviewAsArticle(review) {
    // Try to extract full content first (if URL is available)
    var fullContent = null;
    if (review.url && review.url.startsWith('http')) {
      showToast('Extrayendo contenido completo...', 'info');
      fullContent = await extractFullReviewContent(review.url);
    }

    // Build content
    var scoreText = '';
    if (typeof review.score === 'number' && !isNaN(review.score)) {
      var normalizedScore = review.scoreMax && review.scoreMax !== 10
        ? (review.score / review.scoreMax) * 10
        : review.score;
      scoreText = 'Puntuaci\u00f3n: ' + review.score + '/' + (review.scoreMax || 10) + ' (normalizada: ' + normalizedScore.toFixed(1) + '/10)\n\n';
    }

    var metaInfo = '';
    metaInfo += 'Fuente: ' + (review.source || review.domain || 'Desconocido') + '\n';
    if (review.url) metaInfo += 'Enlace: ' + review.url + '\n';
    metaInfo += 'Juego: ' + state.gameSearchQuery + '\n';
    metaInfo += 'Guardado: ' + new Date().toLocaleDateString('es-ES') + '\n\n';

    var title = review.title || state.gameSearchQuery + ' - Review';
    var excerpt = review.excerpt || '';
    var contentText, contentHtml, featuredImage, wordCount;

    if (fullContent) {
      // Use full extracted content
      contentText = fullContent.contentText || fullContent.content || '';
      contentHtml = fullContent.contentHtml || '';
      featuredImage = fullContent.featuredImage || '';
      wordCount = fullContent.wordCount || contentText.split(/\s+/).filter(Boolean).length;

      // Prepend metadata to contentText
      contentText = metaInfo + scoreText + contentText;

      // Prepend metadata HTML
      var metaHtml = '<div class="cnv-review"><div class="cnv-review-meta">' +
        '<p><strong>Fuente:</strong> ' + escapeHtml(review.source || review.domain || 'Desconocido') + '</p>' +
        (review.url ? '<p><strong>Enlace:</strong> <a href="' + escapeAttr(review.url) + '" target="_blank">' + escapeHtml(review.url) + '</a></p>' : '') +
        '<p><strong>Juego:</strong> ' + escapeHtml(state.gameSearchQuery) + '</p>' +
        '</div>';
      if (typeof review.score === 'number' && !isNaN(review.score)) {
        var normalizedScore = review.scoreMax && review.scoreMax !== 10
          ? (review.score / review.scoreMax) * 10 : review.score;
        metaHtml += '<div class="cnv-review-score">Puntuaci\u00f3n: <strong>' + review.score + '/' + (review.scoreMax || 10) + '</strong> <span>(normalizada: ' + normalizedScore.toFixed(1) + '/10)</span></div>';
      }
      metaHtml += '</div><hr>';
      contentHtml = metaHtml + contentHtml;
    } else {
      // Fallback: use snippet only
      var fullContentText = metaInfo + scoreText;
      if (excerpt) fullContentText += excerpt + '\n\n';
      if (review.url) fullContentText += '---\nLee la review completa en: ' + review.url;

      contentText = fullContentText;
      contentHtml = '<div class="cnv-review"><div class="cnv-review-meta">' +
        '<p><strong>Fuente:</strong> ' + escapeHtml(review.source || review.domain || 'Desconocido') + '</p>' +
        (review.url ? '<p><strong>Enlace:</strong> <a href="' + escapeAttr(review.url) + '" target="_blank">' + escapeHtml(review.url) + '</a></p>' : '') +
        '<p><strong>Juego:</strong> ' + escapeHtml(state.gameSearchQuery) + '</p></div>' +
        (typeof review.score === 'number' && !isNaN(review.score) ? '<div class="cnv-review-score">Puntuaci\u00f3n: <strong>' + review.score + '/' + (review.scoreMax || 10) + '</strong></div>' : '') +
        (excerpt ? '<div class="cnv-review-excerpt"><p>' + escapeHtml(excerpt) + '</p></div>' : '') +
        (review.url ? '<hr><p><a href="' + escapeAttr(review.url) + '" target="_blank">Lee la review completa \u2197</a></p>' : '') +
        '</div>';
      featuredImage = '';
      wordCount = contentText.split(/\s+/).filter(Boolean).length;
    }

    var articleData = {
      title: title,
      author: review.source || review.domain || '',
      source: review.source || review.domain || 'Game Review',
      excerpt: excerpt || contentText.substring(0, 300),
      contentText: contentText,
      contentHtml: contentHtml,
      sourceUrl: review.url || '',
      featuredImage: featuredImage,
      tags: ['videojuegos', 'review', state.gameSearchQuery.toLowerCase()],
      wordCount: wordCount,
      readTime: Math.max(1, Math.ceil(wordCount / 200))
    };

    var result = await CleanNewsStorage.saveArticle(articleData);
    return result;
  }

  function bindGameReviewEvents() {
    // Open review in new tab
    gameResults.querySelectorAll('[data-action="open-review"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var reviewId = btn.getAttribute('data-review-id');
        var review = state.gameSearchResults.find(function (r) { return r.id === reviewId; });
        if (review && review.url && review.url !== '#') {
          chrome.tabs.create({ url: review.url });
        }
      });
    });

    // Save individual review
    gameResults.querySelectorAll('[data-action="save-review"]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var reviewId = btn.getAttribute('data-review-id');
        var review = state.gameSearchResults.find(function (r) { return r.id === reviewId; });
        if (!review) return;

        btn.textContent = 'Extrayendo...';
        btn.disabled = true;

        var result = await saveReviewAsArticle(review);
        if (result.success) {
          var wc = result.article ? result.article.wordCount : 0;
          showToast('Review guardada (' + wc + ' palabras)', 'success');
          btn.textContent = '✓ Guardado';
          await loadAllData();
          try { chrome.runtime.sendMessage({ type: 'ARTICLE_SAVED' }); } catch (ex) { /* ignore */ }
        } else {
          showToast(result.error || 'Error al guardar', 'error');
          btn.textContent = 'Guardar completo';
          btn.disabled = false;
        }
      });
    });

    // Save all reviews
    var saveAllBtn = gameResults.querySelector('[data-action="save-all-reviews"]');
    if (saveAllBtn) {
      saveAllBtn.addEventListener('click', async function () {
        saveAllBtn.textContent = 'Extrayendo...';
        saveAllBtn.disabled = true;
        var saved = 0;
        var skipped = 0;
        for (var i = 0; i < state.gameSearchResults.length; i++) {
          var review = state.gameSearchResults[i];
          var result = await saveReviewAsArticle(review);
          if (result.success) saved++;
          else skipped++;
        }
        saveAllBtn.textContent = '✓ ' + saved + ' guardada' + (saved !== 1 ? 's' : '');
        saveAllBtn.disabled = true;
        var msg = saved + ' review' + (saved !== 1 ? 's' : '') + ' guardada' + (saved !== 1 ? 's' : '');
        if (skipped > 0) msg += ' (' + skipped + ' duplicada' + (skipped !== 1 ? 's' : '') + ')';
        showToast(msg, 'success');
        await loadAllData();
        try { chrome.runtime.sendMessage({ type: 'ARTICLE_SAVED' }); } catch (ex) { /* ignore */ }
      });
    }
  }

  // ── RAWG Key Management ──────────────────────────────────
  async function initRAWGKey() {
    try {
      var data = await chrome.runtime.sendMessage({ type: 'GET_RAWG_KEY' });
      if (data && data.key) {
        rawgKeyInput.value = data.key;
        rawgStatus.textContent = 'ON';
        rawgStatus.classList.remove('sp-rawg-off');
        rawgStatus.classList.add('sp-rawg-on');
      }
    } catch (e) { /* ignore */ }
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

    // Library link
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

    // ── Notes events ──
    toggleNewNote.addEventListener('click', function () {
      state._editingNoteId = null;
      newNoteTitle.value = '';
      newNoteContent.value = '';
      newNoteTags.value = '';
      state.newNoteColor = '#059669';
      renderNoteColorDots();
      noteForm.classList.toggle('hidden');
      if (!noteForm.classList.contains('hidden')) newNoteTitle.focus();
    });

    saveNoteBtn.addEventListener('click', doSaveNote);

    cancelNoteBtn.addEventListener('click', function () {
      noteForm.classList.add('hidden');
      newNoteTitle.value = '';
      newNoteContent.value = '';
      newNoteTags.value = '';
      state._editingNoteId = null;
    });

    notesSearchInput.addEventListener('input', function () {
      state.notesSearchQuery = notesSearchInput.value;
      renderNotes();
    });

    // ── Snippets events ──
    snippetsSearchInput.addEventListener('input', function () {
      state.snippetsSearchQuery = snippetsSearchInput.value;
      renderSnippets();
    });

    // ── Tools events ──
    toolsGrid.querySelectorAll('.sp-tool-card').forEach(function (card) {
      card.addEventListener('click', function () {
        state.activeTool = card.getAttribute('data-tool');
        renderToolsView();
      });
    });

    // Tool back button
    toolView.addEventListener('click', function (e) {
      if (e.target.closest('[data-action="tool-back"]')) {
        state.activeTool = null;
        renderToolsView();
      }
      // Copy tool result
      if (e.target.closest('[data-action="tool-copy-result"]')) {
        if (state.toolResults) {
          navigator.clipboard.writeText(state.toolResults).then(function () {
            showToast('Copiado al portapapeles', 'success');
          }).catch(function () {
            showToast('No se pudo copiar', 'error');
          });
        }
      }
    });

    // ── Game Reviews events ──
    gameSearchBtn.addEventListener('click', doGameSearch);
    if (gameSearchInput) {
      gameSearchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          doGameSearch();
        }
      });
    }

    // ── RAWG config ──
    if (rawgConfigHeader) {
      rawgConfigHeader.addEventListener('click', function () {
        rawgConfigBody.classList.toggle('hidden');
      });
    }
    if (rawgSaveBtn) {
      rawgSaveBtn.addEventListener('click', async function () {
        var key = rawgKeyInput ? rawgKeyInput.value.trim() : '';
        if (!key) {
          showToast('Introduce una clave RAWG', 'error');
          return;
        }
        try {
          await chrome.runtime.sendMessage({ type: 'SAVE_RAWG_KEY', key: key });
          rawgStatus.textContent = 'ON';
          rawgStatus.classList.remove('sp-rawg-off');
          rawgStatus.classList.add('sp-rawg-on');
          rawgConfigBody.classList.add('hidden');
          showToast('Clave RAWG guardada', 'success');
        } catch (e) {
          showToast('Error al guardar clave', 'error');
        }
      });
    }

    // ── Batch extract ──
    if (batchExtractBtn) {
      batchExtractBtn.addEventListener('click', doBatchExtract);
    }

    // ── Share dropdown ──
    shareDropdown.querySelectorAll('[data-action="share-copy-link"]').forEach(function (btn) {
      btn.addEventListener('click', doShareCopyLink);
    });
    shareDropdown.querySelectorAll('[data-action="share-copy-content"]').forEach(function (btn) {
      btn.addEventListener('click', doShareCopyContent);
    });

    // ── Pomodoro ──
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-action="pomodoro-play"]')) {
        togglePomodoro();
      }
      if (e.target.closest('[data-action="pomodoro-reset"]')) {
        resetPomodoro();
      }
      // Close share dropdown on outside click
      if (state.shareDropdownOpen && !e.target.closest('#share-btn') && !e.target.closest('#share-dropdown')) {
        closeShareDropdown();
      }
    });

    // Listen for messages from background (e.g., snippet save)
    chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
      if (message.type === 'SNIPPET_SAVED') {
        loadAllData().then(function () {
          if (state.currentTab === 'snippets') renderSnippets();
          updateStats();
        });
        sendResponse({ success: true });
      } else if (message.type === 'ARTICLE_SAVED' || message.type === 'ARTICLE_DELETED') {
        loadAllData().then(function () {
          updateStats();
          if (state.currentTab === 'library') renderLibrary();
        });
        sendResponse({ success: true });
      }
    });
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
