// CleanNews Vault v5.0 - Reader Logic
// Full article reader with reading progress, edit mode, export,
// TOC sidebar, highlights & annotations, share, pomodoro, focus mode.

(async function() {
  'use strict';

  // ── State ─────────────────────────────────────────────────
  let articleId = null;
  let currentArticle = null;
  let allCollections = [];
  let readProgressSaveTimeout = null;
  const FONT_SIZES = [16, 18, 20];
  let currentFontIndex = 1; // 18px default

  // New v5.0 state
  let highlights = [];
  let isHighlightMode = false;
  let isFocusMode = false;
  let isTocVisible = false;
  let isAnnotationsVisible = false;
  let isPomodoroVisible = false;
  let pomodoroInterval = null;
  let tocData = [];
  let pendingHighlightColor = null;
  let pendingHighlightRange = null;
  let pendingHighlightNoteId = null;

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

  // New buttons
  const highlightBtn = document.getElementById('highlight-btn');
  const shareBtn = document.getElementById('share-btn');
  const shareMenu = document.getElementById('share-menu');
  const pomodoroBtn = document.getElementById('pomodoro-btn');
  const focusBtn = document.getElementById('focus-btn');
  const annotationsBtn = document.getElementById('annotations-btn');

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

  // New DOM elements
  const readerMain = document.getElementById('reader-main');
  const tocToggle = document.getElementById('toc-toggle');
  const tocSidebar = document.getElementById('toc-sidebar');
  const tocList = document.getElementById('toc-list');
  const highlightToolbar = document.getElementById('highlight-toolbar');
  const highlightNoteBtn = document.getElementById('highlight-note-btn');
  const highlightNotePopup = document.getElementById('highlight-note-popup');
  const highlightNoteInput = document.getElementById('highlight-note-input');
  const highlightNoteSave = document.getElementById('highlight-note-save');
  const highlightNoteCancel = document.getElementById('highlight-note-cancel');
  const annotationsPanel = document.getElementById('annotations-panel');
  const annotationsClose = document.getElementById('annotations-close');
  const annotationsList = document.getElementById('annotations-list');
  const pomodoroWidget = document.getElementById('pomodoro-widget');
  const pomodoroTimer = document.getElementById('pomodoro-timer');
  const pomodoroModeLabel = document.getElementById('pomodoro-mode-label');
  const pomodoroCompleted = document.getElementById('pomodoro-completed');
  const pomodoroPlay = document.getElementById('pomodoro-play');
  const pomodoroReset = document.getElementById('pomodoro-reset');
  const pomodoroClose = document.getElementById('pomodoro-close');

  // ── Init ──────────────────────────────────────────────────
  async function init() {
    try {
      await CleanNewsDB.init();
      await CleanNewsStorage.migrateFromLegacy();
      await CleanNewsHighlights.ensureStore();
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

  const applyFontSize = () => {
    document.documentElement.style.setProperty('--reader-font-size', FONT_SIZES[currentFontIndex] + 'px');
    document.querySelectorAll('.font-size-controls .btn-xs').forEach((btn, i) => {
      btn.classList.toggle('active', i === currentFontIndex);
    });
  };

  const setFontSize = async (index) => {
    currentFontIndex = Math.max(0, Math.min(FONT_SIZES.length - 1, index));
    applyFontSize();
    try {
      await CleanNewsDB.put('settings', { key: 'fontSize', value: FONT_SIZES[currentFontIndex] });
    } catch (e) { /* ignore */ }
  };

  // ── Load Article ──────────────────────────────────────────
  const loadArticle = async () => {
    const article = await CleanNewsStorage.getArticle(articleId);
    if (!article) {
      showError();
      return;
    }
    currentArticle = article;
    document.title = (article.title || 'Artículo') + ' - CleanNews Vault';
    renderArticle(article);
    // Build TOC after content is rendered
    await loadHighlights();
    buildTOC();
  };

  // ── Render ────────────────────────────────────────────────
  const renderArticle = (article) => {
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

    // Content — with empty-content fallback
    var hasContent = false;
    if (article.contentHtml && article.contentHtml.trim().length > 0) {
      articleContent.innerHTML = sanitizeHtml(article.contentHtml);
      hasContent = true;
    } else if (article.contentText && article.contentText.trim().length > 0) {
      articleContent.innerHTML = renderTextContent(article.contentText);
      hasContent = true;
    } else if (article.content && article.content.trim().length > 0) {
      articleContent.innerHTML = renderTextContent(article.content);
      hasContent = true;
    } else if (article.excerpt && article.excerpt.trim().length > 0) {
      articleContent.innerHTML = renderTextContent(article.excerpt);
      hasContent = true;
    }

    if (!hasContent) {
      // No content was extracted — show helpful fallback with source link
      var emptyHtml = '<div class="cnv-empty-content">';
      emptyHtml += '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="display:block;margin:0 auto 12px;color:var(--text-muted);"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>';
      emptyHtml += '<p style="text-align:center;color:var(--text-muted);font-size:14px;">No se pudo extraer el contenido del art\u00edculo.</p>';
      if (article.sourceUrl) {
        emptyHtml += '<p style="text-align:center;margin-top:12px;"><a href="' + escapeHtml(article.sourceUrl) + '" target="_blank" rel="noopener noreferrer" style="color:var(--primary);font-weight:600;text-decoration:none;">\ud83d\udd17 Leer en la fuente original</a></p>';
      }
      emptyHtml += '</div>';
      articleContent.innerHTML = emptyHtml;
      console.warn('[CleanNews Reader] Article has no content:', article.id, article.title);
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
  };

  // ── HTML Sanitization ─────────────────────────────────────
  const sanitizeHtml = (html) => {
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
  };

  const renderTextContent = (text) => {
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
  };

  // ── Reading Progress ──────────────────────────────────────
  const updateScrollProgress = () => {
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
  };

  const saveReadProgress = async (progress) => {
    if (!articleId) return;

    await CleanNewsStorage.updateReadProgress(articleId, progress);

    // Auto-mark as read at 90%+
    if (progress >= 90) {
      await CleanNewsStorage.markAsRead(articleId);
    }
  };

  // ── Favorite ──────────────────────────────────────────────
  const updateFavoriteButton = (isFavorite) => {
    if (isFavorite) {
      favoriteBtn.classList.add('active');
      favoriteBtn.querySelector('svg').style.fill = 'var(--warning)';
      favoriteBtn.querySelector('svg').style.color = 'var(--warning)';
    } else {
      favoriteBtn.classList.remove('active');
      favoriteBtn.querySelector('svg').style.fill = 'none';
      favoriteBtn.querySelector('svg').style.color = '';
    }
  };

  const toggleFavorite = async () => {
    if (!currentArticle) return;
    const result = await CleanNewsStorage.toggleFavorite(articleId);
    if (result.success) {
      updateFavoriteButton(result.favorite);
      showToast(result.favorite ? 'Marcado como favorito' : 'Favorito eliminado');
    }
  };

  // ── Read Status ───────────────────────────────────────────
  const updateReadStatusButton = (isRead) => {
    readStatusBtn.classList.toggle('active', isRead);
    readStatusBtn.querySelector('svg').setAttribute('fill', isRead ? 'currentColor' : 'none');
    readStatusBtn.title = isRead ? 'Marcar como no leído' : 'Marcar como leído';
  };

  const toggleReadStatus = async () => {
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
  };

  // ── Collections Dropdown ─────────────────────────────────
  const renderCollectionMenu = () => {
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
  };

  // ── Edit Mode ────────────────────────────────────────────
  const enterEditMode = () => {
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
  };

  const exitEditMode = () => {
    editMode.classList.add('hidden');
    viewMode.classList.remove('hidden');
    editBtn.querySelector('svg').style.display = '';
    if (editBtn.querySelector('span')) editBtn.querySelector('span').textContent = 'Editar';
  };

  const saveEdits = async () => {
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
  };

  // ── Export ────────────────────────────────────────────────
  const exportArticle = (format) => {
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
  };

  // ── Delete ───────────────────────────────────────────────
  const deleteArticle = async () => {
    if (!articleId) return;
    // Also remove highlights for this article
    await CleanNewsHighlights.removeAllForArticle(articleId);
    const result = await CleanNewsStorage.deleteArticle(articleId);
    if (result.success) {
      deleteModal.classList.add('hidden');
      showToast('Artículo eliminado');
      setTimeout(() => {
        chrome.tabs.create({ url: chrome.runtime.getURL('library/library.html') });
        window.close();
      }, 800);
    }
  };

  // ── Error State ──────────────────────────────────────────
  const showError = () => {
    document.querySelector('.reader-article').innerHTML =
      `<div style="text-align:center;padding:80px 24px;color:var(--text-muted);">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:16px;color:var(--border);">
          <circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        <h3 style="font-size:18px;color:var(--text-secondary);margin-bottom:8px;">Artículo no encontrado</h3>
        <p style="font-size:13px;margin-bottom:20px;">El artículo solicitado no existe o fue eliminado.</p>
        <a href="${chrome.runtime.getURL('library/library.html')}" style="color:var(--primary);font-weight:600;text-decoration:none;">Volver a la biblioteca</a>
      </div>`;
  };

  // ═══════════════════════════════════════════════════════════
  // TOC SYSTEM
  // ═══════════════════════════════════════════════════════════

  const buildTOC = () => {
    const headings = articleContent.querySelectorAll('h2, h3');
    if (headings.length === 0) {
      tocData = [];
      tocList.innerHTML = '';
      tocToggle.classList.remove('visible');
      return;
    }

    // Generate IDs for headings that lack them
    tocData = [];
    headings.forEach((el, i) => {
      if (!el.id) {
        el.id = 'heading-' + i;
      }
      tocData.push({
        id: el.id,
        level: el.tagName.toLowerCase(), // 'h2' or 'h3'
        text: el.textContent.trim(),
        element: el
      });
    });

    renderTOC(tocData);
    setupScrollSpy();
    tocToggle.classList.add('visible');
  };

  const renderTOC = (data) => {
    let html = '';
    data.forEach(item => {
      const cls = item.level === 'h3' ? 'toc-item toc-h3' : 'toc-item';
      html += `<a class="${cls}" data-toc-id="${escapeAttr(item.id)}" href="#${escapeAttr(item.id)}">${escapeHtml(item.text)}</a>`;
    });
    tocList.innerHTML = html;

    // Click handlers
    tocList.querySelectorAll('.toc-item').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.getElementById(link.dataset.tocId);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  };

  const setupScrollSpy = () => {
    // Updated via the scroll event handler
  };

  const updateScrollSpy = () => {
    if (tocData.length === 0) return;

    let activeItem = null;
    const scrollTop = window.scrollY;
    const offset = 80; // topbar + margin

    for (let i = tocData.length - 1; i >= 0; i--) {
      const el = tocData[i].element;
      if (el && el.offsetTop - offset <= scrollTop) {
        activeItem = tocData[i];
        break;
      }
    }

    tocList.querySelectorAll('.toc-item').forEach(link => {
      link.classList.toggle('active', activeItem && link.dataset.tocId === activeItem.id);
    });
  };

  const toggleTOC = () => {
    isTocVisible = !isTocVisible;
    tocSidebar.classList.toggle('visible', isTocVisible);
    readerMain.classList.toggle('toc-visible', isTocVisible);
  };

  // ═══════════════════════════════════════════════════════════
  // HIGHLIGHT SYSTEM
  // ═══════════════════════════════════════════════════════════

  const loadHighlights = async () => {
    if (!articleId) return;
    try {
      highlights = await CleanNewsHighlights.getForArticle(articleId);
    } catch (err) {
      console.error('[CleanNews Reader] loadHighlights error:', err);
      highlights = [];
    }
    // Re-apply marks to the DOM
    applyHighlightsToDOM();
  };

  const applyHighlightsToDOM = () => {
    if (highlights.length === 0) return;
    const contentText = articleContent.textContent;

    highlights.forEach(h => {
      // Find and wrap the highlighted text in the article content
      wrapTextInHighlight(h);
    });

    // Add click handlers for existing highlights
    articleContent.querySelectorAll('.cnv-highlight').forEach(mark => {
      mark.addEventListener('click', () => {
        const hlId = mark.dataset.highlightId;
        if (hlId) {
          scrollToHighlight(hlId);
        }
      });
    });
  };

  const wrapTextInHighlight = (highlight) => {
    // Skip if already applied
    if (articleContent.querySelector(`[data-highlight-id="${highlight.id}"]`)) return;

    const text = highlight.text;
    if (!text || text.length < 2) return;

    // Walk text nodes and find the matching text
    const walker = document.createTreeWalker(
      articleContent,
      NodeFilter.SHOW_TEXT,
      null
    );

    const textNodes = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    for (const node of textNodes) {
      const nodeText = node.textContent;
      const idx = nodeText.indexOf(text);
      if (idx !== -1) {
        try {
          const range = document.createRange();
          range.setStart(node, idx);
          range.setEnd(node, idx + text.length);

          const mark = document.createElement('mark');
          mark.className = 'cnv-highlight';
          mark.dataset.highlightId = highlight.id;
          mark.dataset.color = highlight.color || 'yellow';

          range.surroundContents(mark);

          // Add note indicator if there's a note
          if (highlight.note) {
            const dot = document.createElement('span');
            dot.className = 'cnv-highlight-note-dot';
            dot.dataset.highlightId = highlight.id;
            mark.parentNode.insertBefore(dot, mark.nextSibling);
          }

          // Add click handler
          mark.addEventListener('click', () => scrollToHighlight(highlight.id));
          break;
        } catch (e) {
          // Range may cross element boundaries, skip
        }
      }
    }
  };

  const enableHighlightMode = () => {
    isHighlightMode = true;
    highlightBtn.classList.add('active');
    document.body.classList.add('highlight-mode');
    showToast('Modo resaltado activado — selecciona texto');
  };

  const disableHighlightMode = () => {
    isHighlightMode = false;
    highlightBtn.classList.remove('active');
    document.body.classList.remove('highlight-mode');
    hideHighlightToolbar();
  };

  const handleTextSelection = (e) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const text = selection.toString().trim();

    // Only show toolbar if selection is within article content
    if (!articleContent.contains(range.commonAncestorContainer)) return;
    if (text.length < 2) return;

    showHighlightToolbar(range, text);
  };

  const showHighlightToolbar = (range, text) => {
    pendingHighlightRange = range;
    pendingHighlightColor = null;

    // Position the toolbar above the selection
    const rect = range.getBoundingClientRect();
    const toolbarHeight = 44;
    let left = rect.left + (rect.width / 2) - 90;
    let top = rect.top - toolbarHeight - 8;

    // Keep within viewport
    left = Math.max(8, Math.min(left, window.innerWidth - 200));
    top = Math.max(8, top);

    highlightToolbar.style.left = left + 'px';
    highlightToolbar.style.top = top + 'px';
    highlightToolbar.classList.remove('hidden');

    // Reset color selection
    highlightToolbar.querySelectorAll('.highlight-color-btn').forEach(btn => {
      btn.classList.remove('selected');
    });
  };

  const hideHighlightToolbar = () => {
    highlightToolbar.classList.add('hidden');
    pendingHighlightRange = null;
    pendingHighlightColor = null;
  };

  const createHighlight = async (text, color, range) => {
    if (!articleId) return;

    try {
      const highlight = await CleanNewsHighlights.create({
        articleId,
        text,
        color: color || 'yellow',
        note: ''
      });

      // Wrap text in mark element
      const mark = document.createElement('mark');
      mark.className = 'cnv-highlight';
      mark.dataset.highlightId = highlight.id;
      mark.dataset.color = highlight.color;

      range.surroundContents(mark);

      // Add click handler
      mark.addEventListener('click', () => scrollToHighlight(highlight.id));

      // Store in local array
      highlights.push(highlight);

      // Clear selection
      window.getSelection().removeAllRanges();
      hideHighlightToolbar();

      showToast('Texto resaltado');
    } catch (err) {
      console.error('[CleanNews Reader] createHighlight error:', err);
      showToast('Error al resaltar texto');
    }
  };

  const removeHighlight = async (id) => {
    if (!id) return;

    // Remove from DOM
    const mark = articleContent.querySelector(`mark[data-highlight-id="${id}"]`);
    if (mark) {
      const parent = mark.parentNode;
      while (mark.firstChild) {
        parent.insertBefore(mark.firstChild, mark);
      }
      parent.removeChild(mark);
    }

    // Remove note dot
    const dot = articleContent.querySelector(`.cnv-highlight-note-dot[data-highlight-id="${id}"]`);
    if (dot) dot.remove();

    // Remove from DB
    try {
      await CleanNewsHighlights.remove(id);
    } catch (err) {
      console.error('[CleanNews Reader] removeHighlight error:', err);
    }

    // Remove from local array
    highlights = highlights.filter(h => h.id !== id);
    renderAnnotations();
    showToast('Resaltado eliminado');
  };

  const showAnnotationPopup = (highlightId, x, y) => {
    pendingHighlightNoteId = highlightId;

    // Load existing note if any
    const hl = highlights.find(h => h.id === highlightId);
    highlightNoteInput.value = hl && hl.note ? hl.note : '';

    // Position
    const popupWidth = 260;
    let left = x - popupWidth / 2;
    let top = y + 8;

    left = Math.max(8, Math.min(left, window.innerWidth - popupWidth - 8));
    top = Math.min(top, window.innerHeight - 200);

    highlightNotePopup.style.left = left + 'px';
    highlightNotePopup.style.top = top + 'px';
    highlightNotePopup.classList.remove('hidden');
    highlightNoteInput.focus();
  };

  const hideAnnotationPopup = () => {
    highlightNotePopup.classList.add('hidden');
    pendingHighlightNoteId = null;
  };

  const saveAnnotation = async () => {
    if (!pendingHighlightNoteId) return;
    const note = highlightNoteInput.value.trim();
    try {
      await CleanNewsHighlights.update(pendingHighlightNoteId, { note });

      // Update local array
      const hl = highlights.find(h => h.id === pendingHighlightNoteId);
      if (hl) hl.note = note;

      // Update DOM note indicator
      const mark = articleContent.querySelector(`mark[data-highlight-id="${pendingHighlightNoteId}"]`);
      if (mark) {
        // Remove existing note dot
        const existingDot = mark.parentNode.querySelector(`.cnv-highlight-note-dot[data-highlight-id="${pendingHighlightNoteId}"]`);
        if (existingDot) existingDot.remove();

        // Add note dot if there's a note
        if (note) {
          const dot = document.createElement('span');
          dot.className = 'cnv-highlight-note-dot';
          dot.dataset.highlightId = pendingHighlightNoteId;
          mark.parentNode.insertBefore(dot, mark.nextSibling);
        }
      }

      hideAnnotationPopup();
      renderAnnotations();
      showToast(note ? 'Nota guardada' : 'Nota eliminada');
    } catch (err) {
      console.error('[CleanNews Reader] saveAnnotation error:', err);
      showToast('Error al guardar nota');
    }
  };

  const scrollToHighlight = (highlightId) => {
    const mark = articleContent.querySelector(`mark[data-highlight-id="${highlightId}"]`);
    if (mark) {
      mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      mark.classList.add('cnv-highlight-flash');
      setTimeout(() => mark.classList.remove('cnv-highlight-flash'), 1000);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // ANNOTATIONS PANEL
  // ═══════════════════════════════════════════════════════════

  const openAnnotationsPanel = () => {
    isAnnotationsVisible = true;
    annotationsPanel.classList.add('visible');
    annotationsBtn.classList.add('active');
    renderAnnotations();
  };

  const closeAnnotationsPanel = () => {
    isAnnotationsVisible = false;
    annotationsPanel.classList.remove('visible');
    annotationsBtn.classList.remove('active');
  };

  const renderAnnotations = () => {
    if (highlights.length === 0) {
      annotationsList.innerHTML = `
        <div class="annotations-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--text-muted)"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          <p>No hay anotaciones aún</p>
          <p class="annotations-empty-hint">Selecciona texto y resáltalo para crear anotaciones</p>
        </div>`;
      return;
    }

    let html = '';
    highlights.forEach(h => {
      const colorMap = { yellow: '#fef08a', green: '#bbf7d0', red: '#fecaca', blue: '#bfdbfe' };
      const color = colorMap[h.color] || colorMap.yellow;
      const date = h.createdAt ? new Date(h.createdAt).toLocaleDateString('es-ES') : '';
      const preview = h.text.length > 80 ? h.text.substring(0, 80) + '...' : h.text;

      html += `
        <div class="annotation-item" data-highlight-id="${escapeAttr(h.id)}">
          <div class="annotation-item-header">
            <span class="annotation-color-dot" style="background:${color}"></span>
            ${date ? `<span class="annotation-date">${escapeHtml(date)}</span>` : ''}
            <button class="annotation-delete-btn" data-delete-id="${escapeAttr(h.id)}" title="Eliminar">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
          <div class="annotation-text">${escapeHtml(preview)}</div>
          ${h.note ? `<div class="annotation-note">${escapeHtml(h.note)}</div>` : ''}
        </div>`;
    });

    annotationsList.innerHTML = html;

    // Click handlers
    annotationsList.querySelectorAll('.annotation-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.annotation-delete-btn')) return;
        const hlId = item.dataset.highlightId;
        scrollToHighlight(hlId);
        // On mobile, close panel after navigating
        if (window.innerWidth <= 768) {
          closeAnnotationsPanel();
        }
      });
    });

    annotationsList.querySelectorAll('.annotation-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeHighlight(btn.dataset.deleteId);
      });
    });
  };

  // ═══════════════════════════════════════════════════════════
  // SHARE SYSTEM
  // ═══════════════════════════════════════════════════════════

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copiado al portapapeles');
    } catch (err) {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('Copiado al portapapeles');
    }
  };

  const shareLink = () => {
    if (currentArticle && currentArticle.sourceUrl) {
      copyToClipboard(currentArticle.sourceUrl);
    } else {
      showToast('No hay enlace disponible');
    }
    shareMenu.classList.add('hidden');
  };

  const shareContent = () => {
    if (currentArticle) {
      copyToClipboard(currentArticle.contentText || currentArticle.content || '');
    }
    shareMenu.classList.add('hidden');
  };

  const shareAsText = () => {
    if (currentArticle) {
      const text = (currentArticle.title || '') + '\n\n' + (currentArticle.contentText || currentArticle.content || '');
      copyToClipboard(text);
    }
    shareMenu.classList.add('hidden');
  };

  // ═══════════════════════════════════════════════════════════
  // POMODORO SYSTEM
  // ═══════════════════════════════════════════════════════════

  const togglePomodoroWidget = () => {
    isPomodoroVisible = !isPomodoroVisible;
    pomodoroWidget.classList.toggle('hidden', !isPomodoroVisible);
    pomodoroBtn.classList.toggle('active', isPomodoroVisible);

    if (isPomodoroVisible) {
      // Initialize pomodoro if not already
      CleanNewsPomodoro.start(25, 5);
      updatePomodoroDisplay(CleanNewsPomodoro.getState());
    } else {
      CleanNewsPomodoro.destroy();
    }
  };

  const updatePomodoroDisplay = (state) => {
    pomodoroTimer.textContent = CleanNewsPomodoro.formatTime(state.remaining);
    pomodoroModeLabel.textContent = state.mode === 'work' ? 'Trabajo' : 'Descanso';
    pomodoroModeLabel.className = 'pomodoro-mode-label ' + state.mode;

    if (state.completed > 0) {
      pomodoroCompleted.textContent = state.completed;
      pomodoroCompleted.classList.remove('hidden');
    } else {
      pomodoroCompleted.classList.add('hidden');
    }

    pomodoroTimer.classList.toggle('running', state.running);

    // Update play/pause button icon
    if (state.running) {
      pomodoroPlay.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
      pomodoroPlay.title = 'Pausar';
    } else {
      pomodoroPlay.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
      pomodoroPlay.title = 'Iniciar';
    }
  };

  const startPomodoro = () => {
    CleanNewsPomodoro.onTick(updatePomodoroDisplay);
    CleanNewsPomodoro.onComplete((mode, completed) => {
      updatePomodoroDisplay(CleanNewsPomodoro.getState());
      if (mode === 'work') {
        showToast('¡Pomodoro completado! Toma un descanso');
      } else {
        showToast('¡Descanso terminado! A trabajar');
      }
    });
    CleanNewsPomodoro.resume();
  };

  const pausePomodoro = () => {
    CleanNewsPomodoro.pause();
    updatePomodoroDisplay(CleanNewsPomodoro.getState());
  };

  const resetPomodoro = () => {
    CleanNewsPomodoro.reset();
    updatePomodoroDisplay(CleanNewsPomodoro.getState());
  };

  // ═══════════════════════════════════════════════════════════
  // FOCUS MODE
  // ═══════════════════════════════════════════════════════════

  const toggleFocusMode = () => {
    isFocusMode = !isFocusMode;
    document.body.classList.toggle('focus-mode', isFocusMode);
    focusBtn.classList.toggle('active', isFocusMode);
  };

  // ═══════════════════════════════════════════════════════════
  // EVENT BINDING
  // ═══════════════════════════════════════════════════════════

  const bindEvents = () => {
    // Scroll progress + scrollspy
    window.addEventListener('scroll', () => {
      updateScrollProgress();
      updateScrollSpy();
    }, { passive: true });

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
      closeAllDropdowns();
      renderCollectionMenu();
      collectionMenu.classList.toggle('hidden');
    });

    // Export dropdown
    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllDropdowns();
      exportMenu.classList.toggle('hidden');
    });

    // Share dropdown
    shareBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllDropdowns();
      shareMenu.classList.toggle('hidden');
    });

    shareMenu.querySelectorAll('.share-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.share;
        switch (action) {
          case 'link': shareLink(); break;
          case 'content': shareContent(); break;
          case 'text': shareAsText(); break;
        }
      });
    });

    // Highlight button
    highlightBtn.addEventListener('click', () => {
      if (isHighlightMode) {
        disableHighlightMode();
      } else {
        enableHighlightMode();
      }
    });

    // Text selection for highlighting
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('touchend', handleTextSelection);

    // Highlight toolbar color buttons
    highlightToolbar.querySelectorAll('.highlight-color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const color = btn.dataset.color;
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !pendingHighlightRange) return;

        // Deselect all colors
        highlightToolbar.querySelectorAll('.highlight-color-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        const text = selection.toString().trim();
        createHighlight(text, color, pendingHighlightRange);
      });
    });

    // Highlight note button
    highlightNoteBtn.addEventListener('click', () => {
      if (!pendingHighlightRange) return;
      const rect = highlightToolbar.getBoundingClientRect();
      showAnnotationPopup(null, rect.left + rect.width / 2, rect.bottom + 8);
      // We'll store the range for after note save
      pendingHighlightColor = pendingHighlightColor || 'yellow';
    });

    // Note popup save/cancel
    highlightNoteSave.addEventListener('click', async () => {
      if (pendingHighlightNoteId) {
        await saveAnnotation();
      } else if (pendingHighlightRange) {
        // New highlight with note
        const selection = window.getSelection();
        const text = selection ? selection.toString().trim() : '';
        if (text) {
          await createHighlight(text, 'yellow', pendingHighlightRange);
          // Now update the note on the just-created highlight
          if (highlights.length > 0) {
            const latestHl = highlights[highlights.length - 1];
            pendingHighlightNoteId = latestHl.id;
            await saveAnnotation();
          }
        }
      }
    });

    highlightNoteCancel.addEventListener('click', hideAnnotationPopup);

    // TOC toggle
    tocToggle.addEventListener('click', toggleTOC);

    // Annotations panel
    annotationsBtn.addEventListener('click', () => {
      if (isAnnotationsVisible) {
        closeAnnotationsPanel();
      } else {
        openAnnotationsPanel();
      }
    });
    annotationsClose.addEventListener('click', closeAnnotationsPanel);

    // Pomodoro
    pomodoroBtn.addEventListener('click', togglePomodoroWidget);
    pomodoroPlay.addEventListener('click', () => {
      const state = CleanNewsPomodoro.getState();
      if (state.running) {
        pausePomodoro();
      } else {
        startPomodoro();
      }
    });
    pomodoroReset.addEventListener('click', resetPomodoro);
    pomodoroClose.addEventListener('click', togglePomodoroWidget);

    // Focus mode
    focusBtn.addEventListener('click', toggleFocusMode);

    // Click outside dropdowns to close
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.collection-dropdown')) collectionMenu.classList.add('hidden');
      if (!e.target.closest('.export-dropdown')) exportMenu.classList.add('hidden');
      if (!e.target.closest('.share-dropdown')) shareMenu.classList.add('hidden');
      if (!e.target.closest('.highlight-toolbar')) {
        // Delay to allow toolbar clicks to register
        setTimeout(() => {
          if (!e.target.closest('.highlight-toolbar') && !e.target.closest('.highlight-note-popup')) {
            hideHighlightToolbar();
            hideAnnotationPopup();
          }
        }, 200);
      }
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

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (isFocusMode) {
          toggleFocusMode();
          return;
        }
        if (!editMode.classList.contains('hidden')) { exitEditMode(); return; }
        if (!deleteModal.classList.contains('hidden')) { deleteModal.classList.add('hidden'); return; }
        if (isAnnotationsVisible) { closeAnnotationsPanel(); return; }
        if (isPomodoroVisible) { togglePomodoroWidget(); return; }
        collectionMenu.classList.add('hidden');
        exportMenu.classList.add('hidden');
        shareMenu.classList.add('hidden');
        hideHighlightToolbar();
        hideAnnotationPopup();
        if (isHighlightMode) disableHighlightMode();
        if (isTocVisible) toggleTOC();
      }
    });

    // Mouseup to hide toolbar when selection is cleared
    document.addEventListener('mousedown', (e) => {
      if (!e.target.closest('.highlight-toolbar') && !e.target.closest('.highlight-note-popup') && !e.target.closest('.cnv-highlight')) {
        // Defer to allow the selection to update
        setTimeout(() => {
          const selection = window.getSelection();
          if (!selection || selection.isCollapsed) {
            hideHighlightToolbar();
          }
        }, 150);
      }
    });
  };

  // ── Helper: close all dropdowns ───────────────────────────
  const closeAllDropdowns = () => {
    collectionMenu.classList.add('hidden');
    exportMenu.classList.add('hidden');
    shareMenu.classList.add('hidden');
  };

  // ── Toast ─────────────────────────────────────────────────
  const showToast = (message) => {
    toastMessage.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => { toast.classList.add('hidden'); }, 2500);
  };

  // ── HTML Escape ───────────────────────────────────────────
  const escapeHtml = (str) => {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  const escapeAttr = (str) => {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#039;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };

  // ── Boot ──────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);
})();
