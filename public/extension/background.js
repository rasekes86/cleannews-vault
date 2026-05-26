// CleanNews Vault v3.0 - Background Service Worker
// Context menus, keyboard commands, badge, message relay.

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
    // Send toggle message to content script - it will handle extraction
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR' }).catch(function () {});
  } else if (info.menuItemId === 'extract-link' && info.linkUrl) {
    chrome.tabs.create({ url: info.linkUrl });
  }
});

// ═══════════════════════════════════════════════════════════
// KEYBOARD COMMANDS
// ═══════════════════════════════════════════════════════════

chrome.commands.onCommand.addListener(function (command) {
  if (command === 'toggle-sidebar') {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE_SIDEBAR' }).catch(function () {});
      }
    });
  }
});

// ═══════════════════════════════════════════════════════════
// MESSAGE HANDLER (from popup, content scripts)
// ═══════════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  switch (message.type) {

    // Content script says sidebar is ready
    case 'SIDEBAR_READY':
      refreshBadge();
      sendResponse({ success: true });
      break;

    // Article saved/updated - refresh badge
    case 'ARTICLE_SAVED':
    case 'ARTICLE_DELETED':
      refreshBadge();
      sendResponse({ success: true });
      break;

    // Open library in new tab
    case 'OPEN_LIBRARY':
      chrome.tabs.create({ url: chrome.runtime.getURL('library/library.html') });
      sendResponse({ success: true });
      break;

    // Open reader for specific article
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

    // Get badge count
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
  if (details.reason === 'install') {
    console.log('[CleanNews Vault] v3.0.0 instalado');
    createContextMenus();
    refreshBadge();
  }

  if (details.reason === 'update') {
    console.log('[CleanNews Vault] Actualizado a v3.0.0 (antes: ' + details.previousVersion + ')');
    chrome.contextMenus.removeAll(function () {
      createContextMenus();
    });
    refreshBadge();
  }
});
