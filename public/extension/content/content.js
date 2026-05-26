// CleanNews Vault v3.0 — Content Script (FAB + Shadow DOM Sidebar)
// Runs in extension's isolated world on every webpage.
// Creates a floating action button + sliding sidebar panel via Shadow DOM.
// All logic runs in content-script context (NOT inside <script> in shadow).

/* eslint-disable no-unused-vars */

'use strict';

// ══════════════════════════════════════════════════════════════════
// GUARD — Prevent double initialization
// ══════════════════════════════════════════════════════════════════
if (window.__cleanNewsContentLoaded) return;
window.__cleanNewsContentLoaded = true;

// ══════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════════════

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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

function debounce(fn, ms) {
  var timer = null;
  return function () {
    var args = arguments;
    var ctx = this;
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () { fn.apply(ctx, args); }, ms);
  };
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

function truncate(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.substring(0, maxLen) + '…' : str;
}

// ══════════════════════════════════════════════════════════════════
// SVG ICON TEMPLATES
// ══════════════════════════════════════════════════════════════════

var ICONS = {
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  starFilled: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  bookmark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
  tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
  folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  arrowLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  zap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  xSmall: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  library: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
  emptyBox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>'
};

var COLLECTION_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
];

// ══════════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════════

var state = {
  currentTab: 'extract',
  allArticles: [],
  allCollections: [],
  currentData: null,
  currentTags: [],
  selectedCollectionId: '',
  activeFilter: 'all',
  searchQuery: '',
  sidebarOpen: false,
  existingArticleId: null,
  isExtracting: false,
  allExistingTags: [],
  tagSuggestionsOpen: false,
  tagSuggestionIndex: -1,
  collectionFilterId: '',
  newCollectionColor: COLLECTION_COLORS[0]
};

// ══════════════════════════════════════════════════════════════════
// SHADOW DOM REFERENCES (set during init)
// ══════════════════════════════════════════════════════════════════

var hostEl = null;
var shadowRoot = null;
var fabEl = null;
var overlayEl = null;
var sidebarEl = null;
var fabBadgeEl = null;
var toastContainerEl = null;

// ══════════════════════════════════════════════════════════════════
// TOAST NOTIFICATIONS
// ══════════════════════════════════════════════════════════════════

function showToast(message, type) {
  type = type || 'success';
  if (!toastContainerEl) return;

  var iconSvg = type === 'success' ? ICONS.check : ICONS.close;
  var toast = document.createElement('div');
  toast.className = 'cnv-toast cnv-toast-' + type;
  toast.innerHTML = iconSvg + '<span>' + escapeHtml(message) + '</span>';
  toastContainerEl.appendChild(toast);

  setTimeout(function () {
    toast.classList.add('cnv-toast-exit');
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 200);
  }, 2500);
}

// ══════════════════════════════════════════════════════════════════
// SIDEBAR TOGGLE
// ══════════════════════════════════════════════════════════════════

function toggleSidebar(forceState) {
  var open = typeof forceState === 'boolean' ? forceState : !state.sidebarOpen;
  state.sidebarOpen = open;

  if (open) {
    overlayEl.classList.add('cnv-overlay-visible');
    sidebarEl.classList.add('cnv-sidebar-open');
    fabEl.classList.remove('cnv-fab-pulse');
    // Reload data when opening
    refreshData();
  } else {
    overlayEl.classList.remove('cnv-overlay-visible');
    sidebarEl.classList.remove('cnv-sidebar-open');
    // Re-enable pulse after 30s if there are no saved articles
    setTimeout(function () {
      if (!state.sidebarOpen && state.allArticles.length === 0) {
        fabEl.classList.add('cnv-fab-pulse');
      }
    }, 30000);
  }
}

function openSidebar() { toggleSidebar(true); }
function closeSidebar() { toggleSidebar(false); }

// ══════════════════════════════════════════════════════════════════
// TAB SWITCHING
// ══════════════════════════════════════════════════════════════════

function switchTab(tabName) {
  state.currentTab = tabName;

  // Update tab buttons
  var tabs = shadowRoot.querySelectorAll('.cnv-tab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.toggle('cnv-tab-active', tabs[i].getAttribute('data-tab') === tabName);
  }

  // Update panels
  var panels = shadowRoot.querySelectorAll('.cnv-tab-panel');
  for (var j = 0; j < panels.length; j++) {
    panels[j].classList.toggle('cnv-tab-panel-active', panels[j].getAttribute('data-panel') === tabName);
  }

  if (tabName === 'library') {
    renderLibrary();
  } else if (tabName === 'collections') {
    renderCollections();
  }
}

// ══════════════════════════════════════════════════════════════════
// DATA LOADING
// ══════════════════════════════════════════════════════════════════

function refreshData() {
  Promise.all([
    CleanNewsStorage.getArticles(),
    CleanNewsStorage.getCollections(),
    CleanNewsStorage.getTags()
  ]).then(function (results) {
    state.allArticles = results[0] || [];
    state.allCollections = results[1] || [];
    state.allExistingTags = results[2] || [];

    // Sort articles by date descending
    state.allArticles.sort(function (a, b) {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    updateBadge();
    updateFooterStats();
    checkIfAlreadySaved();

    // Re-render current tab content
    if (state.currentTab === 'library') renderLibrary();
    if (state.currentTab === 'collections') renderCollections();
  }).catch(function (err) {
    console.error('[CleanNews Vault] refreshData error:', err);
  });
}

function updateBadge() {
  if (!fabBadgeEl) return;
  var count = state.allArticles.length;
  fabBadgeEl.textContent = count > 0 ? count : '';
  fabBadgeEl.setAttribute('data-hidden', count <= 0 ? 'true' : 'false');
}

function updateFooterStats() {
  var footerEl = shadowRoot.getElementById('cnv-footer-stats');
  if (!footerEl) return;
  var total = state.allArticles.length;
  var unread = state.allArticles.filter(function (a) { return a.readProgress === 0; }).length;
  footerEl.textContent = total + ' art\u00edculos \u00b7 ' + unread + ' sin leer';
}

function checkIfAlreadySaved() {
  var currentUrl = location.href;
  var normalized = typeof CleanNewsUrl !== 'undefined' ? CleanNewsUrl.normalize(currentUrl) : currentUrl;
  var found = state.allArticles.find(function (a) {
    if (!a.sourceUrl) return false;
    var artNorm = typeof CleanNewsUrl !== 'undefined' ? CleanNewsUrl.normalize(a.sourceUrl) : a.sourceUrl;
    return artNorm === normalized;
  });
  state.existingArticleId = found ? found.id : null;
  renderExtractTab();
}

// ══════════════════════════════════════════════════════════════════
// EXTRACT TAB
// ══════════════════════════════════════════════════════════════════

function renderExtractTab() {
  var panel = shadowRoot.querySelector('[data-panel="extract"]');
  if (!panel) return;

  var extractSection = panel.querySelector('.cnv-extract-section');
  if (!extractSection) return;

  var html = '';

  // Already saved state
  if (state.existingArticleId && !state.currentData) {
    html += '<div class="cnv-already-saved">' +
      ICONS.check +
      '<span>Ya guardado</span>' +
      '<button class="cnv-already-saved-btn" data-action="open-existing">Abrir</button>' +
      '</div>';
  }
  // Extraction loading state
  else if (state.isExtracting) {
    html += '<button class="cnv-extract-btn" disabled>' +
      '<span class="cnv-spinner"></span>' +
      '<span>Extrayendo...</span>' +
      '</button>';
  }
  // Default extract button
  else if (!state.currentData) {
    html += '<button class="cnv-extract-btn" data-action="extract">' +
      ICONS.zap +
      '<span>Extraer Art\u00edculo</span>' +
      '</button>';
  }

  // Preview section
  if (state.currentData) {
    var d = state.currentData;
    html += '<div class="cnv-preview">';
    if (d.featuredImage) {
      html += '<img class="cnv-preview-image" src="' + escapeAttr(d.featuredImage) + '" alt="" onerror="this.style.display=\'none\'">';
    }
    html += '<h3 class="cnv-preview-title">' + escapeHtml(d.title || 'Sin t\u00edtulo') + '</h3>';
    html += '<div class="cnv-preview-meta">';
    if (d.author) {
      html += '<span>' + escapeHtml(d.author) + '</span>';
    }
    if (d.source) {
      html += '<span>' + escapeHtml(d.source) + '</span>';
    }
    if (d.publishedAt) {
      html += '<span>' + ICONS.clock + ' ' + escapeHtml(d.publishedAt) + '</span>';
    }
    if (d.wordCount) {
      html += '<span>' + d.wordCount.toLocaleString() + ' palabras</span>';
    }
    if (d.readTime) {
      html += '<span>' + d.readTime + ' min lectura</span>';
    }
    html += '</div>';
    if (d.excerpt) {
      html += '<p class="cnv-preview-excerpt">' + escapeHtml(d.excerpt) + '</p>';
    }
    html += '</div>';

    // Tags section
    html += '<div class="cnv-tags-section">';
    html += '<div class="cnv-tags-label">' + ICONS.tag + ' Etiquetas</div>';
    html += '<div class="cnv-tags-container" data-action="tags-container">';
    state.currentTags.forEach(function (tag, idx) {
      html += '<span class="cnv-tag-chip" data-tag-idx="' + idx + '">' +
        escapeHtml(tag) +
        '<button class="cnv-tag-chip-remove" data-action="remove-tag" data-tag="' + escapeAttr(tag) + '">&times;</button>' +
        '</span>';
    });
    html += '<input class="cnv-tag-input" type="text" placeholder="Agregar etiqueta..." data-action="tag-input">';
    html += '</div>';
    html += '<div class="cnv-tag-suggestions" data-action="tag-suggestions"></div>';
    html += '</div>';

    // Collection selector
    html += '<div class="cnv-collection-select">';
    html += '<select data-action="collection-select">';
    html += '<option value="">Sin colecci\u00f3n</option>';
    state.allCollections.forEach(function (col) {
      var sel = col.id === state.selectedCollectionId ? ' selected' : '';
      html += '<option value="' + escapeAttr(col.id) + '"' + sel + '>' + escapeHtml(col.name) + '</option>';
    });
    html += '</select>';
    html += '</div>';

    // Action buttons
    html += '<div class="cnv-extract-actions">';
    html += '<button class="cnv-btn cnv-btn-primary" data-action="save-article">' + ICONS.book + ' Guardar</button>';
    html += '<button class="cnv-btn cnv-btn-secondary" data-action="discard-article">Descartar</button>';
    html += '</div>';
  }

  extractSection.innerHTML = html;
}

async function doExtract() {
  if (state.isExtracting) return;
  state.isExtracting = true;
  renderExtractTab();

  // Give UI time to show spinner
  await new Promise(function (r) { setTimeout(r, 50); });

  try {
    if (typeof extractArticleContent === 'function') {
      var result = extractArticleContent();
      if (result && result.success && result.data) {
        state.currentData = result.data;
        // Auto-suggest tags
        if (typeof CleanNewsAutoTagger !== 'undefined') {
          var suggested = CleanNewsAutoTagger.suggestTags(result.data);
          state.currentTags = suggested;
        }
        showToast('Art\u00edculo extra\u00eddo correctamente', 'success');
      } else {
        showToast(result && result.error ? result.error : 'No se pudo extraer el contenido', 'error');
      }
    } else {
      showToast('M\u00f3dulo de extracci\u00f3n no disponible', 'error');
    }
  } catch (err) {
    console.error('[CleanNews Vault] Extract error:', err);
    showToast('Error al extraer: ' + err.message, 'error');
  }

  state.isExtracting = false;
  renderExtractTab();
}

async function doSaveArticle() {
  if (!state.currentData) return;

  var data = state.currentData;
  data.tags = state.currentTags;
  data.collectionIds = state.selectedCollectionId ? [state.selectedCollectionId] : [];
  data.sourceUrl = data.sourceUrl || location.href;

  try {
    var result = await CleanNewsStorage.saveArticle(data);
    if (result.success) {
      showToast('Art\u00edculo guardado', 'success');
      state.currentData = null;
      state.currentTags = [];
      state.selectedCollectionId = '';
      refreshData();

      // Notify background
      try { chrome.runtime.sendMessage({ type: 'ARTICLE_SAVED' }); } catch (e) { /* ignore */ }
    } else {
      showToast(result.error || 'Error al guardar', 'error');
    }
  } catch (err) {
    console.error('[CleanNews Vault] Save error:', err);
    showToast('Error al guardar: ' + err.message, 'error');
  }
}

// ══════════════════════════════════════════════════════════════════
// LIBRARY TAB
// ══════════════════════════════════════════════════════════════════

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
    articles = articles.filter(function (a) { return a.readProgress === 0; });
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
  var panel = shadowRoot.querySelector('[data-panel="library"]');
  if (!panel) return;

  var articles = getFilteredArticles();
  var html = '';

  // Collection filter header
  if (state.collectionFilterId) {
    var col = state.allCollections.find(function (c) { return c.id === state.collectionFilterId; });
    html += '<div class="cnv-collection-filter-header">';
    html += '<span class="cnv-collection-dot" style="background:' + escapeAttr(col ? col.color : '#999') + '"></span>';
    html += '<span>' + escapeHtml(col ? col.name : 'Colecci\u00f3n') + ' (' + articles.length + ')</span>';
    html += '<button class="cnv-collection-filter-clear" data-action="clear-collection-filter">Limpiar</button>';
    html += '</div>';
  }

  // Search bar
  html += '<div class="cnv-search-bar">';
  html += '<span class="cnv-search-icon">' + ICONS.search + '</span>';
  html += '<input class="cnv-search-input" type="text" placeholder="Buscar art\u00edculos..." value="' + escapeAttr(state.searchQuery) + '" data-action="search-input">';
  html += '</div>';

  // Filter pills
  html += '<div class="cnv-filters">';
  var filters = [
    { key: 'all', label: 'Todos' },
    { key: 'favorites', label: 'Favoritos' },
    { key: 'unread', label: 'No le\u00eddos' }
  ];
  filters.forEach(function (f) {
    var activeClass = state.activeFilter === f.key ? ' cnv-filter-pill-active' : '';
    html += '<button class="cnv-filter-pill' + activeClass + '" data-action="filter" data-filter="' + f.key + '">' + f.label + '</button>';
  });
  html += '</div>';

  // Article list
  html += '<div class="cnv-article-list">';
  if (articles.length === 0) {
    html += '<div class="cnv-empty-state">';
    html += ICONS.emptyBox;
    html += '<p>' + (state.searchQuery ? 'Sin resultados' : 'No hay art\u00edculos') + '</p>';
    html += '</div>';
  } else {
    articles.forEach(function (article) {
      html += buildArticleCard(article);
    });
  }
  html += '</div>';

  // Open full library link
  html += '<button class="cnv-open-library" data-action="open-full-library">';
  html += ICONS.library;
  html += '<span>Abrir Biblioteca Completa</span>';
  html += '</button>';

  panel.innerHTML = html;
}

function buildArticleCard(article) {
  var progress = article.readProgress || 0;
  var starClass = article.favorite ? ' cnv-star-active' : '';
  var starIcon = article.favorite ? ICONS.starFilled : ICONS.star;

  var html = '<div class="cnv-article-card" data-article-id="' + escapeAttr(article.id) + '">';
  html += '<div class="cnv-article-card-header">';
  html += '<div class="cnv-article-card-info" data-action="open-article" data-article-id="' + escapeAttr(article.id) + '">';
  html += '<h4 class="cnv-article-card-title">' + escapeHtml(article.title || 'Sin t\u00edtulo') + '</h4>';
  html += '<div class="cnv-article-card-meta">';
  if (article.source) html += '<span>' + escapeHtml(article.source) + '</span>';
  html += '<span>' + formatDate(article.savedAt || article.createdAt) + '</span>';
  if (article.readTime) html += '<span>' + article.readTime + ' min</span>';
  html += '</div>';
  html += '</div>';
  html += '<div class="cnv-article-card-actions">';
  html += '<button class="cnv-card-action-btn cnv-fav-btn' + starClass + '" data-action="toggle-favorite" data-article-id="' + escapeAttr(article.id) + '" title="Favorito">' + starIcon + '</button>';
  html += '<button class="cnv-card-action-btn cnv-delete-btn" data-action="delete-article" data-article-id="' + escapeAttr(article.id) + '" title="Eliminar">' + ICONS.trash + '</button>';
  html += '</div>';
  html += '</div>';
  html += '<div class="cnv-progress-bar"><div class="cnv-progress-fill" style="width:' + progress + '%"></div></div>';
  html += '</div>';
  return html;
}

// ══════════════════════════════════════════════════════════════════
// COLLECTIONS TAB
// ══════════════════════════════════════════════════════════════════

function renderCollections() {
  var panel = shadowRoot.querySelector('[data-panel="collections"]');
  if (!panel) return;

  var html = '';

  // Header with new button
  html += '<div class="cnv-collections-header">';
  html += '<h3>Colecciones</h3>';
  html += '<button class="cnv-new-collection-btn" data-action="toggle-new-collection">' + ICONS.plus + ' Nueva</button>';
  html += '</div>';

  // New collection form
  html += '<div class="cnv-collection-form" data-action="collection-form">';
  html += '<label class="cnv-collection-form-label">Nombre de la colecci\u00f3n</label>';
  html += '<input class="cnv-collection-form-input" type="text" placeholder="Ej: Art\u00edculos de IA" data-action="new-collection-name">';
  html += '<div class="cnv-color-dots">';
  COLLECTION_COLORS.forEach(function (color, idx) {
    var selClass = state.newCollectionColor === color ? ' cnv-color-dot-selected' : '';
    html += '<button class="cnv-color-dot' + selClass + '" style="background:' + color + '" data-action="pick-color" data-color="' + color + '"></button>';
  });
  html += '</div>';
  html += '<div class="cnv-collection-form-actions">';
  html += '<button class="cnv-btn cnv-btn-primary" data-action="create-collection">Crear</button>';
  html += '<button class="cnv-btn cnv-btn-secondary" data-action="cancel-collection">Cancelar</button>';
  html += '</div>';
  html += '</div>';

  // Collection list
  html += '<div class="cnv-collection-list">';
  if (state.allCollections.length === 0) {
    html += '<div class="cnv-empty-state">';
    html += ICONS.folder;
    html += '<p>Sin colecciones a\u00fan</p>';
    html += '</div>';
  } else {
    state.allCollections.forEach(function (col) {
      var count = state.allArticles.filter(function (a) {
        return a.collectionIds && a.collectionIds.indexOf(col.id) !== -1;
      }).length;

      html += '<div class="cnv-collection-item" data-collection-id="' + escapeAttr(col.id) + '" data-action="open-collection">';
      html += '<span class="cnv-collection-dot" style="background:' + escapeAttr(col.color) + '"></span>';
      html += '<span class="cnv-collection-name">' + escapeHtml(col.name) + '</span>';
      html += '<span class="cnv-collection-count">' + count + '</span>';
      html += '<button class="cnv-collection-delete" data-action="delete-collection" data-collection-id="' + escapeAttr(col.id) + '" title="Eliminar">' + ICONS.trash + '</button>';
      html += '</div>';
    });
  }
  html += '</div>';

  panel.innerHTML = html;
}

async function doCreateCollection(name) {
  if (!name || !name.trim()) {
    showToast('Nombre requerido', 'error');
    return;
  }
  try {
    var col = await CleanNewsStorage.createCollection(name.trim(), '', state.newCollectionColor);
    showToast('Colecci\u00f3n creada', 'success');
    refreshData();
  } catch (err) {
    showToast('Error al crear colecci\u00f3n', 'error');
  }
}

async function doDeleteCollection(colId) {
  try {
    await CleanNewsStorage.deleteCollection(colId);
    if (state.collectionFilterId === colId) {
      state.collectionFilterId = '';
    }
    showToast('Colecci\u00f3n eliminada', 'success');
    refreshData();
  } catch (err) {
    showToast('Error al eliminar', 'error');
  }
}

// ══════════════════════════════════════════════════════════════════
// DARK MODE
// ══════════════════════════════════════════════════════════════════

function loadTheme() {
  try {
    CleanNewsDB.get('settings', 'theme').then(function (setting) {
      if (setting && setting.value === 'dark') {
        hostEl.setAttribute('data-theme', 'dark');
      }
    }).catch(function () { /* ignore */ });
  } catch (e) { /* ignore */ }
}

function toggleTheme() {
  var isDark = hostEl.getAttribute('data-theme') === 'dark';
  var newTheme = isDark ? 'light' : 'dark';
  hostEl.setAttribute('data-theme', newTheme);
  try {
    CleanNewsDB.put('settings', { key: 'theme', value: newTheme });
  } catch (e) { /* ignore */ }
}

// ══════════════════════════════════════════════════════════════════
// TAG AUTOCOMPLETE
// ══════════════════════════════════════════════════════════════════

function updateTagSuggestions(inputValue) {
  var suggestionsEl = shadowRoot.querySelector('[data-action="tag-suggestions"]');
  if (!suggestionsEl) return;

  if (!inputValue || !inputValue.trim()) {
    suggestionsEl.classList.remove('cnv-tag-suggestions-visible');
    suggestionsEl.innerHTML = '';
    state.tagSuggestionsOpen = false;
    state.tagSuggestionIndex = -1;
    return;
  }

  var lower = inputValue.toLowerCase().trim();
  var suggestions = [];

  // Auto-tagger suggestions (if article data exists)
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

  // Also suggest the input itself as a new tag
  if (suggestions.indexOf(inputValue.trim()) === -1 && state.currentTags.indexOf(inputValue.trim()) === -1) {
    suggestions.unshift(inputValue.trim());
  }

  suggestions = suggestions.slice(0, 6);

  if (suggestions.length === 0) {
    suggestionsEl.classList.remove('cnv-tag-suggestions-visible');
    suggestionsEl.innerHTML = '';
    state.tagSuggestionsOpen = false;
    state.tagSuggestionIndex = -1;
    return;
  }

  state.tagSuggestionsOpen = true;
  state.tagSuggestionIndex = -1;
  var html = '';
  suggestions.forEach(function (sug, idx) {
    html += '<button class="cnv-tag-suggestion" data-action="add-tag-suggestion" data-tag="' + escapeAttr(sug) + '">' + escapeHtml(sug) + '</button>';
  });
  suggestionsEl.innerHTML = html;
  suggestionsEl.classList.add('cnv-tag-suggestions-visible');
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

// ══════════════════════════════════════════════════════════════════
// EVENT DELEGATION (central handler for all clicks inside shadow)
// ══════════════════════════════════════════════════════════════════

function handleShadowClick(e) {
  var target = e.target.closest('[data-action]');
  if (!target) return;

  var action = target.getAttribute('data-action');

  switch (action) {
    case 'extract':
      e.stopPropagation();
      doExtract();
      break;

    case 'open-existing':
      e.stopPropagation();
      if (state.existingArticleId) {
        try {
          chrome.tabs.create({ url: chrome.runtime.getURL('reader/reader.html?id=' + state.existingArticleId) });
        } catch (err) { /* fallback */ }
      }
      break;

    case 'remove-tag':
      e.stopPropagation();
      removeTag(target.getAttribute('data-tag'));
      break;

    case 'save-article':
      e.stopPropagation();
      doSaveArticle();
      break;

    case 'discard-article':
      e.stopPropagation();
      state.currentData = null;
      state.currentTags = [];
      state.selectedCollectionId = '';
      renderExtractTab();
      break;

    case 'collection-select':
      e.stopPropagation();
      break; // handled by change event

    case 'open-article':
      e.stopPropagation();
      var artId = target.getAttribute('data-article-id');
      if (artId) {
        try {
          chrome.tabs.create({ url: chrome.runtime.getURL('reader/reader.html?id=' + artId) });
        } catch (err) { /* ignore */ }
      }
      break;

    case 'toggle-favorite':
      e.stopPropagation();
      var favId = target.getAttribute('data-article-id');
      if (favId) {
        CleanNewsStorage.toggleFavorite(favId).then(function () {
          refreshData();
        }).catch(function () { /* ignore */ });
      }
      break;

    case 'delete-article':
      e.stopPropagation();
      var delId = target.getAttribute('data-article-id');
      if (delId) {
        CleanNewsStorage.deleteArticle(delId).then(function () {
          showToast('Art\u00edculo eliminado', 'success');
          refreshData();
          try { chrome.runtime.sendMessage({ type: 'ARTICLE_DELETED' }); } catch (err) { /* ignore */ }
        }).catch(function () { /* ignore */ });
      }
      break;

    case 'filter':
      e.stopPropagation();
      state.activeFilter = target.getAttribute('data-filter') || 'all';
      renderLibrary();
      break;

    case 'clear-collection-filter':
      e.stopPropagation();
      state.collectionFilterId = '';
      renderLibrary();
      break;

    case 'open-full-library':
      e.stopPropagation();
      try {
        chrome.tabs.create({ url: chrome.runtime.getURL('library/library.html') });
      } catch (err) { /* ignore */ }
      break;

    case 'toggle-new-collection':
      e.stopPropagation();
      var form = shadowRoot.querySelector('[data-action="collection-form"]');
      if (form) {
        form.classList.toggle('cnv-collection-form-visible');
        if (form.classList.contains('cnv-collection-form-visible')) {
          var nameInput = form.querySelector('[data-action="new-collection-name"]');
          if (nameInput) nameInput.focus();
        }
      }
      break;

    case 'pick-color':
      e.stopPropagation();
      state.newCollectionColor = target.getAttribute('data-color') || COLLECTION_COLORS[0];
      renderCollections();
      break;

    case 'create-collection':
      e.stopPropagation();
      var nameEl = shadowRoot.querySelector('[data-action="new-collection-name"]');
      if (nameEl) doCreateCollection(nameEl.value);
      break;

    case 'cancel-collection':
      e.stopPropagation();
      var formEl = shadowRoot.querySelector('[data-action="collection-form"]');
      if (formEl) formEl.classList.remove('cnv-collection-form-visible');
      break;

    case 'delete-collection':
      e.stopPropagation();
      var colId = target.getAttribute('data-collection-id');
      if (colId) doDeleteCollection(colId);
      break;

    case 'open-collection':
      e.stopPropagation();
      // Only navigate if not clicking the delete button
      if (e.target.closest('[data-action="delete-collection"]')) return;
      var openColId = target.getAttribute('data-collection-id');
      if (openColId) {
        state.collectionFilterId = openColId;
        switchTab('library');
      }
      break;

    case 'add-tag-suggestion':
      e.stopPropagation();
      addTag(target.getAttribute('data-tag'));
      // Clear and hide suggestions
      var sugEl = shadowRoot.querySelector('[data-action="tag-suggestions"]');
      if (sugEl) {
        sugEl.classList.remove('cnv-tag-suggestions-visible');
        sugEl.innerHTML = '';
      }
      state.tagSuggestionsOpen = false;
      break;
  }
}

function handleShadowChange(e) {
  var target = e.target;
  if (target.getAttribute('data-action') === 'collection-select') {
    state.selectedCollectionId = target.value;
  }
}

function handleShadowInput(e) {
  var target = e.target;

  if (target.getAttribute('data-action') === 'search-input') {
    state.searchQuery = target.value;
    debouncedLibraryRender();
  }

  if (target.getAttribute('data-action') === 'tag-input') {
    updateTagSuggestions(target.value);
  }
}

function handleShadowKeydown(e) {
  // Handle tag input keyboard
  if (e.target.getAttribute('data-action') === 'tag-input') {
    if (e.key === 'Enter') {
      e.preventDefault();
      var val = e.target.value.trim();
      if (val) {
        addTag(val);
        e.target.value = '';
        updateTagSuggestions('');
      }
    } else if (e.key === 'Backspace' && !e.target.value && state.currentTags.length > 0) {
      removeTag(state.currentTags[state.currentTags.length - 1]);
    } else if (e.key === 'Escape') {
      var sugBox = shadowRoot.querySelector('[data-action="tag-suggestions"]');
      if (sugBox) {
        sugBox.classList.remove('cnv-tag-suggestions-visible');
        sugBox.innerHTML = '';
      }
      state.tagSuggestionsOpen = false;
    } else if (e.key === 'ArrowDown' && state.tagSuggestionsOpen) {
      e.preventDefault();
      var sugs = shadowRoot.querySelectorAll('.cnv-tag-suggestion');
      state.tagSuggestionIndex = Math.min(state.tagSuggestionIndex + 1, sugs.length - 1);
      if (sugs[state.tagSuggestionIndex]) sugs[state.tagSuggestionIndex].classList.add('cnv-tag-suggestion-focused');
      if (state.tagSuggestionIndex > 0 && sugs[state.tagSuggestionIndex - 1]) sugs[state.tagSuggestionIndex - 1].classList.remove('cnv-tag-suggestion-focused');
    } else if (e.key === 'ArrowUp' && state.tagSuggestionsOpen) {
      e.preventDefault();
      var sugsUp = shadowRoot.querySelectorAll('.cnv-tag-suggestion');
      state.tagSuggestionIndex = Math.max(state.tagSuggestionIndex - 1, 0);
      if (sugsUp[state.tagSuggestionIndex]) sugsUp[state.tagSuggestionIndex].classList.add('cnv-tag-suggestion-focused');
      if (state.tagSuggestionIndex < sugsUp.length - 1 && sugsUp[state.tagSuggestionIndex + 1]) sugsUp[state.tagSuggestionIndex + 1].classList.remove('cnv-tag-suggestion-focused');
    } else if (e.key === 'Tab' && state.tagSuggestionsOpen && state.tagSuggestionIndex >= 0) {
      e.preventDefault();
      var focusedSug = shadowRoot.querySelectorAll('.cnv-tag-suggestion')[state.tagSuggestionIndex];
      if (focusedSug) {
        addTag(focusedSug.getAttribute('data-tag'));
        e.target.value = '';
        updateTagSuggestions('');
      }
    }
  }
}

var debouncedLibraryRender = debounce(function () {
  renderLibrary();
}, 300);

// ══════════════════════════════════════════════════════════════════
// BUILD HTML STRUCTURE
// ══════════════════════════════════════════════════════════════════

function buildSidebarHtml() {
  var html = '';

  // Overlay
  html += '<div class="cnv-overlay"></div>';

  // Sidebar panel
  html += '<aside class="cnv-sidebar">';

  // Header
  html += '<header class="cnv-header">';
  html += '<div class="cnv-header-left">';
  html += '<span class="cnv-logo" style="color:var(--cnv-primary)">' + ICONS.book + '</span>';
  html += '<span class="cnv-title">CleanNews Vault</span>';
  html += '</div>';
  html += '<div class="cnv-header-actions">';
  html += '<button class="cnv-icon-btn" data-action="toggle-theme" title="Cambiar tema">' + ICONS.sun + '</button>';
  html += '<button class="cnv-icon-btn" data-action="close-sidebar" title="Cerrar">' + ICONS.close + '</button>';
  html += '</div>';
  html += '</header>';

  // Tabs
  html += '<nav class="cnv-tabs">';
  html += '<button class="cnv-tab cnv-tab-active" data-tab="extract">' + ICONS.zap + '<span>Extraer</span></button>';
  html += '<button class="cnv-tab" data-tab="library">' + ICONS.library + '<span>Biblioteca</span></button>';
  html += '<button class="cnv-tab" data-tab="collections">' + ICONS.folder + '<span>Colecciones</span></button>';
  html += '</nav>';

  // Tab content area
  html += '<div class="cnv-content">';

  // Extract panel
  html += '<div class="cnv-tab-panel cnv-tab-panel-active" data-panel="extract">';
  html += '<div class="cnv-extract-section"></div>';
  html += '</div>';

  // Library panel
  html += '<div class="cnv-tab-panel" data-panel="library"></div>';

  // Collections panel
  html += '<div class="cnv-tab-panel" data-panel="collections"></div>';

  html += '</div>';

  // Footer
  html += '<footer class="cnv-footer">';
  html += '<div class="cnv-footer-stats" id="cnv-footer-stats">0 art\u00edculos \u00b7 0 sin leer</div>';
  html += '</footer>';

  html += '</aside>';

  return html;
}

// ══════════════════════════════════════════════════════════════════
// INITIALIZATION
// ══════════════════════════════════════════════════════════════════

async function initCleanNewsSidebar() {
  try {
    // 1. Create host element
    hostEl = document.createElement('div');
    hostEl.id = 'cnv-root';
    hostEl.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;pointer-events:none;z-index:2147483644;';
    document.documentElement.appendChild(hostEl);

    // 2. Attach shadow root
    shadowRoot = hostEl.attachShadow({ mode: 'open' });

    // 3. Load CSS
    var cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = chrome.runtime.getURL('content/sidebar.css');
    shadowRoot.appendChild(cssLink);

    // 4. Build HTML
    var wrapper = document.createElement('div');
    wrapper.innerHTML = buildSidebarHtml();
    while (wrapper.firstChild) {
      shadowRoot.appendChild(wrapper.firstChild);
    }

    // 5. Create FAB (outside shadow for easy positioning)
    fabEl = document.createElement('div');
    fabEl.className = 'cnv-fab cnv-fab-pulse';
    fabEl.innerHTML = ICONS.book;
    fabEl.style.cssText = 'all:initial;'; // reset for Shadow DOM
    shadowRoot.appendChild(fabEl);

    // FAB badge
    fabBadgeEl = document.createElement('span');
    fabBadgeEl.className = 'cnv-fab-badge';
    fabBadgeEl.setAttribute('data-hidden', 'true');
    fabEl.appendChild(fabBadgeEl);

    // Toast container
    toastContainerEl = document.createElement('div');
    toastContainerEl.className = 'cnv-toast-container';
    shadowRoot.appendChild(toastContainerEl);

    // 6. Get references to key elements
    overlayEl = shadowRoot.querySelector('.cnv-overlay');
    sidebarEl = shadowRoot.querySelector('.cnv-sidebar');

    // 7. Set up event listeners

    // FAB click → toggle sidebar
    fabEl.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleSidebar();
    });

    // Overlay click → close sidebar
    overlayEl.addEventListener('click', function () {
      closeSidebar();
    });

    // Close button
    var closeBtn = shadowRoot.querySelector('[data-action="close-sidebar"]');
    if (closeBtn) {
      closeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        closeSidebar();
      });
    }

    // Theme toggle
    var themeBtn = shadowRoot.querySelector('[data-action="toggle-theme"]');
    if (themeBtn) {
      themeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleTheme();
        // Toggle icon
        var isDark = hostEl.getAttribute('data-theme') === 'dark';
        themeBtn.innerHTML = isDark ? ICONS.sun : ICONS.moon;
      });
    }

    // Tab clicks (event delegation)
    var tabsContainer = shadowRoot.querySelector('.cnv-tabs');
    if (tabsContainer) {
      tabsContainer.addEventListener('click', function (e) {
        var tabBtn = e.target.closest('.cnv-tab');
        if (tabBtn) {
          var tabName = tabBtn.getAttribute('data-tab');
          if (tabName) switchTab(tabName);
        }
      });
    }

    // Global click delegation inside shadow
    shadowRoot.addEventListener('click', handleShadowClick);

    // Change events (collection select)
    shadowRoot.addEventListener('change', handleShadowChange);

    // Input events (search, tags)
    shadowRoot.addEventListener('input', handleShadowInput);

    // Keydown events (tag autocomplete keyboard nav)
    shadowRoot.addEventListener('keydown', handleShadowKeydown);

    // Escape key → close sidebar
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.sidebarOpen) {
        closeSidebar();
      }
    });

    // 8. Initialize database
    await CleanNewsDB.init();

    // 9. Load theme preference
    loadTheme();
    // Set initial icon based on theme
    var initialDark = hostEl.getAttribute('data-theme') === 'dark';
    if (themeBtn) themeBtn.innerHTML = initialDark ? ICONS.sun : ICONS.moon;

    // 10. Load initial data
    await new Promise(function (resolve) {
      Promise.all([
        CleanNewsStorage.getArticles(),
        CleanNewsStorage.getCollections(),
        CleanNewsStorage.getTags()
      ]).then(function (results) {
        state.allArticles = results[0] || [];
        state.allCollections = results[1] || [];
        state.allExistingTags = results[2] || [];
        state.allArticles.sort(function (a, b) {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
        resolve();
      }).catch(resolve);
    });

    // 11. Update badge
    updateBadge();
    updateFooterStats();
    checkIfAlreadySaved();

    // 12. Render extract tab initial state
    renderExtractTab();

    // 13. Notify background script
    try {
      chrome.runtime.sendMessage({ type: 'SIDEBAR_READY' });
    } catch (e) {
      // Background may not be ready yet; that's fine
    }

    console.log('[CleanNews Vault] FAB sidebar initialized');
  } catch (err) {
    console.error('[CleanNews Vault] Init error:', err);
  }
}

// ══════════════════════════════════════════════════════════════════
// CHROME MESSAGE HANDLER
// ══════════════════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (!message || !message.type) return;

  switch (message.type) {
    case 'TOGGLE_SIDEBAR':
      toggleSidebar();
      sendResponse({ success: true });
      break;

    case 'EXTRACT_AND_SAVE':
      openSidebar();
      switchTab('extract');
      doExtract().then(function () {
        if (state.currentData) {
          return doSaveArticle();
        }
      }).then(function () {
        sendResponse({ success: true });
      }).catch(function (err) {
        sendResponse({ success: false, error: err.message });
      });
      return true; // async

    default:
      break;
  }
});

// ══════════════════════════════════════════════════════════════════
// LEGACY EXTRACT MESSAGE (backward compatibility with popup)
// ══════════════════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message && message.type === 'EXTRACT') {
    try {
      if (typeof extractArticleContent === 'function') {
        var result = extractArticleContent();
        sendResponse(result);
      } else {
        sendResponse({ success: false, error: 'M\u00f3dulo de extracci\u00f3n no disponible. Recarga la p\u00e1gina.' });
      }
    } catch (e) {
      sendResponse({ success: false, error: 'Error: ' + e.message });
    }
    return true;
  }
});

// ══════════════════════════════════════════════════════════════════
// LAUNCH
// ══════════════════════════════════════════════════════════════════

initCleanNewsSidebar();
