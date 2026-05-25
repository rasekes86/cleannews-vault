// CleanNews Vault - Library Logic
// Gestiona la biblioteca de artículos guardados

(function() {
  'use strict';

  // State
  var allArticles = [];
  var filteredArticles = [];
  var currentPage = 1;
  var perPage = 12;
  var deleteTargetId = null;
  var searchTimeout = null;

  // DOM Elements
  var searchInput = document.getElementById('search-input');
  var newExtractBtn = document.getElementById('new-extract-btn');
  var filterTag = document.getElementById('filter-tag');
  var filterSource = document.getElementById('filter-source');
  var filterFavorites = document.getElementById('filter-favorites');
  var sortSelect = document.getElementById('sort-select');
  var articlesGrid = document.getElementById('articles-grid');
  var emptyState = document.getElementById('empty-state');
  var emptyTitle = document.getElementById('empty-title');
  var emptyDescription = document.getElementById('empty-description');
  var pagination = document.getElementById('pagination');
  var prevPage = document.getElementById('prev-page');
  var nextPage = document.getElementById('next-page');
  var pageInfo = document.getElementById('page-info');
  var deleteModal = document.getElementById('delete-modal');
  var confirmDelete = document.getElementById('confirm-delete');
  var cancelDelete = document.getElementById('cancel-delete');
  var toast = document.getElementById('toast');
  var toastMessage = document.getElementById('toast-message');

  // Stats
  var statArticles = document.getElementById('stat-articles');
  var statSources = document.getElementById('stat-sources');
  var statTags = document.getElementById('stat-tags');
  var statFavorites = document.getElementById('stat-favorites');

  // Init
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    loadArticles();
    bindEvents();
  }

  function bindEvents() {
    // Search
    searchInput.addEventListener('input', function() {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(function() {
        currentPage = 1;
        applyFilters();
      }, 300);
    });

    // Filters
    filterTag.addEventListener('change', function() {
      currentPage = 1;
      applyFilters();
    });

    filterSource.addEventListener('change', function() {
      currentPage = 1;
      applyFilters();
    });

    filterFavorites.addEventListener('click', function() {
      this.classList.toggle('active');
      currentPage = 1;
      applyFilters();
    });

    sortSelect.addEventListener('change', function() {
      applyFilters();
    });

    // Pagination
    prevPage.addEventListener('click', function() {
      if (currentPage > 1) {
        currentPage--;
        renderArticles();
        scrollToTop();
      }
    });

    nextPage.addEventListener('click', function() {
      var totalPages = Math.ceil(filteredArticles.length / perPage);
      if (currentPage < totalPages) {
        currentPage++;
        renderArticles();
        scrollToTop();
      }
    });

    // New extract
    newExtractBtn.addEventListener('click', function() {
      window.close();
    });

    // Delete modal
    confirmDelete.addEventListener('click', function() {
      if (deleteTargetId) {
        deleteArticle(deleteTargetId);
      }
    });

    cancelDelete.addEventListener('click', closeModal);
    deleteModal.querySelector('.modal-backdrop').addEventListener('click', closeModal);
  }

  function loadArticles() {
    CleanNewsStorage.getArticles().then(function(articles) {
      allArticles = articles;
      populateFilters();
      updateStats();
      applyFilters();
    });
  }

  function populateFilters() {
    // Tags
    var tags = [];
    var tagSet = {};
    allArticles.forEach(function(a) {
      if (a.tags && Array.isArray(a.tags)) {
        a.tags.forEach(function(t) {
          if (!tagSet[t]) {
            tagSet[t] = true;
            tags.push(t);
          }
        });
      }
    });
    tags.sort();

    var tagHTML = '<option value="">Todas las etiquetas</option>';
    tags.forEach(function(tag) {
      tagHTML += '<option value="' + escapeHtml(tag) + '">' + escapeHtml(tag) + '</option>';
    });
    filterTag.innerHTML = tagHTML;

    // Sources
    var sources = [];
    var sourceSet = {};
    allArticles.forEach(function(a) {
      if (a.source && !sourceSet[a.source]) {
        sourceSet[a.source] = true;
        sources.push(a.source);
      }
    });
    sources.sort();

    var sourceHTML = '<option value="">Todas las fuentes</option>';
    sources.forEach(function(src) {
      sourceHTML += '<option value="' + escapeHtml(src) + '">' + escapeHtml(src) + '</option>';
    });
    filterSource.innerHTML = sourceHTML;
  }

  function updateStats() {
    var tags = [];
    var tagSet = {};
    var sourceSet = {};
    var favCount = 0;

    allArticles.forEach(function(a) {
      if (a.tags && Array.isArray(a.tags)) {
        a.tags.forEach(function(t) {
          if (!tagSet[t]) { tagSet[t] = true; tags.push(t); }
        });
      }
      if (a.source) sourceSet[a.source] = true;
      if (a.favorite) favCount++;
    });

    statArticles.textContent = allArticles.length;
    statSources.textContent = Object.keys(sourceSet).length;
    statTags.textContent = tags.length;
    statFavorites.textContent = favCount;
  }

  function applyFilters() {
    var query = searchInput.value.trim().toLowerCase();
    var selectedTag = filterTag.value;
    var selectedSource = filterSource.value;
    var favoritesOnly = filterFavorites.classList.contains('active');
    var sortBy = sortSelect.value;

    filteredArticles = allArticles.filter(function(article) {
      // Search
      if (query) {
        var terms = query.split(/\s+/);
        var searchText = [
          article.title, article.content, article.source, article.author, article.excerpt
        ].filter(Boolean).join(' ').toLowerCase();
        var matchSearch = terms.every(function(term) {
          return searchText.indexOf(term) !== -1;
        });
        if (!matchSearch) return false;
      }

      // Tag filter
      if (selectedTag && (!article.tags || !article.tags.includes(selectedTag))) {
        return false;
      }

      // Source filter
      if (selectedSource && article.source !== selectedSource) {
        return false;
      }

      // Favorites
      if (favoritesOnly && !article.favorite) {
        return false;
      }

      return true;
    });

    // Sort
    switch (sortBy) {
      case 'title':
        filteredArticles.sort(function(a, b) { return (a.title || '').localeCompare(b.title || ''); });
        break;
      case 'source':
        filteredArticles.sort(function(a, b) { return (a.source || '').localeCompare(b.source || ''); });
        break;
      case 'readTime':
        filteredArticles.sort(function(a, b) { return (b.readTime || 0) - (a.readTime || 0); });
        break;
      case 'date':
      default:
        filteredArticles.sort(function(a, b) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        break;
    }

    renderArticles();
  }

  function renderArticles() {
    var start = (currentPage - 1) * perPage;
    var end = start + perPage;
    var pageArticles = filteredArticles.slice(start, end);

    // Empty state
    if (filteredArticles.length === 0) {
      articlesGrid.classList.add('hidden');
      pagination.classList.add('hidden');
      emptyState.classList.remove('hidden');

      if (allArticles.length === 0) {
        emptyTitle.textContent = 'No hay artículos guardados';
        emptyDescription.textContent = 'Extrae contenido de cualquier página web usando el icono de la extensión.';
      } else {
        emptyTitle.textContent = 'Sin resultados';
        emptyDescription.textContent = 'Intenta cambiar los filtros o el término de búsqueda.';
      }
      return;
    }

    emptyState.classList.add('hidden');
    articlesGrid.classList.remove('hidden');

    // Render cards
    var html = '';
    pageArticles.forEach(function(article) {
      html += renderCard(article);
    });
    articlesGrid.innerHTML = html;

    // Bind card events
    bindCardEvents();

    // Pagination
    var totalPages = Math.ceil(filteredArticles.length / perPage);
    if (totalPages > 1) {
      pagination.classList.remove('hidden');
      prevPage.disabled = currentPage <= 1;
      nextPage.disabled = currentPage >= totalPages;
      pageInfo.textContent = 'Página ' + currentPage + ' de ' + totalPages;
    } else {
      pagination.classList.add('hidden');
    }
  }

  function renderCard(article) {
    var tagsHtml = '';
    if (article.tags && article.tags.length > 0) {
      tagsHtml = article.tags.slice(0, 3).map(function(t) {
        return '<span class="tag-badge">' + escapeHtml(t) + '</span>';
      }).join('');
    }

    var dateStr = '';
    if (article.publishedAt) {
      dateStr = '<span>' + escapeHtml(article.publishedAt) + '</span><span class="card-separator">·</span>';
    }

    var metaHtml = '';
    if (article.source) {
      metaHtml += '<span class="card-source">' + escapeHtml(article.source) + '</span><span class="card-separator">·</span>';
    }
    if (article.author) {
      metaHtml += '<span>' + escapeHtml(article.author) + '</span><span class="card-separator">·</span>';
    }
    metaHtml += dateStr;

    return '<div class="article-card" data-id="' + article.id + '">' +
      '<div class="card-header">' +
        '<h3 class="card-title">' + escapeHtml(article.title || 'Sin título') + '</h3>' +
        '<button class="card-favorite' + (article.favorite ? ' active' : '') + '" data-action="favorite" title="Marcar favorito">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>' +
        '</button>' +
      '</div>' +
      '<div class="card-meta">' + metaHtml + '</div>' +
      '<p class="card-excerpt">' + escapeHtml(article.excerpt || '') + '</p>' +
      '<div class="card-footer">' +
        '<div class="card-tags">' + tagsHtml + '</div>' +
        '<span class="card-readtime">' +
          '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>' +
          (article.readTime || 1) + ' min' +
        '</span>' +
        '<button class="card-delete" data-action="delete" title="Eliminar">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>' +
        '</button>' +
      '</div>' +
    '</div>';
  }

  function bindCardEvents() {
    var cards = articlesGrid.querySelectorAll('.article-card');

    cards.forEach(function(card) {
      var id = card.getAttribute('data-id');

      // Click card -> open reader
      card.addEventListener('click', function(e) {
        var action = e.target.closest('[data-action]');
        if (action) return; // Don't navigate for action buttons

        chrome.tabs.create({
          url: chrome.runtime.getURL('reader/reader.html?id=' + id)
        });
      });

      // Favorite
      var favBtn = card.querySelector('[data-action="favorite"]');
      if (favBtn) {
        favBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          toggleFavorite(id, favBtn);
        });
      }

      // Delete
      var delBtn = card.querySelector('[data-action="delete"]');
      if (delBtn) {
        delBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          showDeleteModal(id);
        });
      }
    });
  }

  function toggleFavorite(id, btn) {
    var article = allArticles.find(function(a) { return a.id === id; });
    if (!article) return;

    article.favorite = !article.favorite;
    btn.classList.toggle('active');

    CleanNewsStorage.updateArticle(id, { favorite: article.favorite }).then(function() {
      updateStats();
      applyFilters();
      showToast(article.favorite ? 'Marcado como favorito' : 'Favorito eliminado');
    });
  }

  function showDeleteModal(id) {
    deleteTargetId = id;
    deleteModal.classList.remove('hidden');
  }

  function closeModal() {
    deleteTargetId = null;
    deleteModal.classList.add('hidden');
  }

  function deleteArticle(id) {
    CleanNewsStorage.deleteArticle(id).then(function(result) {
      if (result.success) {
        allArticles = allArticles.filter(function(a) { return a.id !== id; });
        closeModal();
        populateFilters();
        updateStats();
        applyFilters();
        showToast('Artículo eliminado');
      }
    });
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showToast(message) {
    toastMessage.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(function() {
      toast.classList.add('hidden');
    }, 2500);
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();
