// CleanNews Vault v5.3 - Article Extractor (Service Worker Compatible)
// Fetches HTML from URL and extracts article content using DOMParser.
// Works in background service worker without needing tab injection.

var CleanNewsExtractor = (function () {
  'use strict';

  // ── Positive content selectors ─────────────────────────────
  var CONTENT_SELECTORS = [
    'article', 'main', '[role="main"]',
    '.article-body', '.article-content', '.post-content',
    '.entry-content', '.story-body', '.news-content',
    '.main-content', '.page-content', '.content-body',
    '.article__body', '.post__body', '.article__content',
    '.rich-text', '.text-content', '.prose',
    '.longform', '.reading', '.article-text',
    '.post-text', '.content-body', '.story-content',
    '.article__text', '.article__main',
    '#article-body', '#article-content', '#main-content',
    '#content', '#story-body'
  ];

  // ── Negative patterns ────────────────────────────────────
  var NEGATIVE_CLASS = [
    'comment', 'comments', 'sidebar', 'widget', 'ad', 'ads',
    'social', 'share', 'footer', 'nav', 'menu', 'header',
    'promo', 'banner', 'sponsor', 'popup', 'modal', 'related',
    'recommended', 'newsletter', 'subscribe', 'cookie', 'consent',
    'breadcrumb', 'pager', 'pagination', 'toolbar', 'rating'
  ];

  // ── Tags to strip completely ─────────────────────────────
  var STRIP_TAGS = [
    'script', 'style', 'noscript', 'iframe', 'object', 'embed',
    'svg', 'canvas', 'video', 'audio', 'form', 'input',
    'textarea', 'select', 'button', 'nav', 'header', 'footer',
    'aside'
  ];

  // ── Preserved tags for HTML output ────────────────────────
  var KEEP_TAGS = new Set([
    'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'strong', 'b', 'em', 'i', 'a', 'blockquote', 'ul', 'ol', 'li',
    'hr', 'br', 'img', 'figure', 'figcaption',
    'sup', 'sub', 'pre', 'code', 'small', 'mark', 'del', 'ins',
    'time', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
  ]);

  // ── Helpers ───────────────────────────────────────────────

  function _hasNegativeClass(el) {
    var cls = (el.className || '').toLowerCase();
    var id = (el.id || '').toLowerCase();
    var combined = cls + ' ' + id;
    for (var i = 0; i < NEGATIVE_CLASS.length; i++) {
      if (combined.indexOf(NEGATIVE_CLASS[i]) !== -1) return true;
    }
    return false;
  }

  function _textContent(el) {
    if (!el) return '';
    var text = '';
    for (var i = 0; i < el.childNodes.length; i++) {
      var node = el.childNodes[i];
      if (node.nodeType === 3) { // Text node
        text += node.textContent || '';
      } else if (node.nodeType === 1) { // Element node
        var tag = node.tagName.toLowerCase();
        if (tag === 'br') text += '\n';
        else if (tag === 'p' || tag === 'div' || tag === 'h1' || tag === 'h2' ||
                 tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6' ||
                 tag === 'li' || tag === 'tr' || tag === 'blockquote') {
          var inner = _textContent(node);
          if (inner) text += inner + '\n';
        } else {
          text += _textContent(node);
        }
      }
    }
    return text;
  }

  function _cleanHtml(el) {
    if (!el) return '';
    var html = '';
    for (var i = 0; i < el.childNodes.length; i++) {
      var node = el.childNodes[i];
      if (node.nodeType === 3) { // Text node
        var t = (node.textContent || '').trim();
        if (t) html += t + ' ';
      } else if (node.nodeType === 1) { // Element node
        var tag = node.tagName.toLowerCase();
        if (!KEEP_TAGS.has(tag)) {
          html += _cleanHtml(node);
          continue;
        }
        if (_hasNegativeClass(node)) continue;

        // Clean attributes
        var attrs = '';
        if (tag === 'a') {
          var href = node.getAttribute('href');
          if (href) attrs = ' href="' + _escAttr(href) + '" rel="noopener noreferrer"';
        } else if (tag === 'img') {
          var src = node.getAttribute('src');
          var alt = node.getAttribute('alt') || '';
          if (src) attrs = ' src="' + _escAttr(src) + '" alt="' + _escAttr(alt) + '"';
        }

        var inner = _cleanHtml(node);
        if (tag === 'br') {
          html += '<br>';
        } else if (tag === 'img') {
          html += '<img' + attrs + '>';
        } else if (tag === 'hr') {
          html += '<hr>';
        } else if (inner.trim()) {
          html += '<' + tag + attrs + '>' + inner + '</' + tag + '>';
        }
      }
    }
    return html;
  }

  function _escAttr(s) {
    if (!s) return '';
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function _stripTags(html) {
    if (!html) return '';
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  function _getDomain(url) {
    if (!url) return '';
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
  }

  function _cleanTitle(title, siteName) {
    if (!title) return '';
    // Remove site name suffix patterns
    var cleaned = title.replace(/\s*[|–—-]\s*[^|–—-]+$/, function (match) {
      var suffix = match.replace(/^\s*[|–—-]\s*/, '').trim().toLowerCase();
      if (siteName && suffix.indexOf(siteName) !== -1) return '';
      if (suffix.split(/\s+/).length <= 5) return '';
      return match;
    });
    return (cleaned || title).trim();
  }

  // ── Main extraction logic ────────────────────────────────

  function _findContentElement(doc) {
    // Try selectors in order of preference
    for (var i = 0; i < CONTENT_SELECTORS.length; i++) {
      var el = doc.querySelector(CONTENT_SELECTORS[i]);
      if (el && !_hasNegativeClass(el)) {
        var textLen = _textContent(el).trim().length;
        if (textLen > 200) return el;
      }
    }

    // Fallback: find the element with the most text content
    var candidates = doc.querySelectorAll('div, section, main');
    var best = null;
    var bestScore = 0;
    for (var j = 0; j < candidates.length; j++) {
      var c = candidates[j];
      if (_hasNegativeClass(c)) continue;
      var len = _textContent(c).trim().length;
      var score = len;
      // Bonus for having paragraphs
      var ps = c.querySelectorAll('p');
      score += ps.length * 50;
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    return best || doc.body;
  }

  // ── Metadata extraction ─────────────────────────────────

  function _extractMetadata(doc, url) {
    var meta = {};

    // Title
    var ogTitle = doc.querySelector('meta[property="og:title"]');
    meta.title = ogTitle ? (ogTitle.getAttribute('content') || '').trim() : '';
    if (!meta.title) {
      var titleEl = doc.querySelector('title');
      meta.title = titleEl ? titleEl.textContent.trim() : '';
    }
    var siteName = _getDomain(url);
    meta.title = _cleanTitle(meta.title, siteName) || meta.title;

    // Author
    var authorMeta = doc.querySelector('meta[name="author"]') ||
                     doc.querySelector('meta[property="article:author"]') ||
                     doc.querySelector('meta[name="byl"]') ||
                     doc.querySelector('[rel="author"]');
    meta.author = authorMeta ? (authorMeta.getAttribute('content') || authorMeta.textContent || '').trim() : '';

    // Description
    var descMeta = doc.querySelector('meta[name="description"]') ||
                    doc.querySelector('meta[property="og:description"]') ||
                    doc.querySelector('meta[name="excerpt"]');
    meta.description = descMeta ? (descMeta.getAttribute('content') || '').trim() : '';

    // Published date
    var dateMeta = doc.querySelector('meta[property="article:published_time"]') ||
                   doc.querySelector('meta[name="date"]') ||
                   doc.querySelector('meta[name="publish-date"]') ||
                   doc.querySelector('time[datetime]');
    meta.publishedAt = dateMeta ?
      (dateMeta.getAttribute('content') || dateMeta.getAttribute('datetime') || '').trim() : '';

    // Featured image
    var imgMeta = doc.querySelector('meta[property="og:image"]') ||
                   doc.querySelector('meta[name="image"]') ||
                   doc.querySelector('meta[name="twitter:image"]');
    meta.featuredImage = imgMeta ? (imgMeta.getAttribute('content') || '').trim() : '';

    // Try from content if no og:image
    if (!meta.featuredImage) {
      var contentEl = doc.querySelector('article') || doc.querySelector('main');
      if (contentEl) {
        var firstImg = contentEl.querySelector('img');
        if (firstImg) {
          meta.featuredImage = firstImg.getAttribute('src') || firstImg.getAttribute('data-src') || '';
        }
      }
    }

    // Source
    meta.source = siteName;
    meta.sourceUrl = url;

    return meta;
  }

  // ── Public API ────────────────────────────────────────────

  return {

    /**
     * Extract article data from raw HTML string.
     * @param {string} html - Raw HTML content
     * @param {string} url - The URL the HTML was fetched from
     * @returns {object|null} Article data object or null on failure
     */
    parseHtml: function (html, url) {
      if (!html || !url) return null;

      try {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');

        // If DOMParser failed, return null
        if (!doc || !doc.body) return null;

        // Extract metadata
        var meta = _extractMetadata(doc, url);

        // Find content element
        var contentEl = _findContentElement(doc);

        // Extract text
        var contentText = _textContent(contentEl).replace(/\n{3,}/g, '\n\n').trim();

        // Extract clean HTML
        var contentHtml = _cleanHtml(contentEl);

        // Clean up the text content
        contentText = contentText.replace(/\n\s*\n/g, '\n\n').trim();

        // Excerpt
        var excerpt = meta.description || '';
        if (!excerpt && contentText) {
          excerpt = contentText.substring(0, 300).replace(/\n/g, ' ').trim();
          if (contentText.length > 300) excerpt += '...';
        }

        // Stats
        var words = contentText.split(/\s+/).filter(function (w) { return w.length > 0; });
        var wordCount = words.length;
        var readTime = Math.max(1, Math.ceil(wordCount / 200));

        return {
          title: meta.title || 'Sin título',
          author: meta.author || '',
          source: meta.source,
          sourceUrl: url,
          contentHtml: contentHtml,
          contentText: contentText,
          excerpt: excerpt,
          featuredImage: meta.featuredImage,
          publishedAt: meta.publishedAt,
          wordCount: wordCount,
          readTime: readTime
        };
      } catch (err) {
        console.error('[CleanNewsExtractor] parseHtml error:', err);
        return null;
      }
    },

    /**
     * Fetch a URL and extract article content.
     * @param {string} url - URL to fetch
     * @returns {Promise<object|null>} Article data or null
     */
    fetchAndExtract: async function (url) {
      if (!url || !url.startsWith('http')) return null;

      try {
        var resp = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
          }
        });

        if (!resp.ok) return null;

        var html = await resp.text();
        if (!html || html.length < 200) return null;

        return this.parseHtml(html, url);
      } catch (err) {
        console.error('[CleanNewsExtractor] fetchAndExtract error:', err);
        return null;
      }
    }
  };
})();

// Export globally
if (typeof self !== 'undefined') { self.CleanNewsExtractor = CleanNewsExtractor; }
if (typeof window !== 'undefined') { window.CleanNewsExtractor = CleanNewsExtractor; }
