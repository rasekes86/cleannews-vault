// CleanNews Vault - Reader Logic
// Vista de lectura limpia con opciones de edición y exportación

(function() {
  'use strict';

  var articleId = null;
  var currentArticle = null;

  // DOM
  var backBtn = document.getElementById('back-btn');
  var favoriteBtn = document.getElementById('favorite-btn');
  var editBtn = document.getElementById('edit-btn');
  var exportBtn = document.getElementById('export-btn');
  var exportMenu = document.getElementById('export-menu');
  var deleteBtn = document.getElementById('delete-btn');

  var viewMode = document.getElementById('view-mode');
  var editMode = document.getElementById('edit-mode');

  var articleTitle = document.getElementById('article-title');
  var articleAuthor = document.getElementById('article-author');
  var articleSource = document.getElementById('article-source');
  var sourceLink = document.getElementById('source-link');
  var articleDate = document.getElementById('article-date');
  var articleStats = document.getElementById('article-stats');
  var articleTags = document.getElementById('article-tags');
  var articleContent = document.getElementById('article-content');
  var articleNotesSection = document.getElementById('article-notes-section');
  var articleNotes = document.getElementById('article-notes');

  var editTitle = document.getElementById('edit-title');
  var editTags = document.getElementById('edit-tags');
  var editNotes = document.getElementById('edit-notes');
  var editContent = document.getElementById('edit-content');
  var saveEdit = document.getElementById('save-edit');
  var cancelEdit = document.getElementById('cancel-edit');

  var deleteModal = document.getElementById('delete-modal');
  var confirmDelete = document.getElementById('confirm-delete');
  var cancelDelete = document.getElementById('cancel-delete');

  var toast = document.getElementById('toast');
  var toastMessage = document.getElementById('toast-message');

  // Init
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    // Get article ID from URL
    var params = new URLSearchParams(window.location.search);
    articleId = params.get('id');

    if (!articleId) {
      showError();
      return;
    }

    loadArticle();
    bindEvents();
  }

  function bindEvents() {
    // Back
    backBtn.addEventListener('click', function() {
      if (document.referrer && document.referrer.indexOf('library.html') !== -1) {
        history.back();
      } else {
        chrome.tabs.create({ url: chrome.runtime.getURL('library/library.html') });
        window.close();
      }
    });

    // Favorite
    favoriteBtn.addEventListener('click', toggleFavorite);

    // Edit
    editBtn.addEventListener('click', enterEditMode);
    saveEdit.addEventListener('click', saveEdits);
    cancelEdit.addEventListener('click', exitEditMode);

    // Export
    exportBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      exportMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', function(e) {
      if (!e.target.closest('.export-dropdown')) {
        exportMenu.classList.add('hidden');
      }
    });

    exportMenu.querySelectorAll('.export-option').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var format = this.getAttribute('data-format');
        exportArticle(format);
        exportMenu.classList.add('hidden');
      });
    });

    // Delete
    deleteBtn.addEventListener('click', function() {
      deleteModal.classList.remove('hidden');
    });

    confirmDelete.addEventListener('click', deleteArticle);
    cancelDelete.addEventListener('click', function() {
      deleteModal.classList.add('hidden');
    });
    deleteModal.querySelector('.modal-backdrop').addEventListener('click', function() {
      deleteModal.classList.add('hidden');
    });
  }

  function loadArticle() {
    CleanNewsStorage.getArticle(articleId).then(function(article) {
      if (!article) {
        showError();
        return;
      }

      currentArticle = article;
      document.title = (article.title || 'Artículo') + ' - CleanNews Vault';
      renderArticle(article);
    });
  }

  function renderArticle(article) {
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
    var statsParts = [];
    if (article.wordCount) statsParts.push(article.wordCount.toLocaleString('es-ES') + ' palabras');
    if (article.readTime) statsParts.push('~' + article.readTime + ' min lectura');
    articleStats.textContent = statsParts.join(' · ');

    // Tags
    if (article.tags && article.tags.length > 0) {
      articleTags.classList.remove('hidden');
      articleTags.innerHTML = article.tags.map(function(t) {
        return '<span class="tag-badge">' + escapeHtml(t) + '</span>';
      }).join('');
    } else {
      articleTags.classList.add('hidden');
    }

    // Content - render as paragraphs
    articleContent.innerHTML = renderContent(article.content || article.excerpt || '');

    // Notes
    if (article.notes && article.notes.trim()) {
      articleNotesSection.classList.remove('hidden');
      articleNotes.textContent = article.notes;
    } else {
      articleNotesSection.classList.add('hidden');
    }

    // Favorite state
    updateFavoriteButton(article.favorite);

    // Edit button text
    editBtn.querySelector('span').textContent = 'Editar';
  }

  function renderContent(text) {
    if (!text || text.trim().length === 0) {
      return '<p style="color:#94a3b8;font-style:italic;">No hay contenido disponible.</p>';
    }

    // Split by double newlines for paragraphs
    var blocks = text.split(/\n\n+/);
    var html = '';

    blocks.forEach(function(block) {
      block = block.trim();
      if (!block) return;

      // Check if it looks like a heading (short, possibly starts with #)
      var headingMatch = block.match(/^(#{1,4})\s+(.+)$/);
      if (headingMatch) {
        var level = headingMatch[1].length;
        html += '<h' + level + '>' + escapeHtml(headingMatch[2].trim()) + '</h' + level + '>';
        return;
      }

      // Check if it's short enough to be a heading-like element
      if (block.length < 80 && !block.includes('.') && !block.includes(',')) {
        html += '<h3>' + escapeHtml(block) + '</h3>';
        return;
      }

      // Regular paragraph
      html += '<p>' + escapeHtml(block) + '</p>';
    });

    return html || '<p>' + escapeHtml(text) + '</p>';
  }

  function toggleFavorite() {
    if (!currentArticle) return;

    var newFav = !currentArticle.favorite;
    currentArticle.favorite = newFav;
    updateFavoriteButton(newFav);

    CleanNewsStorage.updateArticle(articleId, { favorite: newFav }).then(function() {
      showToast(newFav ? 'Marcado como favorito' : 'Favorito eliminado');
    });
  }

  function updateFavoriteButton(isFavorite) {
    if (isFavorite) {
      favoriteBtn.classList.add('active');
      favoriteBtn.querySelector('svg').style.fill = '#f59e0b';
      favoriteBtn.querySelector('svg').style.color = '#f59e0b';
      favoriteBtn.querySelector('span').textContent = 'En favoritos';
    } else {
      favoriteBtn.classList.remove('active');
      favoriteBtn.querySelector('svg').style.fill = 'none';
      favoriteBtn.querySelector('svg').style.color = '';
      favoriteBtn.querySelector('span').textContent = 'Favorito';
    }
  }

  function enterEditMode() {
    if (!currentArticle) return;

    viewMode.classList.add('hidden');
    editMode.classList.remove('hidden');
    editBtn.querySelector('span').textContent = 'Editando...';

    editTitle.value = currentArticle.title || '';
    editTags.value = (currentArticle.tags || []).join(', ');
    editNotes.value = currentArticle.notes || '';
    editContent.value = currentArticle.content || '';
  }

  function exitEditMode() {
    editMode.classList.add('hidden');
    viewMode.classList.remove('hidden');
    editBtn.querySelector('span').textContent = 'Editar';
  }

  function saveEdits() {
    if (!currentArticle) return;

    var tags = editTags.value
      .split(',')
      .map(function(t) { return t.trim().toLowerCase(); })
      .filter(function(t) { return t.length > 0; });

    var updates = {
      title: editTitle.value.trim(),
      tags: tags,
      notes: editNotes.value.trim(),
      content: editContent.value
    };

    CleanNewsStorage.updateArticle(articleId, updates).then(function(result) {
      if (result.success) {
        currentArticle = { ...currentArticle, ...updates };
        renderArticle(currentArticle);
        exitEditMode();
        showToast('Cambios guardados');
      }
    });
  }

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
    }
  }

  function deleteArticle() {
    if (!articleId) return;

    CleanNewsStorage.deleteArticle(articleId).then(function(result) {
      if (result.success) {
        deleteModal.classList.add('hidden');
        showToast('Artículo eliminado');
        setTimeout(function() {
          chrome.tabs.create({ url: chrome.runtime.getURL('library/library.html') });
          window.close();
        }, 800);
      }
    });
  }

  function showError() {
    document.querySelector('.reader-article').innerHTML =
      '<div style="text-align:center;padding:80px 24px;color:#94a3b8;">' +
        '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:16px;color:#d1d5db;">' +
          '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>' +
        '</svg>' +
        '<h3 style="font-size:18px;color:#64748b;margin-bottom:8px;">Artículo no encontrado</h3>' +
        '<p style="font-size:13px;margin-bottom:20px;">El artículo solicitado no existe o fue eliminado.</p>' +
        '<a href="' + chrome.runtime.getURL('library/library.html') + '" style="color:#059669;font-weight:600;text-decoration:none;">Volver a la biblioteca</a>' +
      '</div>';
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
