// CleanNews Vault v2.0 - Reader Logic
// Full article reader with reading progress, edit mode, and export

(async function() {
  'use strict';

  // ── State ─────────────────────────────────────────────────
  let articleId = null;
  let currentArticle = null;
  let allCollections = [];
  let readProgressSaveTimeout = null;
  const FONT_SIZES = [16, 18, 20];
  let currentFontIndex = 1; // 18px default

  // ── DOM Elements ──────────────────────────────────────────
  const readingProgressFill = document.getElementById('reading-progress-fill');
  const backBtn = document.getElementById('back-btn');
  const topbarTitle = document.getElementById('topbar-title');
  const favoriteBtn = document.getElementById('favorite-btn');
  const readStatusBtn = document.getElementById('read-status-btn');
  const collectionBtn = document.getElementById('collection-btn');
  const collectionMenu = document.getElementById('collection-menu');
  const collectionMenuItems = document.getElementById('collection-menu-items');
  const editBtn = document.getElementById('edit-btn');
  const exportBtn = document.getElementById('export-btn');
  const exportMenu = document.getElementById('export-menu');
  const deleteBtn = document.getElementById('delete-btn');
  const fontDecrease = document.getElementById('font-decrease');
  const fontNormal = document.getElementById('font-normal');
  const fontIncrease = document.getElementById('font-increase');
  const themeToggle = document.getElementById('theme-toggle');

  const viewMode = document.getElementById('view-mode');
  const editMode = document.getElementById('edit-mode');
  const featuredImageContainer = document.getElementById('featured-image-container');
  const featuredImage = document.getElementById('featured-image');
  const articleTitle = document.getElementById('article-title');
  const articleAuthor = document.getElementById('article-author');
  const articleSource = document.getElementById('article-source');
  const sourceLink = document.getElementById('source-link');
  const articleDate = document.getElementById('article-date');
  const articleStats = document.getElementById('article-stats');
  const articleTags = document.getElementById('article-tags');
  const articleCollections = document.getElementById('article-collections');
  const articleContent = document.getElementById('article-content');
  const articleNotesSection = document.getElementById('article-notes-section');
  const articleNotes = document.getElementById('article-notes');
  const sourceLinkSection = document.getElementById('article-source-link');
  const sourceUrl = document.getElementById('source-url');

  const editTitle = document.getElementById('edit-title');
  const editTags = document.getElementById('edit-tags');
  const editCollection = document.getElementById('edit-collection');
  const editNotes = document.getElementById('edit-notes');
  const editContent = document.getElementById('edit-content');
  const saveEdit = document.getElementById('save-edit');
  const cancelEdit = document.getElementById('cancel-edit');

  const deleteModal = document.getElementById('delete-modal');
  const confirmDelete = document.getElementById('confirm-delete');
  const cancelDelete = document.getElementById('cancel-delete');

  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');

  // ── Init ──────────────────────────────────────────────────
  async function init() {
    try {
      await CleanNewsDB.init();
      await CleanNewsStorage.migrateFromLegacy();
      await loadTheme();
      await loadFontSize();

      // Get article ID from URL
      const params = new URLSearchParams(window.location.search);
      articleId = params.get('id');

      if (!articleId) {
        showError();
        return;
      }

      allCollections = await CleanNewsStorage.getCollections();
      await loadArticle();
      bindEvents();
    } catch (err) {
      console.error('[CleanNews Reader] Init error:', err);
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

  // ── Font Size ─────────────────────────────────────────────
  async function loadFontSize() {
    try {
      const setting = await CleanNewsDB.get('settings', 'fontSize');
      if (setting && setting.value) {
        const idx = FONT_SIZES.indexOf(setting.value);
        if (idx >= 0) currentFontIndex = idx;
      }
    } catch (e) { /* ignore */ }
    applyFontSize();
  }

  function applyFontSize() {
    document.documentElement.style.setProperty('--reader-font-size', FONT_SIZES[currentFontIndex] + 'px');
    document.querySelectorAll('.font-size-controls .btn-xs').forEach((btn, i) => {
      btn.classList.toggle('active', i === currentFontIndex);
    });
  }

  async function setFontSize(index) {
    currentFontIndex = Math.max(0, Math.min(FONT_SIZES.length - 1, index));
    applyFontSize();
    try {
      await CleanNewsDB.put('settings', { key: 'fontSize', value: FONT_SIZES[currentFontIndex] });
    } catch (e) { /* ignore */ }
  }

  // ── Load Article ──────────────────────────────────────────
  async function loadArticle() {
    const article = await CleanNewsStorage.getArticle(articleId);
    if (!article) {
      showError();
      return;
    }
    currentArticle = article;
    document.title = (article.title || 'Artículo') + ' - CleanNews Vault';
    renderArticle(article);
  }

  // ── Render ────────────────────────────────────────────────
  function renderArticle(article) {
    // Topbar title
    topbarTitle.textContent = article.title || 'Artículo';

    // Featured image
    if (article.featuredImage) {
      featuredImageContainer.classList.remove('hidden');
      featuredImage.src = article.featuredImage;
      featuredImage.alt = article.title || '';
      featuredImage.onerror = () => { featuredImageContainer.classList.add('hidden'); };
    } else {
      featuredImageContainer.classList.add('hidden');
    }

    // Title
    articleTitle.textContent = article.title || 'Sin título';

    // Author
    if (article.author) {
      articleAuthor.classList.remove('hidden');
      articleAuthor.querySelector('span').textContent = article.author;
    } else {
      articleAuthor.classList.add('hidden');
    }

    // Source
    if (article.source) {
      articleSource.classList.remove('hidden');
      sourceLink.textContent = article.source;
      sourceLink.href = article.sourceUrl || '#';
    } else {
      articleSource.classList.add('hidden');
    }

    // Date
    if (article.publishedAt) {
      articleDate.classList.remove('hidden');
      articleDate.querySelector('span').textContent = article.publishedAt;
    } else {
      articleDate.classList.add('hidden');
    }

    // Stats
    const statsParts = [];
    if (article.wordCount) statsParts.push(article.wordCount.toLocaleString('es-ES') + ' palabras');
    if (article.readTime) statsParts.push('~' + article.readTime + ' min lectura');
    const progress = article.readProgress || 0;
    if (progress > 0) statsParts.push(progress + '% leído');
    articleStats.textContent = statsParts.join(' · ');

    // Tags
    if (article.tags && article.tags.length > 0) {
      articleTags.classList.remove('hidden');
      articleTags.innerHTML = article.tags.map(t => `<span class="tag-badge">${escapeHtml(t)}</span>`).join('');
    } else {
      articleTags.classList.add('hidden');
    }

    // Collection badges
    if (article.collectionIds && article.collectionIds.length > 0) {
      const cols = allCollections.filter(c => article.collectionIds.includes(c.id));
      if (cols.length > 0) {
        articleCollections.classList.remove('hidden');
        articleCollections.innerHTML = cols.map(c => `
          <span class="collection-badge" style="background:${c.color}15;color:${c.color}">
            <span class="collection-badge-dot" style="background:${c.color}"></span>
            ${escapeHtml(c.name)}
          </span>`).join('');
      } else {
        articleCollections.classList.add('hidden');
      }
    } else {
      articleCollections.classList.add('hidden');
    }

    // Content
    if (article.contentHtml) {
      articleContent.innerHTML = sanitizeHtml(article.contentHtml);
    } else {
      articleContent.innerHTML = renderTextContent(article.contentText || article.content || article.excerpt || '');
    }

    // Notes
    if (article.notes && article.notes.trim()) {
      articleNotesSection.classList.remove('hidden');
      articleNotes.textContent = article.notes;
    } else {
      articleNotesSection.classList.add('hidden');
    }

    // Source link
    if (article.sourceUrl) {
      sourceLinkSection.classList.remove('hidden');
      sourceUrl.href = article.sourceUrl;
    } else {
      sourceLinkSection.classList.add('hidden');
    }

    // Favorite state
    updateFavoriteButton(article.favorite);

    // Read status
    updateReadStatusButton(progress >= 100);
  }

  // ── HTML Sanitization ─────────────────────────────────────
  function sanitizeHtml(html) {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Remove dangerous elements
    const dangerousTags = ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button', 'style', 'link'];
    dangerousTags.forEach(tag => {
      temp.querySelectorAll(tag).forEach(el => el.remove());
    });

    // Remove dangerous attributes from all elements
    const dangerousAttrs = ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur', 'onsubmit', 'onkeydown', 'onkeyup', 'onkeypress', 'onchange', 'oninput'];
    temp.querySelectorAll('*').forEach(el => {
      dangerousAttrs.forEach(attr => el.removeAttribute(attr));
    });

    // Remove all style attributes that could contain javascript:
    temp.querySelectorAll('[style]').forEach(el => {
      const style = el.getAttribute('style');
      if (style && /javascript:|expression\(|url\(.*javascript/i.test(style)) {
        el.removeAttribute('style');
      }
    });

    return temp.innerHTML;
  }

  function renderTextContent(text) {
    if (!text || text.trim().length === 0) {
      return '<p style="color:var(--text-muted);font-style:italic;">No hay contenido disponible.</p>';
    }

    const blocks = text.split(/\n\n+/);
    let html = '';

    blocks.forEach(block => {
      block = block.trim();
      if (!block) return;

      // Heading detection
      const headingMatch = block.match(/^(#{1,4})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        html += `<h${level}>${escapeHtml(headingMatch[2].trim())}</h${level}>`;
        return;
      }

      // Short lines as headings
      if (block.length < 80 && !block.includes('.') && !block.includes(',')) {
        html += `<h3>${escapeHtml(block)}</h3>`;
        return;
      }

      html += `<p>${escapeHtml(block)}</p>`;
    });

    return html || `<p>${escapeHtml(text)}</p>`;
  }

  // ── Reading Progress ──────────────────────────────────────
  function updateScrollProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? Math.min(100, Math.round((scrollTop / docHeight) * 100)) : 0;
    readingProgressFill.style.width = progress + '%';

    // Auto-save read progress periodically
    if (articleId && progress > 0) {
      clearTimeout(readProgressSaveTimeout);
      readProgressSaveTimeout = setTimeout(() => {
        saveReadProgress(progress);
      }, 2000);
    }
  }

  async function saveReadProgress(progress) {
    if (!articleId) return;

    await CleanNewsStorage.updateReadProgress(articleId, progress);

    // Auto-mark as read at 90%+
    if (progress >= 90) {
      await CleanNewsStorage.markAsRead(articleId);
    }
  }

  // ── Favorite ──────────────────────────────────────────────
  function updateFavoriteButton(isFavorite) {
    if (isFavorite) {
      favoriteBtn.classList.add('active');
      favoriteBtn.querySelector('svg').style.fill = 'var(--warning)';
      favoriteBtn.querySelector('svg').style.color = 'var(--warning)';
    } else {
      favoriteBtn.classList.remove('active');
      favoriteBtn.querySelector('svg').style.fill = 'none';
      favoriteBtn.querySelector('svg').style.color = '';
    }
  }

  async function toggleFavorite() {
    if (!currentArticle) return;
    const result = await CleanNewsStorage.toggleFavorite(articleId);
    if (result.success) {
      updateFavoriteButton(result.favorite);
      showToast(result.favorite ? 'Marcado como favorito' : 'Favorito eliminado');
    }
  }

  // ── Read Status ───────────────────────────────────────────
  function updateReadStatusButton(isRead) {
    readStatusBtn.classList.toggle('active', isRead);
    readStatusBtn.querySelector('svg').setAttribute('fill', isRead ? 'currentColor' : 'none');
    readStatusBtn.title = isRead ? 'Marcar como no leído' : 'Marcar como leído';
  }

  async function toggleReadStatus() {
    if (!currentArticle) return;
    const isRead = currentArticle.readProgress >= 100;
    if (isRead) {
      await CleanNewsStorage.markAsUnread(articleId);
      currentArticle.readProgress = 0;
      showToast('Marcado como no leído');
    } else {
      await CleanNewsStorage.markAsRead(articleId);
      currentArticle.readProgress = 100;
      showToast('Marcado como leído');
    }
    updateReadStatusButton(!isRead);
  }

  // ── Collections Dropdown ─────────────────────────────────
  function renderCollectionMenu() {
    if (!currentArticle) return;
    const articleColIds = currentArticle.collectionIds || [];

    let html = '';
    allCollections.forEach(col => {
      const isIn = articleColIds.includes(col.id);
      html += `
        <button class="collection-menu-item ${isIn ? 'in-collection' : ''}" data-col-id="${escapeAttr(col.id)}">
          <span class="collection-badge-dot" style="background:${escapeAttr(col.color)}"></span>
          ${escapeHtml(col.name)}
          ${isIn ? '<span class="check-icon">✓</span>' : ''}
        </button>`;
    });

    collectionMenuItems.innerHTML = html;

    collectionMenuItems.querySelectorAll('.collection-menu-item').forEach(item => {
      item.addEventListener('click', async () => {
        const colId = item.dataset.colId;
        const isIn = (currentArticle.collectionIds || []).includes(colId);
        if (isIn) {
          await CleanNewsStorage.removeArticleFromCollection(articleId, colId);
        } else {
          await CleanNewsStorage.addArticleToCollection(articleId, colId);
        }
        currentArticle = await CleanNewsStorage.getArticle(articleId);
        renderArticle(currentArticle);
        renderCollectionMenu();
        showToast(isIn ? 'Eliminado de colección' : 'Añadido a colección');
        collectionMenu.classList.add('hidden');
      });
    });
  }

  // ── Edit Mode ────────────────────────────────────────────
  function enterEditMode() {
    if (!currentArticle) return;

    // Populate collection select
    let colHtml = '<option value="">Sin colección</option>';
    allCollections.forEach(col => {
      const selected = (currentArticle.collectionIds || []).includes(col.id) ? 'selected' : '';
      colHtml += `<option value="${escapeAttr(col.id)}" ${selected}>${escapeHtml(col.name)}</option>`;
    });
    editCollection.innerHTML = colHtml;

    viewMode.classList.add('hidden');
    editMode.classList.remove('hidden');
    editBtn.querySelector('svg').style.display = 'none';
    if (editBtn.querySelector('span')) editBtn.querySelector('span').textContent = 'Editando...';

    editTitle.value = currentArticle.title || '';
    editTags.value = (currentArticle.tags || []).join(', ');
    editNotes.value = currentArticle.notes || '';
    editContent.value = currentArticle.contentText || currentArticle.content || '';
  }

  function exitEditMode() {
    editMode.classList.add('hidden');
    viewMode.classList.remove('hidden');
    editBtn.querySelector('svg').style.display = '';
    if (editBtn.querySelector('span')) editBtn.querySelector('span').textContent = 'Editar';
  }

  async function saveEdits() {
    if (!currentArticle) return;

    const tags = editTags.value.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
    const collectionId = editCollection.value;
    const collectionIds = collectionId ? [collectionId] : [];

    const updates = {
      title: editTitle.value.trim(),
      tags,
      notes: editNotes.value.trim(),
      contentText: editContent.value,
      collectionIds
    };

    const result = await CleanNewsStorage.updateArticle(articleId, updates);
    if (result.success) {
      currentArticle = { ...currentArticle, ...updates };
      renderArticle(currentArticle);
      exitEditMode();
      showToast('Cambios guardados');
    }
  }

  // ── Export ────────────────────────────────────────────────
  function exportArticle(format) {
    if (!currentArticle) return;
    switch (format) {
      case 'txt':
        CleanNewsExport.exportAsTxt(currentArticle);
        showToast('Exportado como TXT');
        break;
      case 'md':
        CleanNewsExport.exportAsMarkdown(currentArticle);
        showToast('Exportado como Markdown');
        break;
      case 'json':
        CleanNewsExport.exportAsJson(currentArticle);
        showToast('Exportado como JSON');
        break;
      case 'pdf':
        CleanNewsExport.exportAsPdf(currentArticle);
        showToast('Abriendo vista de impresión');
        break;
    }
  }

  // ── Delete ───────────────────────────────────────────────
  async function deleteArticle() {
    if (!articleId) return;
    const result = await CleanNewsStorage.deleteArticle(articleId);
    if (result.success) {
      deleteModal.classList.add('hidden');
      showToast('Artículo eliminado');
      setTimeout(() => {
        chrome.tabs.create({ url: chrome.runtime.getURL('library/library.html') });
        window.close();
      }, 800);
    }
  }

  // ── Error State ──────────────────────────────────────────
  function showError() {
    document.querySelector('.reader-article').innerHTML =
      `<div style="text-align:center;padding:80px 24px;color:var(--text-muted);">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:16px;color:var(--border);">
          <circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        <h3 style="font-size:18px;color:var(--text-secondary);margin-bottom:8px;">Artículo no encontrado</h3>
        <p style="font-size:13px;margin-bottom:20px;">El artículo solicitado no existe o fue eliminado.</p>
        <a href="${chrome.runtime.getURL('library/library.html')}" style="color:var(--primary);font-weight:600;text-decoration:none;">Volver a la biblioteca</a>
      </div>`;
  }

  // ── Event Binding ─────────────────────────────────────────
  function bindEvents() {
    // Scroll progress
    window.addEventListener('scroll', updateScrollProgress, { passive: true });

    // Back
    backBtn.addEventListener('click', () => {
      if (document.referrer && document.referrer.includes('library.html')) {
        history.back();
      } else {
        chrome.tabs.create({ url: chrome.runtime.getURL('library/library.html') });
        window.close();
      }
    });

    // Favorite
    favoriteBtn.addEventListener('click', toggleFavorite);

    // Read status
    readStatusBtn.addEventListener('click', toggleReadStatus);

    // Edit
    editBtn.addEventListener('click', enterEditMode);
    saveEdit.addEventListener('click', saveEdits);
    cancelEdit.addEventListener('click', exitEditMode);

    // Collection dropdown
    collectionBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      exportMenu.classList.add('hidden');
      renderCollectionMenu();
      collectionMenu.classList.toggle('hidden');
    });

    // Export dropdown
    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      collectionMenu.classList.add('hidden');
      exportMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.collection-dropdown')) collectionMenu.classList.add('hidden');
      if (!e.target.closest('.export-dropdown')) exportMenu.classList.add('hidden');
    });

    exportMenu.querySelectorAll('.export-option').forEach(btn => {
      btn.addEventListener('click', () => {
        exportArticle(btn.dataset.format);
        exportMenu.classList.add('hidden');
      });
    });

    // Delete
    deleteBtn.addEventListener('click', () => { deleteModal.classList.remove('hidden'); });
    confirmDelete.addEventListener('click', deleteArticle);
    cancelDelete.addEventListener('click', () => { deleteModal.classList.add('hidden'); });
    deleteModal.querySelector('.modal-backdrop').addEventListener('click', () => { deleteModal.classList.add('hidden'); });

    // Font size
    fontDecrease.addEventListener('click', () => setFontSize(currentFontIndex - 1));
    fontNormal.addEventListener('click', () => setFontSize(1));
    fontIncrease.addEventListener('click', () => setFontSize(currentFontIndex + 1));

    // Theme
    themeToggle.addEventListener('click', toggleTheme);

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!editMode.classList.contains('hidden')) exitEditMode();
        deleteModal.classList.add('hidden');
        collectionMenu.classList.add('hidden');
        exportMenu.classList.add('hidden');
      }
    });
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
