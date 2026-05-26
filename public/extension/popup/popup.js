// CleanNews Vault v3.0 - Popup Logic (simplified)

(function() {
  'use strict';

  const btnToggle = document.getElementById('btn-toggle');
  const btnLibrary = document.getElementById('btn-library');
  const btnExtract = document.getElementById('btn-extract');

  // Toggle sidebar
  btnToggle.addEventListener('click', function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE_SIDEBAR' }).catch(function() {});
        window.close();
      }
    });
  });

  // Open library
  btnLibrary.addEventListener('click', function() {
    chrome.tabs.create({ url: chrome.runtime.getURL('library/library.html') });
    window.close();
  });

  // Extract (close popup and tell content script to open sidebar & extract)
  btnExtract.addEventListener('click', function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'EXTRACT_AND_SAVE' }).catch(function() {});
        window.close();
      }
    });
  });
})();
