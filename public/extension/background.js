// CleanNews Vault v4.0 - Background Service Worker
// Side Panel opener, on-demand script injection, badge management.

// ── Import utility modules ──────────────────────────────
try {
  importScripts('utils/db.js', 'utils/storage.js');
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
}

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === 'extract-page') {
    // Open side panel (it will get active tab info on its own)
    chrome.sidePanel.open({ tabId: tab.id }).catch(function () {});
  } else if (info.menuItemId === 'extract-link' && info.linkUrl) {
    chrome.tabs.create({ url: info.linkUrl });
  }
});

// ═══════════════════════════════════════════════════════════
// ACTION CLICK → OPEN SIDE PANEL
// ═══════════════════════════════════════════════════════════

chrome.action.onClicked.addListener(function (tab) {
  // Open side panel for the current window
  chrome.sidePanel.open({ tabId: tab.id }).catch(function () {});
});

// ═══════════════════════════════════════════════════════════
// MESSAGE HANDLER (from side panel)
// ═══════════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  switch (message.type) {

    // ── On-demand extraction via scripting API ─────────────
    case 'EXTRACT_PAGE': {
      // Get the active tab
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (!tabs || tabs.length === 0) {
          sendResponse({ success: false, error: 'No hay pestaña activa' });
          return;
        }

        var tab = tabs[0];

        // Cannot inject into chrome:// or other restricted pages
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
    console.log('[CleanNews Vault] v4.0.0 instalado');
    createContextMenus();
    refreshBadge();
  }

  if (details.reason === 'update') {
    console.log('[CleanNews Vault] Actualizado a v4.0.0 (antes: ' + details.previousVersion + ')');
    chrome.contextMenus.removeAll(function () {
      createContextMenus();
    });
    refreshBadge();
  }
});
