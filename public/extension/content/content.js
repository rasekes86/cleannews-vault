// CleanNews Vault v2.0 - Content Script
// Inyectado programáticamente cuando se necesita la extracción.
// Escucha mensajes del background y ejecuta la extracción usando readability.js.

// Guard: evitar registrar el listener múltiples veces por re-inyección
if (!window.__cleanNewsContentScriptLoaded) {
  window.__cleanNewsContentScriptLoaded = true;

  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.type === 'EXTRACT') {
      try {
        if (typeof extractArticleContent === 'function') {
          var result = extractArticleContent();
          sendResponse(result);
        } else {
          sendResponse({
            success: false,
            error: 'Módulo de extracción no disponible. Recarga la página.'
          });
        }
      } catch (e) {
        sendResponse({ success: false, error: 'Error: ' + e.message });
      }
      return true; // Mantener canal abierto para respuesta async
    }
  });
}
