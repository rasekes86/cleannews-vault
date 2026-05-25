// CleanNews Vault - Background Service Worker
// Maneja la comunicación entre popup, content scripts y otras partes de la extensión

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'EXTRACT_CONTENT':
      // Relay: popup solicita extracción al content script de la pestaña activa
      handleExtractContent(message, sender, sendResponse);
      return true; // Mantener canal abierto para respuesta async

    case 'EXTRACT_RESULT':
      // Content script envía el resultado - lo reenviamos al popup
      chrome.runtime.sendMessage(message).catch(() => {
        // El popup podría no estar abierto
      });
      break;

    case 'GET_ACTIVE_TAB':
      // Obtener la pestaña activa
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
          sendResponse({ success: true, tab: tabs[0] });
        } else {
          sendResponse({ success: false, error: 'No se encontró pestaña activa' });
        }
      });
      return true;

    case 'OPEN_LIBRARY':
      chrome.tabs.create({ url: chrome.runtime.getURL('library/library.html') });
      sendResponse({ success: true });
      break;

    case 'OPEN_READER':
      if (message.articleId) {
        chrome.tabs.create({
          url: chrome.runtime.getURL(`reader/reader.html?id=${message.articleId}`)
        });
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'ID de artículo no proporcionado' });
      }
      break;

    default:
      sendResponse({ error: `Mensaje desconocido: ${message.type}` });
      break;
  }
});

// Enviar mensaje de extracción al content script de la pestaña activa
function handleExtractContent(message, sender, sendResponse) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) {
      sendResponse({ success: false, error: 'No se encontró pestaña activa' });
      return;
    }

    const activeTab = tabs[0];

    chrome.tabs.sendMessage(activeTab.id, { type: 'EXTRACT' }, (response) => {
      if (chrome.runtime.lastError) {
        sendResponse({
          success: false,
          error: 'No se pudo conectar con la página. Intenta recargar la página y volver a intentar.'
        });
      } else {
        sendResponse(response);
      }
    });
  });
}

// Manejar instalación
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.set({ cleannews_vault_articles: [] });
    console.log('CleanNews Vault instalado correctamente');
  }
});
