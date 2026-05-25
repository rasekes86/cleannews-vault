// CleanNews Vault v2.0 - Background Service Worker
// Comunicación central: popup ↔ content scripts ↔ IndexedDB.
// Inyección programática de scripts, menú contextual, badge, comandos.

// ── Import utility modules (IndexedDB + Storage layer) ─────────────
try {
  importScripts('utils/db.js', 'utils/storage.js');
} catch (e) {
  console.warn('[CleanNews Vault] No se pudieron importar utilidades:', e);
}

// ── Constants ──────────────────────────────────────────────────────
var BADGE_COLOR = '#059669';

// ── Utility: can we inject into this tab? ─────────────────────────
function canInject(tab) {
  if (!tab || !tab.url) return false;
  var url = tab.url.toLowerCase();
  var blocked = [
    'chrome://', 'chrome-extension://', 'about:', 'edge://',
    'devtools://', 'javascript:', 'data:', 'blob:', 'brave://',
    'chrome-search://', 'chrome-error://'
  ];
  for (var i = 0; i < blocked.length; i++) {
    if (url.startsWith(blocked[i])) return false;
  }
  return true;
}

// ══════════════════════════════════════════════════════════════════
// BADGE MANAGEMENT
// ══════════════════════════════════════════════════════════════════

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
    // Fallback: read cached count from chrome.storage.local
    chrome.storage.local.get(['badge_count'], function (data) {
      updateBadge(data.badge_count || 0);
    });
  }
}

// ══════════════════════════════════════════════════════════════════
// PROGRAMMATIC CONTENT SCRIPT INJECTION
// ══════════════════════════════════════════════════════════════════

function injectContentScripts(tabId) {
  return chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['content/readability.js', 'content/content.js']
  }).catch(function (err) {
    throw new Error('Error al inyectar scripts: ' + err.message);
  });
}

/**
 * Inject scripts into the active tab and send EXTRACT message.
 * Returns a promise that resolves with the extraction result.
 */
function injectAndExtract(tab) {
  return injectContentScripts(tab.id)
    .then(function () {
      // Brief delay so the content script registers its listener
      return new Promise(function (resolve) { setTimeout(resolve, 100); });
    })
    .then(function () {
      return chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT' });
    });
}

// ══════════════════════════════════════════════════════════════════
// EXTRACT HANDLER (relayed from popup)
// ══════════════════════════════════════════════════════════════════

function handleExtract(sendResponse) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs.length === 0) {
      sendResponse({ success: false, error: 'No se encontró pestaña activa' });
      return;
    }

    var tab = tabs[0];

    if (!canInject(tab)) {
      sendResponse({
        success: false,
        error: 'No se puede extraer contenido de esta página (página interna del navegador).'
      });
      return;
    }

    injectAndExtract(tab)
      .then(function (response) {
        if (chrome.runtime.lastError) {
          sendResponse({
            success: false,
            error: 'No se pudo conectar con la página. Intenta recargar y volver a intentar.'
          });
        } else {
          sendResponse(response);
        }
      })
      .catch(function (err) {
        sendResponse({ success: false, error: err.message });
      });
  });
}

// ══════════════════════════════════════════════════════════════════
// KEYBOARD COMMANDS
// ══════════════════════════════════════════════════════════════════

chrome.commands.onCommand.addListener(function (command) {
  switch (command) {

    case 'extract-article':
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs.length > 0 && canInject(tabs[0])) {
          injectAndExtract(tabs[0]).then(function (result) {
            // If popup is open, it will receive the result separately.
            // Here we just log or ignore.
            if (result && result.success) {
              console.log('[CleanNews Vault] Artículo extraído por comando');
            }
          }).catch(function (err) {
            console.warn('[CleanNews Vault] extract-article error:', err.message);
          });
        } else {
          console.warn('[CleanNews Vault] No se puede extraer de esta pestaña');
        }
      });
      break;

    case 'open-library':
      chrome.tabs.create({ url: chrome.runtime.getURL('library/library.html') });
      break;

    case 'toggle-sidebar':
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs.length > 0) {
          chrome.sidePanel.open({ tabId: tabs[0].id }).catch(function () {
            // sidePanel API no disponible; abrir biblioteca como fallback
            chrome.tabs.create({ url: chrome.runtime.getURL('library/library.html') });
          });
        }
      });
      break;

    default:
      // _execute_action se maneja por defecto (abrir popup)
      break;
  }
});

// ══════════════════════════════════════════════════════════════════
// CONTEXT MENUS
// ══════════════════════════════════════════════════════════════════

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
    id: 'extract-selection',
    title: 'Extraer con CleanNews Vault',
    contexts: ['selection']
  });
}

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  switch (info.menuItemId) {
    case 'extract-page':
    case 'extract-selection':
      if (canInject(tab)) {
        injectAndExtract(tab).catch(function (err) {
          console.warn('[CleanNews Vault] Context menu extract error:', err.message);
        });
      }
      break;

    case 'extract-link':
      if (info.linkUrl) {
        chrome.tabs.create({ url: info.linkUrl });
      }
      break;
  }
});

// ══════════════════════════════════════════════════════════════════
// MESSAGE HANDLER (from popup, content scripts, library pages)
// ══════════════════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  switch (message.type) {

    // ── Extraction relay ──
    case 'EXTRACT':
      handleExtract(sendResponse);
      return true; // async response

    // ── Tab info ──
    case 'GET_ACTIVE_TAB':
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs.length > 0) {
          sendResponse({ success: true, tab: tabs[0] });
        } else {
          sendResponse({ success: false, error: 'No se encontró pestaña activa' });
        }
      });
      return true;

    // ── Navigation ──
    case 'OPEN_LIBRARY':
      chrome.tabs.create({ url: chrome.runtime.getURL('library/library.html') });
      sendResponse({ success: true });
      break;

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

    case 'OPEN_SIDE_PANEL':
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs.length > 0) {
          chrome.sidePanel.open({ tabId: tabs[0].id }).catch(function () {
            chrome.tabs.create({ url: chrome.runtime.getURL('library/library.html') });
          });
        }
        sendResponse({ success: true });
      });
      return true;

    // ── Badge updates ──
    case 'ARTICLE_SAVED':
      refreshBadge();
      sendResponse({ success: true });
      break;

    case 'ARTICLE_DELETED':
      refreshBadge();
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ error: 'Mensaje desconocido: ' + message.type });
      break;
  }
});

// ══════════════════════════════════════════════════════════════════
// INSTALL / UPDATE
// ══════════════════════════════════════════════════════════════════

chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason === 'install') {
    console.log('[CleanNews Vault] v2.0.0 instalado');

    // Create context menus
    createContextMenus();

    // Initialize IndexedDB + migrate legacy data
    if (typeof CleanNewsDB !== 'undefined') {
      CleanNewsDB.init()
        .then(function () {
          console.log('[CleanNews Vault] IndexedDB inicializado');
          if (typeof CleanNewsStorage !== 'undefined' && CleanNewsStorage.migrateFromLegacy) {
            return CleanNewsStorage.migrateFromLegacy();
          }
          return { migrated: 0 };
        })
        .then(function (result) {
          if (result && result.migrated > 0) {
            console.log('[CleanNews Vault] ' + result.migrated + ' artículos migrados desde v1');
          }
          refreshBadge();
        })
        .catch(function (err) {
          console.warn('[CleanNews Vault] Error de inicialización:', err);
          updateBadge(0);
        });
    } else {
      updateBadge(0);
    }
  }

  if (details.reason === 'update') {
    console.log('[CleanNews Vault] Actualizado a v2.0.0 (antes: ' + details.previousVersion + ')');
    // Recreate context menus (they may have changed)
    chrome.contextMenus.removeAll(function () {
      createContextMenus();
    });
    refreshBadge();
  }
});
