// CleanNews Vault v2.0 - Library Logic
// Manages article library with collections, search, filters, pagination

(async function() {
  'use strict';

  // ── State ─────────────────────────────────────────────────
  let allArticles = [];
  let filteredArticles = [];
  let allCollections = [];
  let currentPage = 1;
  const perPage = 12;
  let deleteTargetId = null;
  let searchTimeout = null;
  let activeSidebarFilter = 'all'; // all, favorites, read, unread
  let activeCollectionId = null;
  let collectionModalMode = 'create'; // create, edit
  let editingCollectionId = null;
  let contextMenuArticleId = null;
  let modalColor = '#ef4444';

  // ── DOM Elements ──────────────────────────────────────────
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');
  const newExtractBtn = document.getElementById('new-extract-btn');
  const importBtn = document.getElementById('import-btn');
  const exportAllBtn = document.getElementById('export-all-btn');
  const themeToggle = document.getElementById('theme-toggle');
  const filterTag = document.getElementById('filter-tag');
  const filterSource = document.getElementById('filter-source');
  const sortSelect = document.getElementById('sort-select');
  const sortDirSelect = document.getElementById('sort-dir-select');
  const articlesGrid = document.getElementById('articles-grid');
  const emptyState = document.getElementById('empty-state');
  const emptyTitle = document.getElementById('empty-title');
  const emptyDescription = document.getElementById('empty-description');
  const pagination = document.getElementById('pagination');
  const prevPage = document.getElementById('prev-page');
  const nextPage = document.getElementById('next-page');
  const pageInfo = document.getElementById('page-info');
  const deleteModal = document.getElementById('delete-modal');
  const deleteModalTitle = document.getElementById('delete-modal-title');
  const deleteModalDesc = document.getElementById('delete-modal-desc');
  const confirmDelete = document.getElementById('confirm-delete');
  const cancelDelete = document.getElementById('cancel-delete');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  const collectionsList = document.getElementById('collections-list');
  const newCollectionSidebarBtn = document.getElementById('new-collection-sidebar-btn');

  // Collection modal
  const collectionModal = document.getElementById('collection-modal');
  const collectionModalTitle = document.getElementById('collection-modal-title');
  const modalCollectionName = document.getElementById('modal-collection-name');
  const modalCollectionDesc = document.getElementById('modal-collection-desc');
  const modalCollectionSave = document.getElementById('modal-collection-save');
  const modalCollectionCancel = document.getElementById('modal-collection-cancel');

  // Import modal
  const importModal = document.getElementById('import-modal');
  const importDropzone = document.getElementById('import-dropzone');
  const importFile = document.getElementById('import-file');
  const importStatus = document.getElementById('import-status');
  const importClose = document.getElementById('import-close');

  // Context menu
  const contextMenu = document.getElementById('context-menu');
  const contextMenuItems = document.getElementById('context-menu-items');

  // Stats
  const statArticles = document.getElementById('stat-articles');
  const statSources = document.getElementById('stat-sources');
  const statTags = document.getElementById('stat-tags');
  const statCollections = document.getElementById('stat-collections');
  const statWords = document.getElementById('stat-words');
  const statProgress = document.getElementById('stat-progress');
  const countAll = document.getElementById('count-all');
  const countFavorites = document.getElementById('count-favorites');
  const countRead = document.getElementById('count-read');
  const countUnread = document.getElementById('count-unread');

  // ── Init ──────────────────────────────────────────────────
  async function init() {
    try {
      await CleanNewsDB.init();
      await CleanNewsStorage.migrateFromLegacy();
      await loadTheme();
      await loadData();
      bindEvents();
    } catch (err) {
      console.error('[CleanNews Library] Init error:', err);
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

  // ── Load Data ─────────────────────────────────────────────
  async function loadData() {
    allArticles = await CleanNewsStorage.getArticles();
    allCollections = await CleanNewsStorage.getCollections();
    renderSidebar();
    populateFilters();
    updateStats();
    applyFilters();
  }

  // ── Sidebar ───────────────────────────────────────────────
  function renderSidebar() {
    // Collections
    let html = '';
    allCollections.forEach(col => {
      const count = allArticles.filter(a => a.collectionIds && a.collectionIds.includes(col.id)).length;
      const isActive = activeCollectionId === col.id;
      html += `
        <button class="collection-sidebar-item ${isActive ? 'active' : ''}" data-collection-id="${escapeAttr(col.id)}">
          <span class="collection-color-dot" style="background:${escapeAttr(col.color)}"></span>
          <span class="collection-sidebar-label">${escapeHtml(col.name)}</span>
          <span class="sidebar-count">${count}</span>
          <div class="collection-sidebar-actions">
            <button class="collection-action-btn edit" data-col-id="${escapeAttr(col.id)}" title="Editar">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button class="collection-action-btn delete" data-col-id="${escapeAttr(col.id)}" title="Eliminar">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </button>`;
    });
    collectionsList.innerHTML = html;

    // Bind collection events
    collectionsList.querySelectorAll('.collection-sidebar-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const action = e.target.closest('.collection-action-btn');
        if (action) {
          e.stopPropagation();
          const colId = action.dataset.colId;
          if (action.classList.contains('edit')) {
            openEditCollection(colId);
          } else if (action.classList.contains('delete')) {
            deleteCollection(colId);
          }
          return;
        }
        const colId = item.dataset.collectionId;
        if (activeCollectionId === colId) {
          activeCollectionId = null;
        } else {
          activeCollectionId = colId;
        }
        activeSidebarFilter = null;
        currentPage = 1;
        renderSidebar();
        applyFilters();
      });
    });
  }

  function updateSidebarActive() {
    document.querySelectorAll('.sidebar-item').forEach(item => {
      const filter = item.dataset.filter;
      item.classList.toggle('active', filter === activeSidebarFilter && !activeCollectionId);
    });
    document.querySelectorAll('.collection-sidebar-item').forEach(item => {
      const colId = item.dataset.collectionId;
      item.classList.toggle('active', colId === activeCollectionId);
    });
  }

  // ── Populate Filters ──────────────────────────────────────
  function populateFilters() {
    const tags = [...new Set(allArticles.flatMap(a => a.tags || []))].sort();
    let tagHTML = '<option value="">Todas las etiquetas</option>';
    tags.forEach(t => { tagHTML += `<option value="${escapeAttr(t)}">${escapeHtml(t)}</option>`; });
    filterTag.innerHTML = tagHTML;

    const sources = [...new Set(allArticles.map(a => a.source).filter(Boolean))].sort();
    let sourceHTML = '<option value="">Todas las fuentes</option>';
    sources.forEach(s => { sourceHTML += `<option value="${escapeAttr(s)}">${escapeHtml(s)}</option>`; });
    filterSource.innerHTML = sourceHTML;
  }

  // ── Update Stats ──────────────────────────────────────────
  async function updateStats() {
    const stats = await CleanNewsStorage.getStats();
    statArticles.textContent = stats.totalArticles;
    statSources.textContent = stats.totalSources;
    statTags.textContent = stats.totalTags;
    statCollections.textContent = stats.totalCollections;
    statWords.textContent = stats.totalWords > 1000 ? (stats.totalWords / 1000).toFixed(1) + 'K' : stats.totalWords;
    statProgress.textContent = stats.avgReadProgress + '%';

    countAll.textContent = stats.totalArticles;
    countFavorites.textContent = stats.totalFavorites;
    countRead.textContent = stats.totalRead;
    countUnread.textContent = stats.totalArticles - stats.totalRead;
  }

  // ── Apply Filters ─────────────────────────────────────────
  function applyFilters() {
    const query = searchInput.value.trim();
    const selectedTag = filterTag.value;
    const selectedSource = filterSource.value;
    const sortBy = sortSelect.value;
    const sortDir = sortDirSelect.value;

    // Build filter options
    const options = { query: query || undefined, sortBy, sortDir, tags: selectedTag ? [selectedTag] : undefined, sources: selectedSource ? [selectedSource] : undefined };

    // Sidebar filters
    if (activeCollectionId) {
      options.collectionIds = [activeCollectionId];
    } else if (activeSidebarFilter === 'favorites') {
      options.favoritesOnly = true;
    } else if (activeSidebarFilter === 'read') {
      options.readStatus = 'read';
    } else if (activeSidebarFilter === 'unread') {
      options.readStatus = 'unread';
    }

    // Filter synchronously for performance (we already have allArticles)
    let articles = [...allArticles];

    // Text search
    if (query) {
      articles = CleanNewsSearch.search(articles, query);
    }

    // Tag filter
    if (selectedTag) {
      articles = articles.filter(a => a.tags && a.tags.includes(selectedTag));
    }

    // Source filter
    if (selectedSource) {
      articles = articles.filter(a => a.source === selectedSource);
    }

    // Collection filter
    if (activeCollectionId) {
      articles = articles.filter(a => a.collectionIds && a.collectionIds.includes(activeCollectionId));
    }

    // Status filters
    if (activeSidebarFilter === 'favorites') {
      articles = articles.filter(a => a.favorite);
    } else if (activeSidebarFilter === 'read') {
      articles = articles.filter(a => a.readProgress >= 100);
    } else if (activeSidebarFilter === 'unread') {
      articles = articles.filter(a => a.readProgress < 100);
    }

    // Sort
    const dir = sortDir === 'asc' ? 1 : -1;
    articles.sort((a, b) => {
      switch (sortBy) {
        case 'title': return dir * (a.title || '').localeCompare(b.title || '');
        case 'source': return dir * (a.source || '').localeCompare(b.source || '');
        case 'readTime': return dir * ((a.readTime || 0) - (b.readTime || 0));
        case 'readProgress': return dir * ((a.readProgress || 0) - (b.readProgress || 0));
        case 'publishedAt':
          return dir * (new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());
        case 'savedAt':
        default:
          return dir * (new Date(b.savedAt || b.createdAt || 0).getTime() - new Date(a.savedAt || a.createdAt || 0).getTime());
      }
    });

    filteredArticles = articles;
    renderArticles();
    updateSidebarActive();
  }

  // ── Render Articles ───────────────────────────────────────
  function renderArticles() {
    const start = (currentPage - 1) * perPage;
    const end = start + perPage;
    const pageArticles = filteredArticles.slice(start, end);
    const query = searchInput.value.trim();

    // Empty states
    if (filteredArticles.length === 0) {
      articlesGrid.classList.add('hidden');
      pagination.classList.add('hidden');
      emptyState.classList.remove('hidden');

      if (allArticles.length === 0) {
        emptyTitle.textContent = 'No hay artículos guardados';
        emptyDescription.textContent = 'Extrae contenido de cualquier página web usando el icono de la extensión.';
      } else if (activeCollectionId) {
        emptyTitle.textContent = 'Colección vacía';
        emptyDescription.textContent = 'No hay artículos en esta colección todavía.';
      } else if (query || filterTag.value || filterSource.value) {
        emptyTitle.textContent = 'Sin resultados';
        emptyDescription.textContent = 'Intenta cambiar los filtros o el término de búsqueda.';
      } else {
        emptyTitle.textContent = 'Sin artículos';
        emptyDescription.textContent = 'No hay artículos que coincidan con este filtro.';
      }
      return;
    }

    emptyState.classList.add('hidden');
    articlesGrid.classList.remove('hidden');

    // Render cards
    articlesGrid.innerHTML = pageArticles.map(a => renderCard(a, query)).join('');
    bindCardEvents();

    // Pagination
    const totalPages = Math.ceil(filteredArticles.length / perPage);
    if (totalPages > 1) {
      pagination.classList.remove('hidden');
      prevPage.disabled = currentPage <= 1;
      nextPage.disabled = currentPage >= totalPages;
      pageInfo.textContent = `Página ${currentPage} de ${totalPages} (${filteredArticles.length} artículos)`;
    } else {
      pagination.classList.add('hidden');
    }
  }

  function renderCard(article, query) {
    const progress = article.readProgress || 0;
    const progressClass = progress >= 100 ? 'complete' : '';

    // Thumbnail
    let thumbnailHtml = '';
    if (article.featuredImage) {
      thumbnailHtml = `
        <div class="card-thumbnail">
          <img src="${escapeAttr(article.featuredImage)}" alt="" loading="lazy" onerror="this.parentElement.innerHTML='<div class=card-thumbnail-placeholder><svg width=24 height=24 viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'1.5\\'><path d=\\'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z\\'/><polyline points=\\'14 2 14 8 20 8\\'/></svg></div>'">
        </div>`;
    }

    // Title with highlighting
    const titleHtml = query ? CleanNewsSearch.highlightMatches(article.title || 'Sin título', query) : escapeHtml(article.title || 'Sin título');

    // Meta
    let metaHtml = '';
    if (article.source) metaHtml += `<span class="card-source">${escapeHtml(article.source)}</span><span class="card-separator">·</span>`;
    if (article.author) metaHtml += `<span>${escapeHtml(article.author)}</span><span class="card-separator">·</span>`;
    if (article.publishedAt) metaHtml += `<span>${escapeHtml(article.publishedAt)}</span><span class="card-separator">·</span>`;
    if (article.readTime) metaHtml += `<span>${article.readTime} min</span>`;

    // Excerpt with highlighting
    const excerptHtml = query ? CleanNewsSearch.highlightMatches(article.excerpt || '', query) : escapeHtml(article.excerpt || '');

    // Tags
    let tagsHtml = '';
    if (article.tags && article.tags.length > 0) {
      tagsHtml = article.tags.slice(0, 3).map(t => `<span class="tag-badge">${escapeHtml(t)}</span>`).join('');
    }

    // Collection badges
    let collHtml = '';
    if (article.collectionIds && article.collectionIds.length > 0) {
      const cols = allCollections.filter(c => article.collectionIds.includes(c.id)).slice(0, 2);
      collHtml = cols.map(c => `
        <span class="collection-badge" style="background:${c.color}15;color:${c.color}">
          <span class="collection-badge-dot" style="background:${c.color}"></span>
          ${escapeHtml(c.name)}
        </span>`).join('');
    }

    return `
      <div class="article-card" data-id="${escapeAttr(article.id)}" data-context-article="${escapeAttr(article.id)}">
        <div class="card-progress-bar"><div class="card-progress-fill ${progressClass}" style="width:${progress}%"></div></div>
        ${thumbnailHtml}
        <div class="card-body">
          <div class="card-header">
            <h3 class="card-title">${titleHtml}</h3>
            <button class="card-favorite ${article.favorite ? 'active' : ''}" data-action="favorite" title="Favorito">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            </button>
          </div>
          <div class="card-meta">${metaHtml}</div>
          <p class="card-excerpt">${excerptHtml}</p>
          <div class="card-footer">
            <div class="card-tags">${tagsHtml}${collHtml}</div>
            <div class="card-actions">
              <button class="card-read-status ${progress >= 100 ? 'read' : ''}" data-action="toggle-read" title="${progress >= 100 ? 'Marcar no leído' : 'Marcar leído'}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="${progress >= 100 ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </button>
              <button class="card-delete" data-action="delete" title="Eliminar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </div>
        </div>
      </div>`;
  }

  function bindCardEvents() {
    articlesGrid.querySelectorAll('.article-card').forEach(card => {
      const id = card.dataset.id;

      // Click -> open reader
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-action]')) return;
        chrome.tabs.create({ url: chrome.runtime.getURL('reader/reader.html?id=' + id) });
      });

      // Favorite
      const favBtn = card.querySelector('[data-action="favorite"]');
      if (favBtn) {
        favBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleFavorite(id, favBtn);
        });
      }

      // Read status
      const readBtn = card.querySelector('[data-action="toggle-read"]');
      if (readBtn) {
        readBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleReadStatus(id);
        });
      }

      // Delete
      const delBtn = card.querySelector('[data-action="delete"]');
      if (delBtn) {
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          showDeleteModal(id);
        });
      }

      // Right-click context menu -> Add to collection
      card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e, id);
      });
    });
  }

  // ── Context Menu ──────────────────────────────────────────
  function showContextMenu(e, articleId) {
    if (allCollections.length === 0) return;
    contextMenuArticleId = articleId;

    const article = allArticles.find(a => a.id === articleId);
    if (!article) return;

    let html = '';
    allCollections.forEach(col => {
      const isIn = article.collectionIds && article.collectionIds.includes(col.id);
      html += `
        <button class="context-menu-item" data-col-id="${escapeAttr(col.id)}" data-action="${isIn ? 'remove' : 'add'}">
          <span class="collection-color-dot" style="background:${escapeAttr(col.color)}"></span>
          ${escapeHtml(col.name)}
          ${isIn ? '<span style="margin-left:auto;color:var(--primary);font-size:11px">✓</span>' : ''}
        </button>`;
    });

    contextMenuItems.innerHTML = html;
    contextMenu.classList.remove('hidden');

    // Position
    const x = Math.min(e.clientX, window.innerWidth - 200);
    const y = Math.min(e.clientY, window.innerHeight - 250);
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';

    // Bind
    contextMenuItems.querySelectorAll('.context-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        const colId = item.dataset.colId;
        const action = item.dataset.action;
        if (action === 'add') {
          CleanNewsStorage.addArticleToCollection(articleId, colId).then(() => {
            showToast('Añadido a colección');
            loadData();
          });
        } else {
          CleanNewsStorage.removeArticleFromCollection(articleId, colId).then(() => {
            showToast('Eliminado de colección');
            loadData();
          });
        }
        contextMenu.classList.add('hidden');
      });
    });
  }

  // ── Toggle Actions ────────────────────────────────────────
  async function toggleFavorite(id, btn) {
    const result = await CleanNewsStorage.toggleFavorite(id);
    if (result.success) {
      btn.classList.toggle('active', result.favorite);
      showToast(result.favorite ? 'Marcado como favorito' : 'Favorito eliminado');
      await loadData();
    }
  }

  async function toggleReadStatus(id) {
    const article = allArticles.find(a => a.id === id);
    if (!article) return;
    if (article.readProgress >= 100) {
      await CleanNewsStorage.markAsUnread(id);
      showToast('Marcado como no leído');
    } else {
      await CleanNewsStorage.markAsRead(id);
      showToast('Marcado como leído');
    }
    await loadData();
  }

  // ── Delete ────────────────────────────────────────────────
  function showDeleteModal(id) {
    deleteTargetId = id;
    deleteModalTitle.textContent = '¿Eliminar artículo?';
    deleteModalDesc.textContent = 'Esta acción no se puede deshacer.';
    deleteModal.classList.remove('hidden');
  }

  async function deleteArticle(id) {
    const result = await CleanNewsStorage.deleteArticle(id);
    if (result.success) {
      closeModal(deleteModal);
      showToast('Artículo eliminado');
      await loadData();
    }
  }

  async function deleteCollection(id) {
    const col = allCollections.find(c => c.id === id);
    if (!col) return;
    const articleCount = allArticles.filter(a => a.collectionIds && a.collectionIds.includes(id)).length;
    deleteModalTitle.textContent = '¿Eliminar colección?';
    deleteModalDesc.textContent = articleCount > 0
      ? `La colección "${col.name}" tiene ${articleCount} artículo(s). Se eliminará la colección pero los artículos se conservarán.`
      : 'Esta acción no se puede deshacer.';
    deleteTargetId = id;
    confirmDelete.onclick = async () => {
      await CleanNewsStorage.deleteCollection(id);
      closeModal(deleteModal);
      showToast('Colección eliminada');
      if (activeCollectionId === id) activeCollectionId = null;
      await loadData();
    };
    deleteModal.classList.remove('hidden');
  }

  // ── Collection Modal ──────────────────────────────────────
  function openNewCollectionModal() {
    collectionModalMode = 'create';
    editingCollectionId = null;
    collectionModalTitle.textContent = 'Nueva Colección';
    modalCollectionName.value = '';
    modalCollectionDesc.value = '';
    setModalColor('#ef4444');
    collectionModal.classList.remove('hidden');
  }

  function openEditCollection(id) {
    const col = allCollections.find(c => c.id === id);
    if (!col) return;
    collectionModalMode = 'edit';
    editingCollectionId = id;
    collectionModalTitle.textContent = 'Editar Colección';
    modalCollectionName.value = col.name;
    modalCollectionDesc.value = col.description || '';
    setModalColor(col.color);
    collectionModal.classList.remove('hidden');
  }

  function setModalColor(color) {
    modalColor = color;
    collectionModal.querySelectorAll('.color-dot-lg').forEach(dot => {
      dot.classList.toggle('active', dot.dataset.color === color);
    });
  }

  async function saveCollectionModal() {
    const name = modalCollectionName.value.trim();
    if (!name) return;

    if (collectionModalMode === 'create') {
      await CleanNewsStorage.createCollection(name, modalCollectionDesc.value.trim(), modalColor);
      showToast('Colección creada');
    } else {
      await CleanNewsStorage.updateCollection(editingCollectionId, {
        name,
        description: modalCollectionDesc.value.trim(),
        color: modalColor
      });
      showToast('Colección actualizada');
    }

    closeModal(collectionModal);
    await loadData();
  }

  // ── Import ────────────────────────────────────────────────
  async function handleImport(file) {
    if (!file) return;
    importStatus.classList.remove('hidden', 'success', 'error');
    importStatus.textContent = 'Importando...';
    importStatus.className = 'import-status';

    try {
      const text = await file.text();
      const result = await CleanNewsStorage.importBackup(text);
      if (result.success) {
        importStatus.textContent = `Importación exitosa: ${result.count} artículos importados.`;
        importStatus.classList.add('success');
        await loadData();
      } else {
        importStatus.textContent = 'Error al importar. Verifica el formato del archivo.';
        importStatus.classList.add('error');
      }
    } catch (err) {
      importStatus.textContent = 'Error al leer el archivo.';
      importStatus.classList.add('error');
    }
  }

  // ── Event Binding ─────────────────────────────────────────
  function bindEvents() {
    // Search
    searchInput.addEventListener('input', () => {
      searchClear.classList.toggle('hidden', !searchInput.value);
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentPage = 1;
        applyFilters();
      }, 300);
    });

    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchClear.classList.add('hidden');
      currentPage = 1;
      applyFilters();
    });

    // Filters
    filterTag.addEventListener('change', () => { currentPage = 1; applyFilters(); });
    filterSource.addEventListener('change', () => { currentPage = 1; applyFilters(); });
    sortSelect.addEventListener('change', applyFilters);
    sortDirSelect.addEventListener('change', applyFilters);

    // Sidebar nav
    document.querySelectorAll('.sidebar-item').forEach(item => {
      item.addEventListener('click', () => {
        activeSidebarFilter = item.dataset.filter;
        activeCollectionId = null;
        currentPage = 1;
        renderSidebar();
        applyFilters();
      });
    });

    // Pagination
    prevPage.addEventListener('click', () => {
      if (currentPage > 1) { currentPage--; renderArticles(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    });
    nextPage.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredArticles.length / perPage);
      if (currentPage < totalPages) { currentPage++; renderArticles(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    });

    // Header buttons
    newExtractBtn.addEventListener('click', () => { window.close(); });
    exportAllBtn.addEventListener('click', () => { CleanNewsExport.exportBackup(); showToast('Backup exportado'); });
    themeToggle.addEventListener('click', toggleTheme);

    // Import
    importBtn.addEventListener('click', () => {
      importStatus.classList.add('hidden');
      importFile.value = '';
      importModal.classList.remove('hidden');
    });
    importClose.addEventListener('click', () => { importModal.classList.add('hidden'); });
    importFile.addEventListener('change', (e) => { if (e.target.files[0]) handleImport(e.target.files[0]); });
    importDropzone.addEventListener('dragover', (e) => { e.preventDefault(); importDropzone.classList.add('dragover'); });
    importDropzone.addEventListener('dragleave', () => { importDropzone.classList.remove('dragover'); });
    importDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      importDropzone.classList.remove('dragover');
      if (e.dataTransfer.files[0]) handleImport(e.dataTransfer.files[0]);
    });

    // Delete modal
    confirmDelete.addEventListener('click', () => {
      if (deleteTargetId && !editingCollectionId) deleteArticle(deleteTargetId);
    });
    cancelDelete.addEventListener('click', () => { closeModal(deleteModal); editingCollectionId = null; });
    deleteModal.querySelector('.modal-backdrop').addEventListener('click', () => { closeModal(deleteModal); editingCollectionId = null; });

    // Collection modal
    newCollectionSidebarBtn.addEventListener('click', openNewCollectionModal);
    modalCollectionSave.addEventListener('click', saveCollectionModal);
    modalCollectionCancel.addEventListener('click', () => { closeModal(collectionModal); editingCollectionId = null; });
    collectionModal.querySelector('.modal-backdrop').addEventListener('click', () => { closeModal(collectionModal); editingCollectionId = null; });
    collectionModal.querySelectorAll('.color-dot-lg').forEach(dot => {
      dot.addEventListener('click', () => setModalColor(dot.dataset.color));
    });

    // Close context menu
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.context-menu')) {
        contextMenu.classList.add('hidden');
      }
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        contextMenu.classList.add('hidden');
        closeModal(deleteModal);
        closeModal(collectionModal);
        closeModal(importModal);
      }
    });
  }

  function closeModal(modal) {
    modal.classList.add('hidden');
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
