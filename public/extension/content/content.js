// CleanNews Vault - Content Script
// Escucha mensajes del popup y ejecuta la extracción

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.type === 'EXTRACT') {
    try {
      // Verificar que la función de extracción está disponible
      if (typeof extractArticleContent === 'function') {
        var result = extractArticleContent();
        sendResponse(result);
      } else {
        sendResponse({
          success: false,
          error: 'El módulo de extracción no está disponible. Intenta recargar la página.'
        });
      }
    } catch (e) {
      sendResponse({
        success: false,
        error: 'Error inesperado: ' + e.message
      });
    }
    return true; // Mantener canal abierto para respuesta async
  }
});
