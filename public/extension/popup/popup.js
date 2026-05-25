// CleanNews Vault - Popup Logic
// Maneja la extracción y guardado de artículos desde el popup

(function() {
  'use strict';

  // Elementos del DOM
  var loadingState = document.getElementById('loading-state');
  var errorState = document.getElementById('error-state');
  var contentState = document.getElementById('content-state');
  var errorMessage = document.getElementById('error-message');
  var retryBtn = document.getElementById('retry-btn');

  var articleTitle = document.getElementById('article-title');
  var articleSource = document.getElementById('article-source').querySelector('span');
  var articleAuthor = document.getElementById('article-author');
  var articleDate = document.getElementById('article-date');
  var articleWords = document.getElementById('article-words').querySelector('span');
  var articleReadtime = document.getElementById('article-readtime').querySelector('span');
  var articleExcerpt = document.getElementById('article-excerpt');

  var tagsInput = document.getElementById('tags-input');
  var saveBtn = document.getElementById('save-btn');
  var discardBtn = document.getElementById('discard-btn');
  var libraryLink = document.getElementById('library-link');

  var toast = document.getElementById('toast');
  var toastMessage = document.getElementById('toast-message');

  var currentData = null;

  // Inicialización
  document.addEventListener('DOMContentLoaded', function() {
    extractContent();
    bindEvents();
  });

  // Extraer contenido al cargar
  function extractContent() {
    showState('loading');

    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (!tabs || tabs.length === 0) {
        showError('No se encontró una pestaña activa.');
        return;
      }

      var tab = tabs[0];

      // No extraer de extension pages
      if (tab.url && tab.url.indexOf('chrome-extension://') === 0) {
        showError('No se puede extraer contenido de páginas de extensiones.');
        return;
      }

      chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT' }, function(response) {
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
        renderArticle(currentData);
        showState('content');
      });
    });
  }

  // Renderizar artículo en el popup
  function renderArticle(data) {
    articleTitle.textContent = data.title || 'Sin título';

    if (data.source) {
      articleSource.textContent = data.source;
      document.getElementById('article-source').classList.remove('hidden');
    } else {
      document.getElementById('article-source').classList.add('hidden');
    }

    if (data.author) {
      articleAuthor.querySelector('span').textContent = data.author;
      articleAuthor.classList.remove('hidden');
    } else {
      articleAuthor.classList.add('hidden');
    }

    if (data.publishedAt) {
      articleDate.querySelector('span').textContent = data.publishedAt;
      articleDate.classList.remove('hidden');
    } else {
      articleDate.classList.add('hidden');
    }

    articleWords.textContent = (data.wordCount || 0).toLocaleString('es-ES') + ' palabras';
    articleReadtime.textContent = '~' + (data.readTime || 1) + ' min lectura';

    articleExcerpt.textContent = data.excerpt || data.content || 'Sin contenido disponible.';
  }

  // Vincular eventos
  function bindEvents() {
    retryBtn.addEventListener('click', extractContent);

    saveBtn.addEventListener('click', handleSave);

    discardBtn.addEventListener('click', function() {
      window.close();
    });

    libraryLink.addEventListener('click', function(e) {
      e.preventDefault();
      chrome.tabs.create({ url: chrome.runtime.getURL('library/library.html') });
      window.close();
    });
  }

  // Guardar artículo
  function handleSave() {
    if (!currentData) return;

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px"></div> Guardando...';

    // Procesar tags
    var tagsRaw = tagsInput.value.trim();
    var tags = tagsRaw
      ? tagsRaw.split(',').map(function(t) { return t.trim().toLowerCase(); }).filter(function(t) { return t.length > 0; })
      : [];

    var article = {
      title: currentData.title,
      author: currentData.author,
      source: currentData.source,
      sourceUrl: currentData.sourceUrl,
      content: currentData.content,
      excerpt: currentData.excerpt,
      publishedAt: currentData.publishedAt,
      wordCount: currentData.wordCount,
      readTime: currentData.readTime,
      tags: tags
    };

    chrome.storage.local.get(['cleannews_vault_articles'], function(result) {
      var articles = result.cleannews_vault_articles || [];

      // Verificar duplicados
      var duplicate = articles.find(function(a) { return a.sourceUrl === article.sourceUrl; });
      if (duplicate) {
        showToast('Este artículo ya está guardado');
        resetSaveBtn();
        return;
      }

      // Crear nuevo artículo
      var newArticle = {
        id: 'art_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9),
        ...article,
        notes: '',
        favorite: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      articles.unshift(newArticle);

      chrome.storage.local.set({ cleannews_vault_articles: articles }, function() {
        showToast('Artículo guardado correctamente');

        // Cambiar botón a guardado
        saveBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Guardado';
        saveBtn.style.background = '#065f46';

        // Cerrar popup después de un momento
        setTimeout(function() {
          window.close();
        }, 1200);
      });
    });
  }

  function resetSaveBtn() {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Guardar';
    saveBtn.style.background = '#059669';
  }

  // Mostrar estados
  function showState(state) {
    loadingState.classList.add('hidden');
    errorState.classList.add('hidden');
    contentState.classList.add('hidden');

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

  // Toast
  function showToast(message) {
    toastMessage.textContent = message;
    toast.classList.remove('hidden');

    setTimeout(function() {
      toast.classList.add('hidden');
    }, 2500);
  }
})();
