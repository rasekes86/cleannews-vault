// CleanNews Vault v2.0 - Popup Logic
// Handles extraction, preview, tagging, collection, and saving

(async function() {
  'use strict';

  // ── DOM References ──────────────────────────────────────────
  const loadingState = document.getElementById('loading-state');
  const errorState = document.getElementById('error-state');
  const savedState = document.getElementById('saved-state');
  const contentState = document.getElementById('content-state');
  const errorMessage = document.getElementById('error-message');
  const retryBtn = document.getElementById('retry-btn');

  const featuredImageContainer = document.getElementById('featured-image-container');
  const featuredImage = document.getElementById('featured-image');
  const articleTitle = document.getElementById('article-title');
  const articleSource = document.getElementById('article-source').querySelector('span');
  const articleSourceEl = document.getElementById('article-source');
  const articleAuthor = document.getElementById('article-author');
  const articleDate = document.getElementById('article-date');
  const articleWords = document.getElementById('article-words').querySelector('span');
  const articleReadtime = document.getElementById('article-readtime').querySelector('span');
  const articleExcerpt = document.getElementById('article-excerpt');

  const tagsInput = document.getElementById('tags-input');
  const tagsSuggestions = document.getElementById('tags-suggestions');
  const tagsChips = document.getElementById('tags-chips');
  const collectionSelect = document.getElementById('collection-select');
  const newCollectionBtn = document.getElementById('new-collection-btn');
  const newCollectionForm = document.getElementById('new-collection-form');
  const newCollectionName = document.getElementById('new-collection-name');
  const saveCollectionBtn = document.getElementById('save-collection-btn');
  const cancelCollectionBtn = document.getElementById('cancel-collection-btn');

  const saveBtn = document.getElementById('save-btn');
  const discardBtn = document.getElementById('discard-btn');
  const libraryLink = document.getElementById('library-link');
  const sidepanelLink = document.getElementById('sidepanel-link');
  const savedTitle = document.getElementById('saved-title');
  const openSavedBtn = document.getElementById('open-saved-btn');

  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  const themeToggle = document.getElementById('theme-toggle');

  let currentData = null;
  let currentTags = [];
  let existingTags = [];
  let allCollections = [];
  let selectedCollectionId = '';
  let newCollectionColor = '#ef4444';
  let existingArticle = null;

  // ── Initialization ─────────────────────────────────────────
  async function init() {
    try {
      await CleanNewsDB.init();
      await CleanNewsStorage.migrateFromLegacy();
      await loadTheme();
      await checkAlreadySaved();
      await loadCollections();
      await loadExistingTags();
      extractContent();
      bindEvents();
    } catch (err) {
      console.error('[CleanNews Popup] Init error:', err);
      showError('Error al inicializar. Intenta de nuevo.');
    }
  }

  // ── Theme Management ───────────────────────────────────────
  async function loadTheme() {
    try {
      const setting = await CleanNewsDB.get('settings', 'theme');
      if (setting && setting.value === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    } catch (e) {
      // ignore
    }
  }

  async function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    try {
      await CleanNewsDB.put('settings', { key: 'theme', value: newTheme });
    } catch (e) {
      // ignore
    }
  }

  // ── Check if already saved ─────────────────────────────────
  async function checkAlreadySaved() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url || tab.url.startsWith('chrome-extension://')) return;

      const articles = await CleanNewsStorage.getArticles();
      existingArticle = articles.find(a => {
        if (!a.sourceUrl) return false;
        return CleanNewsUrl.isSamePage(a.sourceUrl, tab.url);
      });

      if (existingArticle) {
        showSavedState(existingArticle);
      }
    } catch (e) {
      // ignore
    }
  }

  function showSavedState(article) {
    hideAll();
    savedState.classList.remove('hidden');
    savedTitle.textContent = article.title || 'Sin título';
    openSavedBtn.onclick = () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL('reader/reader.html?id=' + article.id)
      });
      window.close();
    };
  }

  // ── Load Collections ──────────────────────────────────────
  async function loadCollections() {
    allCollections = await CleanNewsStorage.getCollections();
    renderCollectionsDropdown();
  }

  function renderCollectionsDropdown() {
    let html = '<option value="">Sin colección</option>';
    allCollections.forEach(c => {
      html += `<option value="${escapeAttr(c.id)}">${escapeHtml(c.name)}</option>`;
    });
    collectionSelect.innerHTML = html;
  }

  // ── Load Existing Tags ─────────────────────────────────────
  async function loadExistingTags() {
    existingTags = await CleanNewsStorage.getTags();
  }

  // ── Extraction ────────────────────────────────────────────
  function extractContent() {
    if (existingArticle) return;
    showState('loading');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) {
        showError('No se encontró una pestaña activa.');
        return;
      }

      const tab = tabs[0];
      if (tab.url && tab.url.startsWith('chrome-extension://')) {
        showError('No se puede extraer contenido de páginas de extensiones.');
        return;
      }

      // Send through background script
      chrome.runtime.sendMessage({ type: 'EXTRACT' }, (response) => {
        if (chrome.runtime.lastError) {
          showError('No se pudo conectar con la página. Intenta recargar la página y volver a intentar.');
          return;
        }

        if (!response) {
          showError('No se recibió respuesta de la página.');
          return;
        }

        if (!response.success) {
          showError(response.error || 'No se pudo extraer el contenido de esta página.');
          return;
        }

        currentData = response.data;
        renderPreview(currentData);
        showState('content');
      });
    });
  }

  // ── Render Preview ────────────────────────────────────────
  function renderPreview(data) {
    // Featured image
    if (data.featuredImage) {
      featuredImageContainer.classList.remove('hidden');
      featuredImage.src = data.featuredImage;
      featuredImage.alt = data.title || '';
      featuredImage.onerror = () => {
        featuredImageContainer.classList.add('hidden');
      };
    } else {
      featuredImageContainer.classList.add('hidden');
    }

    // Title
    articleTitle.textContent = data.title || 'Sin título';

    // Source
    if (data.source) {
      articleSourceEl.classList.remove('hidden');
      articleSource.textContent = data.source;
    } else {
      articleSourceEl.classList.add('hidden');
    }

    // Author
    if (data.author) {
      articleAuthor.classList.remove('hidden');
      articleAuthor.querySelector('span').textContent = data.author;
    } else {
      articleAuthor.classList.add('hidden');
    }

    // Date
    if (data.publishedAt) {
      articleDate.classList.remove('hidden');
      articleDate.querySelector('span').textContent = data.publishedAt;
    } else {
      articleDate.classList.add('hidden');
    }

    // Stats
    articleWords.textContent = (data.wordCount || 0).toLocaleString('es-ES') + ' palabras';
    articleReadtime.textContent = '~' + Math.max(1, data.readTime || 1) + ' min lectura';

    // Excerpt
    articleExcerpt.textContent = data.excerpt || data.contentText || data.content || 'Sin contenido disponible.';

    // Auto-suggest tags
    const suggestedTags = CleanNewsAutoTagger.suggestTags(data);
    currentTags = [...new Set([...suggestedTags, ...(data.tags || [])])];
    renderTagChips();
    updateTagsInputValue();
  }

  // ── Tags Management ───────────────────────────────────────
  function renderTagChips() {
    if (currentTags.length === 0) {
      tagsChips.innerHTML = '';
      return;
    }
    tagsChips.innerHTML = currentTags.map((tag, i) => `
      <span class="tag-chip">
        ${escapeHtml(tag)}
        <button class="tag-remove" data-index="${i}">&times;</button>
      </span>
    `).join('');

    tagsChips.querySelectorAll('.tag-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index, 10);
        currentTags.splice(idx, 1);
        renderTagChips();
        updateTagsInputValue();
      });
    });
  }

  function updateTagsInputValue() {
    tagsInput.value = currentTags.join(', ');
  }

  function addTag(tag) {
    tag = tag.trim().toLowerCase();
    if (!tag || currentTags.includes(tag)) return;
    currentTags.push(tag);
    renderTagChips();
    updateTagsInputValue();
    tagsSuggestions.classList.add('hidden');
  }

  function removeLastTag() {
    if (tagsInput.value === '' && currentTags.length > 0) {
      currentTags.pop();
      renderTagChips();
    }
  }

  function showTagSuggestions(query) {
    if (!query.trim()) {
      tagsSuggestions.classList.add('hidden');
      return;
    }

    const q = query.trim().toLowerCase();
    const matches = existingTags.filter(t =>
      t.includes(q) && !currentTags.includes(t)
    ).slice(0, 6);

    if (matches.length === 0) {
      tagsSuggestions.classList.add('hidden');
      return;
    }

    tagsSuggestions.innerHTML = matches.map(t =>
      `<div class="suggestion-item">${escapeHtml(t)}</div>`
    ).join('');
    tagsSuggestions.classList.remove('hidden');

    tagsSuggestions.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', () => {
        addTag(item.textContent);
        tagsInput.focus();
      });
    });
  }

  // ── Collection Management ─────────────────────────────────
  function showNewCollectionForm() {
    newCollectionForm.classList.remove('hidden');
    newCollectionName.value = '';
    newCollectionName.focus();
  }

  function hideNewCollectionForm() {
    newCollectionForm.classList.add('hidden');
  }

  async function createCollection() {
    const name = newCollectionName.value.trim();
    if (!name) return;

    const collection = await CleanNewsStorage.createCollection(name, '', newCollectionColor);
    allCollections.push(collection);
    renderCollectionsDropdown();
    collectionSelect.value = collection.id;
    selectedCollectionId = collection.id;
    hideNewCollectionForm();
    showToast('Colección creada');
  }

  // ── Save Article ──────────────────────────────────────────
  async function handleSave() {
    if (!currentData) return;

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px"></div> Guardando...';

    const articleData = {
      title: currentData.title,
      author: currentData.author,
      source: currentData.source,
      sourceUrl: currentData.sourceUrl,
      contentHtml: currentData.contentHtml || '',
      contentText: currentData.contentText || currentData.content || '',
      excerpt: currentData.excerpt,
      featuredImage: currentData.featuredImage || '',
      publishedAt: currentData.publishedAt,
      wordCount: currentData.wordCount,
      readTime: currentData.readTime,
      tags: currentTags,
      collectionIds: selectedCollectionId ? [selectedCollectionId] : []
    };

    const result = await CleanNewsStorage.saveArticle(articleData);

    if (result.success) {
      showToast('Artículo guardado correctamente');
      saveBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Guardado';
      saveBtn.style.background = '#065f46';
      setTimeout(() => { window.close(); }, 1000);
    } else {
      showToast(result.error || 'Error al guardar');
      resetSaveBtn();
    }
  }

  function resetSaveBtn() {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Guardar';
    saveBtn.style.background = '';
  }

  // ── Event Binding ─────────────────────────────────────────
  function bindEvents() {
    retryBtn.addEventListener('click', extractContent);
    saveBtn.addEventListener('click', handleSave);
    discardBtn.addEventListener('click', () => { window.close(); });
    themeToggle.addEventListener('click', toggleTheme);

    // Tags input
    tagsInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const val = tagsInput.value.replace(/,/g, '').trim();
        if (val) addTag(val);
        tagsInput.value = '';
      } else if (e.key === 'Backspace') {
        removeLastTag();
      } else if (e.key === 'Escape') {
        tagsSuggestions.classList.add('hidden');
      }
    });

    tagsInput.addEventListener('input', () => {
      showTagSuggestions(tagsInput.value);
    });

    tagsInput.addEventListener('blur', () => {
      // Small delay to allow click on suggestion
      setTimeout(() => { tagsSuggestions.classList.add('hidden'); }, 200);
    });

    // Collection select
    collectionSelect.addEventListener('change', () => {
      selectedCollectionId = collectionSelect.value;
    });

    // New collection
    newCollectionBtn.addEventListener('click', showNewCollectionForm);
    saveCollectionBtn.addEventListener('click', createCollection);
    cancelCollectionBtn.addEventListener('click', hideNewCollectionForm);

    newCollectionName.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') createCollection();
      if (e.key === 'Escape') hideNewCollectionForm();
    });

    // Color dots
    document.querySelectorAll('.color-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        newCollectionColor = dot.dataset.color;
      });
    });

    // Footer links
    libraryLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: chrome.runtime.getURL('library/library.html') });
      window.close();
    });

    sidepanelLink.addEventListener('click', (e) => {
      e.preventDefault();
      // Open sidepanel via chrome API or fall back to tab
      if (chrome.sidePanel && chrome.sidePanel.open) {
        chrome.sidePanel.open({ tabId: (await chrome.tabs.query({ active: true, currentWindow: true }))[0].id }).catch(() => {
          chrome.tabs.create({ url: chrome.runtime.getURL('library/library.html') });
        });
      } else {
        chrome.tabs.create({ url: chrome.runtime.getURL('library/library.html') });
      }
      window.close();
    });
  }

  // ── State Management ──────────────────────────────────────
  function hideAll() {
    loadingState.classList.add('hidden');
    errorState.classList.add('hidden');
    savedState.classList.add('hidden');
    contentState.classList.add('hidden');
  }

  function showState(state) {
    hideAll();
    switch (state) {
      case 'loading':
        loadingState.classList.remove('hidden');
        break;
      case 'error':
        errorState.classList.remove('hidden');
        break;
      case 'content':
        contentState.classList.remove('hidden');
        break;
    }
  }

  function showError(message) {
    errorMessage.textContent = message;
    showState('error');
  }

  // ── Toast ─────────────────────────────────────────────────
  function showToast(message) {
    toastMessage.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => { toast.classList.add('hidden'); }, 2500);
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

  // ── Boot ──────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);
})();
