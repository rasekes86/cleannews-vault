// CleanNews Vault v5.0 - Utility Tools
// All-in-one utility toolkit: password gen, JSON format, QR, color, word count, base converter

const CleanNewsTools = (() => {
  'use strict';

  // ═══════════════════════════════════════════════════════════════
  // PASSWORD GENERATOR
  // ═══════════════════════════════════════════════════════════════

  const AMBIGUOUS_CHARS = 'Il1O0o';

  function _generatePassword(options) {
    const opts = {
      length: options && typeof options.length === 'number' ? options.length : 16,
      uppercase: options && options.uppercase !== undefined ? options.uppercase : true,
      lowercase: options && options.lowercase !== undefined ? options.lowercase : true,
      numbers: options && options.numbers !== undefined ? options.numbers : true,
      symbols: options && options.symbols !== undefined ? options.symbols : true,
      excludeAmbiguous: options && options.excludeAmbiguous !== undefined ? options.excludeAmbiguous : false
    };

    let charset = '';
    if (opts.uppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (opts.lowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (opts.numbers) charset += '0123456789';
    if (opts.symbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (!charset) charset = 'abcdefghijklmnopqrstuvwxyz';

    if (opts.excludeAmbiguous) {
      charset = charset.split('').filter((c) => !AMBIGUOUS_CHARS.includes(c)).join('');
    }

    const length = Math.max(4, Math.min(128, opts.length));
    let password = '';
    const array = new Uint32Array(length);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
      for (let i = 0; i < length; i++) {
        password += charset[array[i] % charset.length];
      }
    } else {
      for (let i = 0; i < length; i++) {
        password += charset[Math.floor(Math.random() * charset.length)];
      }
    }

    return password;
  }

  // ═══════════════════════════════════════════════════════════════
  // JSON FORMATTER
  // ═══════════════════════════════════════════════════════════════

  function _formatJson(input) {
    try {
      const parsed = JSON.parse(input);
      const formatted = JSON.stringify(parsed, null, 2);
      const lines = formatted.split('\n');
      return { formatted, error: null, lineCount: lines.length };
    } catch (err) {
      return { formatted: null, error: err.message, lineCount: 0 };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // QR CODE GENERATOR (visual hash pattern — deterministic from text)
  // Generates a canvas-based QR-like pattern from text hash.
  // ═══════════════════════════════════════════════════════════════

  function _simpleHash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
    }
    return hash;
  }

  function _generateQR(text) {
    const size = 21;
    const cellSize = 8;
    const canvasSize = size * cellSize + cellSize * 2;

    const canvas = document.createElement('canvas');
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Generate deterministic pattern from text hash
    const matrix = [];
    for (let row = 0; row < size; row++) {
      matrix[row] = [];
      for (let col = 0; col < size; col++) {
        const hashInput = text + ':' + row + ':' + col;
        const h = _simpleHash(hashInput);
        matrix[row][col] = (h % 3 !== 0); // ~66% fill rate
      }
    }

    // Draw finder patterns (top-left, top-right, bottom-left) — 7x7
    function drawFinderPattern(startRow, startCol) {
      // Outer border
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
            matrix[startRow + r][startCol + c] = true;
          } else {
            matrix[startRow + r][startCol + c] = false;
          }
        }
      }
    }

    drawFinderPattern(0, 0);
    drawFinderPattern(0, size - 7);
    drawFinderPattern(size - 7, 0);

    // Draw the matrix
    ctx.fillStyle = '#1a1a1a';
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (matrix[row][col]) {
          ctx.fillRect(
            col * cellSize + cellSize,
            row * cellSize + cellSize,
            cellSize,
            cellSize
          );
        }
      }
    }

    return canvas.toDataURL('image/png');
  }

  // ═══════════════════════════════════════════════════════════════
  // COLOR PICKER FROM HEX
  // ═══════════════════════════════════════════════════════════════

  function _pickColorFromHex(hex) {
    // Normalize hex
    let h = hex.replace('#', '');
    if (h.length === 3) {
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }

    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);

    // RGB to HSL conversion
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;

    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    const l = (max + min) / 2;
    let hslH = 0;
    let hslS = 0;

    if (max !== min) {
      const d = max - min;
      hslS = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case rNorm: hslH = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6; break;
        case gNorm: hslH = ((bNorm - rNorm) / d + 2) / 6; break;
        case bNorm: hslH = ((rNorm - gNorm) / d + 4) / 6; break;
      }
    }

    const hsl = {
      h: Math.round(hslH * 360),
      s: Math.round(hslS * 100),
      l: Math.round(l * 100)
    };

    // Relative luminance (for contrast ratio)
    const sR = rNorm <= 0.03928 ? rNorm / 12.92 : Math.pow((rNorm + 0.055) / 1.055, 2.4);
    const sG = gNorm <= 0.03928 ? gNorm / 12.92 : Math.pow((gNorm + 0.055) / 1.055, 2.4);
    const sB = bNorm <= 0.03928 ? bNorm / 12.92 : Math.pow((bNorm + 0.055) / 1.055, 2.4);
    const luminance = 0.2126 * sR + 0.7152 * sG + 0.0722 * sB;

    const contrastWhite = (1 + 0.05) / (luminance + 0.05);
    const contrastBlack = (luminance + 0.05) / (0 + 0.05);
    const contrastRatio = Math.round(Math.max(contrastWhite, contrastBlack) * 100) / 100;

    return {
      hex: '#' + h.toUpperCase(),
      rgb: { r, g, b },
      hsl,
      contrastRatio
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // WORD / TEXT COUNTER
  // ═══════════════════════════════════════════════════════════════

  function _countWords(text) {
    if (!text || !text.trim()) {
      return { words: 0, characters: 0, sentences: 0, paragraphs: 0, readingTime: 0 };
    }

    const trimmed = text.trim();
    const characters = trimmed.length;
    const words = trimmed.split(/\s+/).filter(Boolean).length;

    // Sentences: split by . ! ? followed by space or end
    const sentenceMatches = trimmed.match(/[^.!?]*[.!?]+/g);
    const sentences = sentenceMatches ? sentenceMatches.length : (words > 0 ? 1 : 0);

    // Paragraphs: non-empty lines
    const paragraphs = trimmed.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length;

    // Average reading speed: 200 words per minute
    const readingTime = Math.max(1, Math.ceil(words / 200));

    return { words, characters, sentences, paragraphs, readingTime };
  }

  // ═══════════════════════════════════════════════════════════════
  // BASE CONVERTER
  // ═══════════════════════════════════════════════════════════════

  function _convertBase(number, fromBase, toBase) {
    fromBase = Math.max(2, Math.min(36, parseInt(fromBase) || 10));
    toBase = Math.max(2, Math.min(36, parseInt(toBase) || 10));

    // Convert input to decimal
    let decimal;
    if (typeof number === 'number') {
      decimal = number;
    } else {
      const str = String(number).trim().toLowerCase();
      decimal = parseInt(str, fromBase);
    }

    if (isNaN(decimal)) return 'NaN';

    // Convert decimal to target base
    return decimal.toString(toBase).toUpperCase();
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════

  return {
    generatePassword: _generatePassword,
    formatJson: _formatJson,
    generateQR: _generateQR,
    pickColorFromHex: _pickColorFromHex,
    countWords: _countWords,
    convertBase: _convertBase
  };
})();

// Export globally
if (typeof window !== 'undefined') {
  window.CleanNewsTools = CleanNewsTools;
}
