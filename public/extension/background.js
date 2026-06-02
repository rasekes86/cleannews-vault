// CleanNews Vault v5.0 - Background Service Worker
// Side Panel opener, on-demand script injection, badge management,
// batch extract, tab management, snippet saving, game review search.

// ── Import utility modules ──────────────────────────────
try {
  importScripts(
    'utils/db.js',
    'utils/storage.js',
    'utils/snippets.js',
    'utils/game-reviews.js'
  );
} catch (e) {
  console.warn('[CleanNews Vault] No se pudieron importar utilidades:', e);
}

// ── Constants ──────────────────────────────────────────────
var BADGE_COLOR = '#059669';

// ── Badge Management ───────────────────────────────────────

function updateBadge(count) {
  var text = count > 999 ? '\u221E' : count > 0 ? String(count) : '';
  chrome.action.setBadgeText({ text: text });
  chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
}

function refreshBadge() {
  if (typeof CleanNewsDB !== 'undefined') {
    CleanNewsDB.init()
      .then(function () { return CleanNewsDB.count('articles'); })
      .then(function (count) { updateBadge(count); })
      .catch(function () { updateBadge(0); });
  } else {
    chrome.storage.local.get(['badge_count'], function (data) {
      updateBadge(data.badge_count || 0);
    });
  }
}

// ═══════════════════════════════════════════════════════════
// CONTEXT MENUS
// ═══════════════════════════════════════════════════════════

function createContextMenus() {
  chrome.contextMenus.create({
    id: 'extract-page',
    title: 'Extraer con CleanNews Vault',
    contexts: ['page']
  });
  chrome.contextMenus.create({
    id: 'extract-link',
    title: 'Extraer enlace con CleanNews Vault',
    contexts: ['link']
  });
  chrome.contextMenus.create({
    id: 'save-selection',
    title: 'Guardar fragmento seleccionado',
    contexts: ['selection']
  });
}

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === 'extract-page') {
    chrome.sidePanel.open({ tabId: tab.id }).catch(function () {});
  } else if (info.menuItemId === 'extract-link' && info.linkUrl) {
    chrome.tabs.create({ url: info.linkUrl });
  } else if (info.menuItemId === 'save-selection' && info.selectionText) {
    // Save selected text as a snippet
    if (typeof CleanNewsSnippets !== 'undefined') {
      CleanNewsDB.init().then(function () {
        return CleanNewsSnippets.save({
          text: info.selectionText,
          sourceUrl: tab && tab.url ? tab.url : '',
          sourceTitle: tab && tab.title ? tab.title : '',
          tags: []
        });
      }).then(function (result) {
        if (result && result.success) {
          updateBadge(CleanNewsDB.count('articles'));
        }
      }).catch(function (err) {
        console.error('[CleanNews Vault] Error guardando fragmento:', err);
      });
    }
  }
});

// ═══════════════════════════════════════════════════════════
// ACTION CLICK → OPEN SIDE PANEL
// ═══════════════════════════════════════════════════════════

chrome.action.onClicked.addListener(function (tab) {
  chrome.sidePanel.open({ tabId: tab.id }).catch(function () {});
});

// ═══════════════════════════════════════════════════════════
// KEYBOARD COMMANDS
// ═══════════════════════════════════════════════════════════

chrome.commands.onCommand.addListener(function (command) {
  switch (command) {
    case 'save-current-page': {
      // Extract and save the active tab
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (!tabs || tabs.length === 0) return;
        var tab = tabs[0];
        if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) return;

        // Inject readability and extract
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/readability.js']
        }).then(function () {
          return chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: function () {
              try {
                if (typeof CleanNewsReadability === 'undefined') {
                  return { success: false, error: 'CleanNewsReadability no disponible' };
                }
                var reader = new CleanNewsReadability();
                return { success: true, data: reader.parse() };
              } catch (err) {
                return { success: false, error: err.message };
              }
            }
          });
        }).then(function (injectionResults) {
          if (injectionResults && injectionResults.length > 0 && injectionResults[0].result && injectionResults[0].result.success) {
            var articleData = injectionResults[0].result.data;
            if (typeof CleanNewsStorage !== 'undefined') {
              CleanNewsStorage.saveArticle(articleData).then(function (result) {
                if (result.success) {
                  refreshBadge();
                }
              });
            }
          }
        }).catch(function (err) {
          console.error('[CleanNews Vault] Alt+S save error:', err);
        });
      });
      break;
    }

    case 'toggle-favorite': {
      // Toggle favorite of the active tab's saved article (match by URL)
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (!tabs || tabs.length === 0) return;
        var tab = tabs[0];
        if (!tab.url) return;

        if (typeof CleanNewsStorage !== 'undefined') {
          CleanNewsDB.init().then(function () {
            return CleanNewsStorage.getArticles();
          }).then(function (articles) {
            var article = articles.find(function (a) {
              return a.sourceUrl === tab.url;
            });
            if (article) {
              return CleanNewsStorage.toggleFavorite(article.id);
            }
            return null;
          }).then(function (result) {
            // Favorite toggled (or not found)
          }).catch(function (err) {
            console.error('[CleanNews Vault] Alt+F favorite error:', err);
          });
        }
      });
      break;
    }

    case 'next-in-queue': {
      // Open the first unread article
      if (typeof CleanNewsStorage !== 'undefined') {
        CleanNewsDB.init().then(function () {
          return CleanNewsStorage.filterArticles({
            readStatus: 'unread',
            sortBy: 'date',
            sortDir: 'asc'
          });
        }).then(function (articles) {
          if (articles && articles.length > 0) {
            var article = articles[0];
            chrome.tabs.create({
              url: chrome.runtime.getURL('reader/reader.html?id=' + article.id)
            });
          }
        }).catch(function (err) {
          console.error('[CleanNews Vault] Alt+N next-in-queue error:', err);
        });
      }
      break;
    }
  }
});

// ═══════════════════════════════════════════════════════════
// MESSAGE HANDLER (from side panel)
// ═══════════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  switch (message.type) {

    // ── On-demand extraction via scripting API ─────────────
    case 'EXTRACT_PAGE': {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (!tabs || tabs.length === 0) {
          sendResponse({ success: false, error: 'No hay pestaña activa' });
          return;
        }

        var tab = tabs[0];

        if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) {
          sendResponse({ success: false, error: 'No se puede extraer de esta página' });
          return;
        }

        // Step 1: Inject readability.js first
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/readability.js']
        }).then(function () {
          // Step 2: Inject bridge function that calls CleanNewsReadability().parse()
          return chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: function () {
              try {
                if (typeof CleanNewsReadability === 'undefined') {
                  return { success: false, error: 'CleanNewsReadability no disponible' };
                }
                var reader = new CleanNewsReadability();
                var result = reader.parse();
                return { success: true, data: result };
              } catch (err) {
                return { success: false, error: err.message || 'Error en extracción' };
              }
            }
          });
        }).then(function (injectionResults) {
          if (injectionResults && injectionResults.length > 0) {
            var result = injectionResults[0].result;
            sendResponse(result);
          } else {
            sendResponse({ success: false, error: 'No se pudo ejecutar la extracción' });
          }
        }).catch(function (err) {
          sendResponse({ success: false, error: err.message || 'Error al inyectar script' });
        });
      });

      return true; // async response
    }

    // ── Batch extract: extract all tabs in current window ───
    case 'BATCH_EXTRACT': {
      chrome.tabs.query({ currentWindow: true }, function (tabs) {
        if (!tabs || tabs.length === 0) {
          sendResponse({ success: true, results: [] });
          return;
        }

        var extractable = tabs.filter(function (t) {
          return t.url && !t.url.startsWith('chrome://') &&
            !t.url.startsWith('chrome-extension://') &&
            !t.url.startsWith('about:') &&
            !t.url.startsWith('chrome-search://');
        });

        if (extractable.length === 0) {
          sendResponse({ success: true, results: [] });
          return;
        }

        var results = [];
        var completed = 0;

        function processTab(tabObj) {
          // Step 1: Inject readability.js
          chrome.scripting.executeScript({
            target: { tabId: tabObj.id },
            files: ['content/readability.js']
          }).then(function () {
            // Step 2: Extract content
            return chrome.scripting.executeScript({
              target: { tabId: tabObj.id },
              func: function () {
                try {
                  if (typeof CleanNewsReadability === 'undefined') {
                    return { success: false, error: 'CleanNewsReadability no disponible' };
                  }
                  var reader = new CleanNewsReadability();
                  return { success: true, data: reader.parse() };
                } catch (err) {
                  return { success: false, error: err.message };
                }
              }
            });
          }).then(function (injectionResults) {
            if (injectionResults && injectionResults.length > 0) {
              var res = injectionResults[0].result;
              results.push({
                tabId: tabObj.id,
                url: tabObj.url,
                title: tabObj.title,
                success: res && res.success,
                data: res && res.success ? res.data : null,
                error: res && res.error ? res.error : null
              });
            } else {
              results.push({
                tabId: tabObj.id,
                url: tabObj.url,
                title: tabObj.title,
                success: false,
                error: 'No se pudo ejecutar la extracción'
              });
            }
            completed++;
            if (completed === extractable.length) {
              sendResponse({ success: true, results: results });
            }
          }).catch(function (err) {
            results.push({
              tabId: tabObj.id,
              url: tabObj.url,
              title: tabObj.title,
              success: false,
              error: err.message || 'Error al inyectar script'
            });
            completed++;
            if (completed === extractable.length) {
              sendResponse({ success: true, results: results });
            }
          });
        }

        // Process each tab sequentially to avoid race conditions
        extractable.forEach(function (t) {
          processTab(t);
        });
      });

      return true; // async response
    }

    // ── Get all tabs in current window ───────────────────────
    case 'GET_ALL_TABS': {
      chrome.tabs.query({ currentWindow: true }, function (tabs) {
        if (!tabs) {
          sendResponse({ success: true, tabs: [] });
          return;
        }
        var tabList = tabs.map(function (t) {
          return {
            id: t.id,
            url: t.url || '',
            title: t.title || ''
          };
        });
        sendResponse({ success: true, tabs: tabList });
      });
      return true;
    }

    // ── Save text snippet ───────────────────────────────────
    case 'SAVE_TEXT_SNIPPET': {
      if (typeof CleanNewsSnippets !== 'undefined') {
        CleanNewsDB.init().then(function () {
          return CleanNewsSnippets.save(message.snippet || {});
        }).then(function (result) {
          sendResponse(result);
        }).catch(function (err) {
          sendResponse({ success: false, error: err.message });
        });
      } else {
        sendResponse({ success: false, error: 'CleanNewsSnippets no disponible' });
      }
      return true; // async
    }

    // ── Search game reviews (real DuckDuckGo HTML search) ───
    case 'SEARCH_GAME_REVIEWS': {
      if (typeof CleanNewsGameReviews !== 'undefined') {
        CleanNewsGameReviews.searchReviews(message.query || '')
          .then(function (reviews) {
            sendResponse({ success: true, reviews: reviews, query: message.query });
          })
          .catch(function (err) {
            sendResponse({ success: false, error: err.message });
          });
      } else {
        sendResponse({ success: false, error: 'CleanNewsGameReviews no disponible' });
      }
      return true; // async
    }

    // ── Article saved/updated — refresh badge ──────────────
    case 'ARTICLE_SAVED':
    case 'ARTICLE_DELETED':
      refreshBadge();
      sendResponse({ success: true });
      break;

    // ── Open library in new tab ────────────────────────────
    case 'OPEN_LIBRARY':
      chrome.tabs.create({ url: chrome.runtime.getURL('library/library.html') });
      sendResponse({ success: true });
      break;

    // ── Open reader for specific article ───────────────────
    case 'OPEN_READER':
      if (message.articleId) {
        chrome.tabs.create({
          url: chrome.runtime.getURL('reader/reader.html?id=' + message.articleId)
        });
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'ID de artículo no proporcionado' });
      }
      break;

    // ── Get badge count ────────────────────────────────────
    case 'GET_BADGE_COUNT':
      if (typeof CleanNewsDB !== 'undefined') {
        CleanNewsDB.init()
          .then(function () { return CleanNewsDB.count('articles'); })
          .then(function (count) { sendResponse({ count: count }); })
          .catch(function () { sendResponse({ count: 0 }); });
        return true; // async
      } else {
        chrome.storage.local.get(['badge_count'], function (data) {
          sendResponse({ count: data.badge_count || 0 });
        });
        return true;
      }

    default:
      sendResponse({ error: 'Mensaje desconocido: ' + message.type });
      break;
  }
});

// ═══════════════════════════════════════════════════════════
// INSTALL / UPDATE
// ═══════════════════════════════════════════════════════════

chrome.runtime.onInstalled.addListener(function (details) {
  // Set side panel as the action behavior
  chrome.sidePanel.setOptions({
    enabled: true,
    path: 'sidepanel/sidepanel.html'
  }).catch(function () {});

  if (details.reason === 'install') {
    console.log('[CleanNews Vault] v5.1.0 instalado');
    createContextMenus();
    refreshBadge();
  }

  if (details.reason === 'update') {
    console.log('[CleanNews Vault] Actualizado a v5.1.0 (antes: ' + details.previousVersion + ')');
    chrome.contextMenus.removeAll(function () {
      createContextMenus();
    });
    refreshBadge();
  }
});
