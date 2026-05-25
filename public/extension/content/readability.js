// CleanNews Vault v2.0 – Readability Engine
// Extracción limpia de contenido: HTML semántico + texto plano + imagen destacada.

var CleanNewsReadability = (function () {
  'use strict';

  // ── Negative patterns for class/id ─────────────────────────────
  var NEGATIVE_PATTERNS = [
    'comment', 'comments', 'sidebar', 'widget', 'widgets', 'ad', 'ads', 'advert',
    'advertising', 'social', 'share', 'sharing', 'footer', 'nav', 'navigation',
    'menu', 'header', 'promo', 'banner', 'sponsor', 'popup', 'modal', 'overlay',
    'related', 'recommended', 'newsletter', 'subscribe', 'signup', 'login',
    'cookie', 'consent', 'notice', 'alert', 'toolbar', 'breadcrumb', 'breadcrumbs',
    'pager', 'pagination', 'pager-', 'tag', 'tags', 'category', 'categories',
    'meta', 'metadata', 'rating', 'review', 'reviews', 'author-bio',
    'byline', 'dateline', 'caption', 'credit', 'copyright', 'legal',
    'disclaimer', 'terms', 'privacy', 'policy', 'affiliate', 'referral',
    'outbrain', 'taboola', 'zergnet', 'contentad', 'teaser', 'ticker',
    'live-stream', 'breaking-bar'
  ];

  // ── Positive patterns for class/id ─────────────────────────────
  var POSITIVE_PATTERNS = [
    'article', 'post', 'content', 'entry', 'story', 'body', 'text', 'main',
    'news', 'blog', 'read', 'page', 'section', 'chapter', 'paragraph',
    'article-body', 'article-content', 'post-content', 'entry-content',
    'story-body', 'news-content', 'main-content', 'page-content',
    'article__body', 'post__body', 'article__content', 'post__content',
    'rich-text', 'text-content', 'prose', 'longform', 'reading',
    'article-text', 'post-text', 'content-body', 'story-content',
    'article__text', 'article__main'
  ];

  // ── Tags to remove completely during document cleaning ──────────
  var REMOVE_TAGS = [
    'script', 'style', 'noscript', 'iframe', 'frame', 'frameset',
    'object', 'embed', 'applet', 'form', 'input', 'textarea',
    'select', 'button', 'svg', 'canvas', 'video', 'audio',
    'map', 'area'
  ];

  // ── Unlikely content tags (removed if low score) ───────────────
  var UNLIKELY_TAGS = [
    'nav', 'header', 'footer', 'aside', 'address',
    'details', 'summary', 'dialog', 'figcaption'
  ];

  // ── Ad-related data attributes ─────────────────────────────────
  var AD_DATA_ATTRS = [
    'data-ad', 'data-ad-slot', 'data-ad-unit', 'data-ad-client',
    'data-ad-width', 'data-ad-height', 'data-google-query-id',
    'data-ad-container', 'data-ad-position', 'data-adzone',
    'data-ad-group', 'data-ad-label'
  ];

  // ── HTML output: preserved tags (kept with cleaned attributes) ─
  var PRESERVED_HTML_TAGS = [
    'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'strong', 'b', 'em', 'i', 'a',
    'blockquote', 'ul', 'ol', 'li',
    'hr', 'br', 'img',
    'figure', 'figcaption',
    'sup', 'sub', 'pre', 'code',
    'small', 'mark', 'del', 'ins',
    'time'
  ];

  // ── HTML output: removed with all children ────────────────────
  var REMOVE_HTML_COMPLETELY = [
    'script', 'style', 'noscript', 'iframe', 'object', 'embed', 'applet',
    'svg', 'canvas', 'video', 'audio', 'form', 'input', 'textarea',
    'select', 'button', 'map', 'area'
  ];

  // ── Title cleaning: site-name suffixes after separator ────────
  var TITLE_SUFFIXES = [
    // Spanish
    'el país', 'elmundo\\.es', 'eldiario\\.es', 'lavanguardia\\.com',
    'marca\\.com', 'as\\.com', 'abc\\.es', 'larepublica', 'tn\\.com\\.ar',
    'clarín', 'lanación', 'página/12', 'página 12', 'infobae', 'la nación',
    'perfil\\.com', 'cronista\\.com', 'ambito\\.com', 'clarin\\.com',
    'la nacion', 'pagina12', 'tiempo argentino',
    // English
    'the new york times', 'the guardian', 'the washington post',
    'bbc news', 'cnn', 'reuters', 'associated press',
    'the wall street journal', 'the economist', 'wired',
    'the verge', 'techcrunch', 'ars technica',
    // Generic
    'home', 'inicio', 'portada', 'portada\\.es', 'latest news',
    'breaking news', 'noticias', 'sección', 'seccional'
  ];

  // ── Constructor ───────────────────────────────────────────────
  function CleanNewsReadability() {}

  // ══════════════════════════════════════════════════════════════
  // MAIN ENTRY POINT
  // ══════════════════════════════════════════════════════════════

  /**
   * Parse the current page and return a full article data object.
   */
  CleanNewsReadability.prototype.parse = function () {
    // 1. Extract metadata from original document
    var metadata = this._extractMetadata(document);

    // 2. Find featured image from original document (before cleaning removes images)
    var featuredImage = this._findFeaturedImage(document);

    // 3. Clone & clean document
    var doc = document.cloneNode(true);
    this._cleanDocument(doc);

    // 4. Find content candidate
    var contentResult = this._extractContent(doc);
    var contentElement = contentResult.element || doc.body;
    var contentText = this._cleanTextContent(contentElement);
    var contentHtml = this._cleanHtmlContent(contentElement);

    // 5. If no featured image yet, try from the content element
    if (!featuredImage) {
      featuredImage = this._findFeaturedImage(document, contentElement);
    }

    // 6. Statistics
    var words = contentText.split(/\s+/).filter(function (w) { return w.length > 0; });
    var wordCount = words.length;
    var readTime = Math.max(1, Math.ceil(wordCount / 200));

    // 7. Excerpt
    var excerpt = this._createExcerpt(contentText, metadata.description);

    return {
      title: metadata.title || document.title || 'Sin título',
      author: metadata.author || '',
      source: window.location.hostname.replace('www.', ''),
      sourceUrl: window.location.href,
      contentHtml: contentHtml,
      contentText: contentText,
      excerpt: excerpt,
      featuredImage: featuredImage,
      publishedAt: metadata.publishedAt || '',
      wordCount: wordCount,
      readTime: readTime
    };
  };

  // ══════════════════════════════════════════════════════════════
  // METADATA EXTRACTION
  // ══════════════════════════════════════════════════════════════

  CleanNewsReadability.prototype._extractMetadata = function (doc) {
    return {
      title: this._extractTitle(doc),
      author: this._extractAuthor(doc),
      publishedAt: this._extractDate(doc),
      description: this._extractDescription(doc)
    };
  };

  /**
   * Title: og:title > title (cleaned) > h1
   */
  CleanNewsReadability.prototype._extractTitle = function (doc) {
    // og:title
    var ogTitle = doc.querySelector('meta[property="og:title"]');
    if (ogTitle && ogTitle.getAttribute('content')) {
      return ogTitle.getAttribute('content').trim();
    }

    // <title> with cleaning
    var titleEl = doc.querySelector('title');
    if (titleEl) {
      return this._cleanTitle(titleEl.textContent.trim());
    }

    // <h1>
    var h1 = doc.querySelector('h1');
    if (h1) {
      var h1Text = h1.textContent.trim();
      return this._cleanTitle(h1Text);
    }

    return '';
  };

  /**
   * Strip common site-name suffixes from titles.
   */
  CleanNewsReadability.prototype._cleanTitle = function (title) {
    if (!title) return '';
    // Remove patterns like "Title | Site Name" or "Title - Site Name"
    var cleaned = title
      .replace(/\s*[|–—-]\s*[^|–—-]+$/, function (match, suffix) {
        var suffixLower = suffix.toLowerCase().trim();
        for (var i = 0; i < TITLE_SUFFIXES.length; i++) {
          if (suffixLower.indexOf(TITLE_SUFFIXES[i]) !== -1) return '';
        }
        // Also strip if the suffix part is very short compared to title (likely site name)
        if (suffixLower.split(/\s+/).length <= 5) return '';
        return match; // keep it
      })
      .replace(/\s*[|–—-]\s*$/, '') // trailing separator
      .replace(/«|»|‹|›|["""]/g, function (m) {
        // Keep smart quotes as regular
        return m.indexOf('«') !== -1 ? '\u00AB' : m.indexOf('»') !== -1 ? '\u00BB' : '';
      })
      .trim();
    return cleaned || title;
  };

  /**
   * Author: meta author > article:author > [class*="author"] > [rel="author"] > [data-author]
   */
  CleanNewsReadability.prototype._extractAuthor = function (doc) {
    var selectors = [
      'meta[name="author"]',
      'meta[property="article:author"]',
      'meta[name="sailthru.author"]',
      'meta[name="dc.creator"]'
    ];

    for (var i = 0; i < selectors.length; i++) {
      var meta = doc.querySelector(selectors[i]);
      if (meta && meta.getAttribute('content')) {
        var val = meta.getAttribute('content').trim();
        if (val.length > 0 && val.length < 100) {
          return val.replace(/^(por|by|de)\s*/i, '').trim();
        }
      }
    }

    // DOM selectors
    var domSelectors = [
      '[class*="author-name"]', '[class*="AuthorName"]',
      '[class*="author "]', '[class*=" byline"]', '[class*="Byline"]',
      '[class*="autor"]', '[class*="Autor"]',
      '[rel="author"]',
      '[data-author]', '[data-author-name]',
      '[itemprop="author"]'
    ];

    for (var j = 0; j < domSelectors.length; j++) {
      var el = doc.querySelector(domSelectors[j]);
      if (el) {
        var text = (el.getAttribute('content') || el.textContent || '').trim();
        // For elements with itemprop, get the nested name
        if (el.querySelector('[itemprop="name"]')) {
          text = el.querySelector('[itemprop="name"]').textContent.trim();
        }
        if (text.length > 0 && text.length < 100) {
          text = text.replace(/^(por|by|de)\s*/i, '').trim();
          // Remove common UI text
          if (text.indexOf('Comentar') === -1 && text.indexOf('Seguir') === -1) {
            return text;
          }
        }
      }
    }

    return '';
  };

  /**
   * Date: article:published_time > datePublished > DC.date.issued > time[datetime]
   */
  CleanNewsReadability.prototype._extractDate = function (doc) {
    var dateSelectors = [
      'meta[property="article:published_time"]',
      'meta[name="datePublished"]',
      'meta[name="DC.date.issued"]',
      'meta[name="date"]',
      'meta[name="publish-date"]',
      'meta[property="og:article:published_time"]',
      'meta[name="sailthru.date"]',
      'meta[itemprop="datePublished"]'
    ];

    for (var i = 0; i < dateSelectors.length; i++) {
      var el = doc.querySelector(dateSelectors[i]);
      if (el) {
        var content = el.getAttribute('content') || el.getAttribute('datetime') || '';
        content = content.trim();
        if (content) {
          var parsed = this._parseDate(content);
          if (parsed) return parsed;
        }
      }
    }

    // <time> element
    var timeEl = doc.querySelector('time[datetime], time[pubdate]');
    if (timeEl) {
      var dt = timeEl.getAttribute('datetime') || timeEl.getAttribute('pubdate');
      if (dt) {
        var parsed2 = this._parseDate(dt);
        if (parsed2) return parsed2;
      }
      // Try text content
      var textDate = timeEl.textContent.trim();
      if (textDate.length > 5 && textDate.length < 60) {
        return textDate;
      }
    }

    return '';
  };

  /**
   * Parse an ISO date string into a Spanish-formatted date.
   */
  CleanNewsReadability.prototype._parseDate = function (str) {
    if (!str) return '';
    var timestamp = Date.parse(str);
    if (isNaN(timestamp)) return '';
    try {
      return new Date(timestamp).toLocaleDateString('es-ES', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    } catch (e) {
      return str;
    }
  };

  /**
   * Description: og:description > meta description
   */
  CleanNewsReadability.prototype._extractDescription = function (doc) {
    var ogDesc = doc.querySelector('meta[property="og:description"]');
    if (ogDesc && ogDesc.getAttribute('content')) {
      return ogDesc.getAttribute('content').trim();
    }

    var metaDesc = doc.querySelector('meta[name="description"]');
    if (metaDesc && metaDesc.getAttribute('content')) {
      return metaDesc.getAttribute('content').trim();
    }

    return '';
  };

  // ══════════════════════════════════════════════════════════════
  // FEATURED IMAGE
  // ══════════════════════════════════════════════════════════════

  /**
   * Find the best featured/hero image for the article.
   * @param {Document} doc - Original document
   * @param {Element}  [contentElement] - Optionally scope search to content area
   */
  CleanNewsReadability.prototype._findFeaturedImage = function (doc, contentElement) {
    var searchRoot = contentElement || doc;

    // 1. Open Graph / Twitter meta (highest priority)
    var metaImg = doc.querySelector('meta[property="og:image"], meta[name="twitter:image"], meta[property="twitter:image"]');
    if (metaImg) {
      var metaSrc = (metaImg.getAttribute('content') || '').trim();
      if (metaSrc && metaSrc.indexOf('blank.gif') === -1 && metaSrc.indexOf('pixel') === -1) {
        // Resolve relative URLs
        return this._resolveUrl(metaSrc);
      }
    }

    // 2. link[rel="image_src"]
    var linkImg = doc.querySelector('link[rel="image_src"]');
    if (linkImg && linkImg.getAttribute('href')) {
      return this._resolveUrl(linkImg.getAttribute('href').trim());
    }

    // 3. Large images inside content area (or document)
    var images = searchRoot.querySelectorAll('img');
    var bestImage = '';
    var bestScore = 0;

    for (var i = 0; i < images.length; i++) {
      var img = images[i];
      var src = img.getAttribute('src') || img.getAttribute('data-src') || '';
      if (!src || src.indexOf('data:') === 0) continue;
      if (src.indexOf('blank.gif') !== -1 || src.indexOf('pixel') !== -1 ||
          src.indexOf('spacer') !== -1 || src.indexOf('1x1') !== -1) continue;

      var width = parseInt(img.getAttribute('width'), 10) || 0;
      var height = parseInt(img.getAttribute('height'), 10) || 0;

      // Try natural dimensions (only on live elements, not clones)
      if (img.naturalWidth) width = width || img.naturalWidth;
      if (img.naturalHeight) height = height || img.naturalHeight;

      var score = 0;

      // Size score
      if (width > 400 && height > 250) score += 200;
      else if (width > 300 || height > 200) score += 100;
      else if (width > 150 && height > 100) score += 40;

      // Aspect ratio bonus (landscape images are more likely hero images)
      if (width > 0 && height > 0) {
        var ratio = width / height;
        if (ratio > 1.2 && ratio < 3) score += 30;
      }

      // Position bonus (first large image is usually the hero)
      if (i === 0) score += 80;
      else if (i <= 2) score += 40;

      // Alt text bonus (content images have descriptions)
      if (img.getAttribute('alt') && img.getAttribute('alt').length > 5) score += 20;

      // picture > source fallback
      var parent = img.parentNode;
      if (parent && parent.tagName && parent.tagName.toLowerCase() === 'picture') score += 15;

      if (score > bestScore) {
        bestScore = score;
        bestImage = src;
      }
    }

    if (bestImage) return this._resolveUrl(bestImage);

    // 4. <picture> elements with <source>
    var sources = searchRoot.querySelectorAll('picture > source');
    for (var j = 0; j < sources.length; j++) {
      var srcset = sources[j].getAttribute('srcset');
      if (srcset) {
        var parts = srcset.split(',')[0].trim().split(/\s+/);
        if (parts.length > 0 && parts[0]) {
          return this._resolveUrl(parts[0]);
        }
      }
    }

    return '';
  };

  /**
   * Resolve a potentially relative URL against the current page.
   */
  CleanNewsReadability.prototype._resolveUrl = function (url) {
    if (!url) return '';
    try {
      var a = document.createElement('a');
      a.href = url;
      return a.href;
    } catch (e) {
      return url;
    }
  };

  // ══════════════════════════════════════════════════════════════
  // DOCUMENT CLEANING (for candidate scoring)
  // ══════════════════════════════════════════════════════════════

  CleanNewsReadability.prototype._cleanDocument = function (doc) {
    var self = this;

    // Remove tags completely
    REMOVE_TAGS.forEach(function (tag) {
      var elements = doc.getElementsByTagName(tag);
      for (var i = elements.length - 1; i >= 0; i--) {
        elements[i].parentNode.removeChild(elements[i]);
      }
    });

    // Remove unlikely tags with low score
    UNLIKELY_TAGS.forEach(function (tag) {
      var elements = doc.getElementsByTagName(tag);
      for (var i = elements.length - 1; i >= 0; i--) {
        if (self._getElementScore(elements[i]) < 0) {
          elements[i].parentNode.removeChild(elements[i]);
        }
      }
    });

    // Remove ad elements
    AD_DATA_ATTRS.forEach(function (attr) {
      var elements = doc.querySelectorAll('[' + attr + ']');
      for (var i = elements.length - 1; i >= 0; i--) {
        elements[i].parentNode.removeChild(elements[i]);
      }
    });

    // Remove elements with ad-like class/id
    var allElements = doc.querySelectorAll('*');
    for (var i = 0; i < allElements.length; i++) {
      var el = allElements[i];
      var className = (el.className && typeof el.className === 'string') ? el.className : '';
      var id = el.id || '';
      if (self._isAdElement(className, id) && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }

    // Remove comment sections
    var commentSelectors = [
      '[class*="comment"]', '[class*="Comment"]',
      '[id*="comment"]', '[id*="Comment"]',
      '[class*="discussion"]', '[class*="Discussion"]',
      '[class*="disqus"]', '[id*="disqus"]',
      '[class*="fb-comments"]', '[class*="comments-area"]'
    ];
    commentSelectors.forEach(function (sel) {
      try {
        var elems = doc.querySelectorAll(sel);
        for (var i = elems.length - 1; i >= 0; i--) {
          if (elems[i].parentNode) elems[i].parentNode.removeChild(elems[i]);
        }
      } catch (e) { /* invalid selector in some contexts */ }
    });

    // Remove social / share elements (unless they have strong positive score)
    var socialSelectors = [
      '[class*="social"]', '[class*="Social"]',
      '[class*="share"]', '[class*="Share"]',
      '[class*="follow"]', '[class*="Follow"]',
      '[class*="tweet"]', '[class*="retweet"]',
      '[class*="facebook"]', '[class*="twitter"]',
      '[class*="linkedin"]', '[class*="pinterest"]',
      '[class*="whatsapp"]'
    ];
    socialSelectors.forEach(function (sel) {
      try {
        var elems = doc.querySelectorAll(sel);
        for (var i = elems.length - 1; i >= 0; i--) {
          if (self._getElementScore(elems[i]) < 10 && elems[i].parentNode) {
            elems[i].parentNode.removeChild(elems[i]);
          }
        }
      } catch (e) {}
    });

    // Remove overlays, cookie banners, popups, newsletters
    var overlaySelectors = [
      '[class*="cookie"]', '[class*="consent"]',
      '[class*="popup"]', '[class*="modal"]',
      '[class*="overlay"]', '[class*="newsletter"]',
      '[class*="subscribe"]', '[class*="notification"]',
      '[class*="toast"]', '[class*="interstitial"]'
    ];
    overlaySelectors.forEach(function (sel) {
      try {
        var elems = doc.querySelectorAll(sel);
        for (var i = elems.length - 1; i >= 0; i--) {
          if (self._getElementScore(elems[i]) < 5 && elems[i].parentNode) {
            elems[i].parentNode.removeChild(elems[i]);
          }
        }
      } catch (e) {}
    });
  };

  /**
   * Check if an element is clearly an advertisement.
   */
  CleanNewsReadability.prototype._isAdElement = function (className, id) {
    var combined = (className + ' ' + id).toLowerCase();
    var adPatterns = [
      'ad-banner', 'ad-container', 'ad-wrapper', 'ad-slot', 'ad-unit',
      'ad-slot-', 'advertisement', 'ad-leaderboard', 'ad-rectangle',
      'ad-skyscraper', 'google-ad', 'adsbygoogle', 'ad-placement',
      'promoted-', 'sponsored-', 'sponsored_content', 'native-ad',
      'outbrain', 'taboola', 'zergnet', 'contentad'
    ];
    for (var i = 0; i < adPatterns.length; i++) {
      if (combined.indexOf(adPatterns[i]) !== -1) return true;
    }
    return false;
  };

  /**
   * Quick score for an element based on class/id (used during cleaning).
   */
  CleanNewsReadability.prototype._getElementScore = function (el) {
    var className = (el.className && typeof el.className === 'string') ? el.className.toLowerCase() : '';
    var id = (el.id || '').toLowerCase();
    var score = 0;

    POSITIVE_PATTERNS.forEach(function (p) {
      if (className.indexOf(p) !== -1) score += 15;
      if (id.indexOf(p) !== -1) score += 15;
    });
    NEGATIVE_PATTERNS.forEach(function (p) {
      if (className.indexOf(p) !== -1) score -= 20;
      if (id.indexOf(p) !== -1) score -= 20;
    });
    return score;
  };

  // ══════════════════════════════════════════════════════════════
  // CANDIDATE FINDING & SCORING
  // ══════════════════════════════════════════════════════════════

  /**
   * Find the best content element and return { content (text), element }.
   */
  CleanNewsReadability.prototype._extractContent = function (doc) {
    var candidates = this._findCandidates(doc);

    if (candidates.length === 0) {
      if (doc.body) return { content: this._cleanTextContent(doc.body), element: doc.body };
      return { content: '', element: null };
    }

    candidates.sort(function (a, b) { return b.score - a.score; });

    var best = candidates[0];

    // If best score is very low, try combining top candidates
    if (best.score < 30 && candidates.length > 1) {
      return this._combineCandidates(candidates.slice(0, Math.min(3, candidates.length)));
    }

    return { content: this._cleanTextContent(best.element), element: best.element };
  };

  CleanNewsReadability.prototype._findCandidates = function (doc) {
    var candidates = [];
    var self = this;
    var candidateTags = ['div', 'article', 'main', 'section', 'td'];

    candidateTags.forEach(function (tag) {
      var elements = doc.getElementsByTagName(tag);
      for (var i = 0; i < elements.length; i++) {
        var score = self._scoreCandidate(elements[i]);
        if (score > 0) {
          candidates.push({ element: elements[i], score: score, tag: tag });
        }
      }
    });

    // Explicit <main> boost
    var mainEl = doc.querySelector('main');
    if (mainEl) {
      var mainScore = this._scoreCandidate(mainEl);
      var alreadyHas = candidates.some(function (c) { return c.element === mainEl; });
      if (!alreadyHas) {
        candidates.push({ element: mainEl, score: Math.max(mainScore, 50), tag: 'main' });
      }
    }

    // [role="main"] and [role="article"]
    var roleElements = doc.querySelectorAll('[role="main"], [role="article"]');
    for (var r = 0; r < roleElements.length; r++) {
      var roleScore = self._scoreCandidate(roleElements[r]);
      var alreadyHasRole = candidates.some(function (c) { return c.element === roleElements[r]; });
      if (!alreadyHasRole) {
        candidates.push({
          element: roleElements[r],
          score: Math.max(roleScore, 40),
          tag: roleElements[r].tagName.toLowerCase()
        });
      }
    }

    return candidates;
  };

  /**
   * Score a candidate element. Enhanced v2: text-to-HTML ratio, duplicate penalty, stronger article/main preference.
   */
  CleanNewsReadability.prototype._scoreCandidate = function (el) {
    var score = 0;
    var text = this._getDirectText(el);
    var textLength = text.replace(/\s+/g, ' ').trim().length;

    if (textLength < 80) return 0;

    // ── Text length score ──
    score += Math.min(Math.floor(textLength / 50), 30);

    // ── Paragraph count bonus ──
    var paragraphs = el.querySelectorAll('p');
    var directParagraphs = 0;
    for (var i = 0; i < paragraphs.length; i++) {
      if (paragraphs[i].textContent.trim().length > 40) directParagraphs++;
    }
    score += directParagraphs * 3;

    // ── Link density penalty ──
    var links = el.getElementsByTagName('a');
    var linkTextLength = 0;
    for (var j = 0; j < links.length; j++) {
      linkTextLength += links[j].textContent.length;
    }
    var linkDensity = textLength > 0 ? linkTextLength / textLength : 0;
    if (linkDensity > 0.5) score *= 0.3;
    else if (linkDensity > 0.3) score *= 0.6;
    else if (linkDensity < 0.05) score *= 1.1;

    // ── Text-to-HTML ratio bonus ──
    var htmlLength = el.innerHTML ? el.innerHTML.length : 0;
    if (htmlLength > 0) {
      var textToHtmlRatio = textLength / htmlLength;
      if (textToHtmlRatio > 0.4) score *= 1.3;       // mostly text — great
      else if (textToHtmlRatio > 0.25) score *= 1.1;  // decent
      else if (textToHtmlRatio < 0.1) score *= 0.5;    // lots of markup — probably UI
    }

    // ── Tag-based score (prefer article/main aggressively) ──
    var tag = el.tagName.toLowerCase();
    if (tag === 'article') score += 25;
    else if (tag === 'main') score += 20;
    else if (tag === 'section') score += 8;
    else if (tag === 'div') score += 2;

    // ── Class/ID positive patterns ──
    var className = (el.className && typeof el.className === 'string') ? el.className.toLowerCase() : '';
    var id = (el.id || '').toLowerCase();

    POSITIVE_PATTERNS.forEach(function (p) {
      if (className.indexOf(p) !== -1) score += 15;
      if (id.indexOf(p) !== -1) score += 15;
    });

    // ── Class/ID negative patterns ──
    NEGATIVE_PATTERNS.forEach(function (p) {
      if (className.indexOf(p) !== -1) score -= 20;
      if (id.indexOf(p) !== -1) score -= 20;
    });

    // ── Semantic content bonuses ──
    if (el.querySelector('h1, h2, h3') && directParagraphs > 0) score += 5;
    if (el.querySelector('img[alt]')) score += 3;
    if (el.querySelector('blockquote')) score += 5;
    if (el.querySelector('ul, ol')) score += 3;

    // ── Interactive element penalty ──
    var inputs = el.querySelectorAll('input, select, button, textarea');
    if (inputs.length > 3) score -= inputs.length * 3;

    // ── Duplicate sibling penalty ──
    if (el.parentNode && el.parentNode.children) {
      var siblings = el.parentNode.children;
      var elSnippet = el.textContent.replace(/\s+/g, ' ').trim().substring(0, 80);
      var similarCount = 0;
      for (var s = 0; s < siblings.length; s++) {
        if (siblings[s] === el) continue;
        var sibSnippet = siblings[s].textContent.replace(/\s+/g, ' ').trim().substring(0, 80);
        if (elSnippet.length > 30 && sibSnippet.length > 30) {
          // Check similarity: does one contain a significant chunk of the other?
          if (elSnippet === sibSnippet) similarCount++;
          else if (elSnippet.indexOf(sibSnippet.substring(0, 40)) !== -1) similarCount++;
          else if (sibSnippet.indexOf(elSnippet.substring(0, 40)) !== -1) similarCount++;
        }
      }
      if (similarCount > 0) score -= similarCount * 15;
    }

    return Math.max(score, 0);
  };

  /**
   * Get direct text of an element (not including deep descendants).
   */
  CleanNewsReadability.prototype._getDirectText = function (el) {
    var text = '';
    for (var i = 0; i < el.childNodes.length; i++) {
      if (el.childNodes[i].nodeType === 3) {
        text += el.childNodes[i].textContent;
      } else if (el.childNodes[i].nodeType === 1) {
        var tag = el.childNodes[i].tagName ? el.childNodes[i].tagName.toLowerCase() : '';
        if ('p|span|a|strong|em|b|i|br|h1|h2|h3|h4|h5|h6|li'.indexOf(tag) !== -1) {
          text += el.childNodes[i].textContent + ' ';
        }
      }
    }
    return text;
  };

  /**
   * Combine multiple low-score candidates.
   */
  CleanNewsReadability.prototype._combineCandidates = function (candidates) {
    var texts = [];
    var seen = {};

    // Find the best scoring candidate to use as the element reference
    var bestElement = candidates[0].element;

    for (var i = 0; i < candidates.length; i++) {
      var text = this._cleanTextContent(candidates[i].element);
      var key = text.substring(0, 50);
      if (text.length > 100 && !seen[key]) {
        seen[key] = true;
        texts.push(text);
      }
    }

    return { content: texts.join('\n\n'), element: bestElement };
  };

  // ══════════════════════════════════════════════════════════════
  // TEXT EXTRACTION (contentText — plain text)
  // ══════════════════════════════════════════════════════════════

  CleanNewsReadability.prototype._cleanTextContent = function (el) {
    if (!el) return '';
    var clone = el.cloneNode(true);

    var removeSelectors = [
      'script', 'style', 'noscript', 'iframe', 'object', 'embed',
      'nav', 'footer', 'aside', 'form', 'button', 'input',
      'select', 'textarea', 'svg', 'canvas',
      '[class*="ad-"]', '[class*="social"]', '[class*="share"]',
      '[class*="comment"]', '[class*="sidebar"]', '[class*="widget"]',
      '[class*="newsletter"]', '[class*="subscribe"]', '[class*="related"]',
      '[class*="recommended"]', '[class*="cookie"]', '[class*="banner"]',
      '[class*="popup"]', '[class*="modal"]', '[class*="overlay"]',
      '[class*="breadcrumb"]', '[class*="pagination"]', '[class*="pager"]',
      '[class*="author-bio"]', '[class*="credit"]', '[class*="caption"]',
      '[class*="rating"]', '[class*="tag"]', '[class*="category"]'
    ];

    removeSelectors.forEach(function (selector) {
      try {
        var elements = clone.querySelectorAll(selector);
        for (var i = elements.length - 1; i >= 0; i--) {
          elements[i].parentNode.removeChild(elements[i]);
        }
      } catch (e) {}
    });

    // Also remove images (plain text doesn't need them)
    try {
      var imgs = clone.querySelectorAll('img');
      for (var j = imgs.length - 1; j >= 0; j--) {
        imgs[j].parentNode.removeChild(imgs[j]);
      }
    } catch (e) {}

    this._unwrapSimpleDivs(clone);
    return this._extractTextWithStructure(clone);
  };

  CleanNewsReadability.prototype._unwrapSimpleDivs = function (el) {
    var divs = el.querySelectorAll('div');
    for (var i = divs.length - 1; i >= 0; i--) {
      var div = divs[i];
      var hasBlockChildren = false;
      var textOnly = true;

      for (var j = 0; j < div.childNodes.length; j++) {
        if (div.childNodes[j].nodeType === 1) {
          textOnly = false;
          var childTag = div.childNodes[j].tagName ? div.childNodes[j].tagName.toLowerCase() : '';
          if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'table', 'blockquote', 'section', 'article'].indexOf(childTag) !== -1) {
            hasBlockChildren = true;
          }
        }
      }

      if (textOnly && div.parentNode) {
        while (div.firstChild) {
          div.parentNode.insertBefore(div.firstChild, div);
        }
        div.parentNode.removeChild(div);
      }
    }
  };

  CleanNewsReadability.prototype._extractTextWithStructure = function (el) {
    var lines = [];
    this._walkNode(el, lines, 0);
    return this._formatText(lines);
  };

  CleanNewsReadability.prototype._walkNode = function (node, lines, depth) {
    if (depth > 15) return;

    if (node.nodeType === 3) {
      var text = node.textContent.replace(/\s+/g, ' ').trim();
      if (text.length > 0) {
        if (lines.length > 0 && lines[lines.length - 1].type === 'text') {
          lines[lines.length - 1].content += ' ' + text;
        } else {
          lines.push({ type: 'text', content: text });
        }
      }
      return;
    }

    if (node.nodeType !== 1) return;

    var tag = node.tagName ? node.tagName.toLowerCase() : '';

    var blockTags = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'dd', 'dt', 'figcaption', 'tr', 'figure'];
    var headingTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    var ignoreTags = ['script', 'style', 'noscript', 'iframe', 'img', 'svg', 'canvas', 'br'];

    if (ignoreTags.indexOf(tag) !== -1) return;

    if (headingTags.indexOf(tag) !== -1) {
      var headingText = node.textContent.replace(/\s+/g, ' ').trim();
      if (headingText.length > 0) {
        lines.push({ type: 'heading', content: headingText, level: parseInt(tag.charAt(1)) });
      }
      return;
    }

    if (blockTags.indexOf(tag) !== -1) {
      var childLines = [];
      for (var i = 0; i < node.childNodes.length; i++) {
        this._walkNode(node.childNodes[i], childLines, depth + 1);
      }
      childLines = childLines.filter(function (l) { return l.content && l.content.trim().length > 0; });

      if (childLines.length > 0) {
        var allText = childLines.every(function (l) { return l.type === 'text'; });
        if (allText) {
          var combined = childLines.map(function (l) { return l.content; }).join(' ');
          if (combined.trim().length > 3) lines.push({ type: 'text', content: combined.trim() });
        } else {
          childLines.forEach(function (line) {
            if (line.content && line.content.trim().length > 3) lines.push(line);
          });
        }
      }
      return;
    }

    // Inline elements — recurse into children
    for (var j = 0; j < node.childNodes.length; j++) {
      this._walkNode(node.childNodes[j], lines, depth + 1);
    }
  };

  CleanNewsReadability.prototype._formatText = function (lines) {
    if (lines.length === 0) return '';
    var output = [];
    var prevType = null;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var text = line.content.trim();
      if (text.length < 3) continue;
      if (this._isGarbageText(text)) continue;

      if (prevType === 'text' && line.type === 'text') {
        output.push('');
      }

      if (line.type === 'heading') {
        output.push('');
        output.push(text);
        output.push('');
      } else {
        output.push(text);
      }

      prevType = line.type;
    }

    return output.join('\n').trim();
  };

  CleanNewsReadability.prototype._isGarbageText = function (text) {
    if (text.length < 5) return true;
    var words = text.split(/\s+/);
    if (words.length < 3) return true;

    var alphaCount = text.replace(/[^a-zA-ZáéíóúñüÁÉÍÓÚÑÜàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛäëïöüÄËÏÖÜ]/g, '').length;
    if (text.length > 0 && alphaCount / text.length < 0.3) return true;

    if (words.length > 3) {
      var uniqueWords = {};
      var uniqueCount = 0;
      for (var i = 0; i < words.length; i++) {
        var w = words[i].toLowerCase();
        if (!uniqueWords[w]) { uniqueWords[w] = true; uniqueCount++; }
      }
      if (uniqueCount / words.length < 0.2) return true;
    }

    var uiPatterns = [
      /^\s*leer más/i, /^\s*ver más/i, /^\s*continuar/i, /^\s*cargar más/i,
      /^\s*iniciar sesión/i, /^\s*regístrate/i, /^\s*suscríbete/i,
      /^\s*publicidad/i, /^\s*anuncio/i, /^\s*aceptar/i, /^\s*rechazar/i,
      /^\s*cerrar/i, /^\s*siguenos/i, /^\s*compartir/i, /^\s*comentar/i,
      /^\s*read more/i, /^\s*sign up/i, /^\s*log in/i, /^\s*subscribe/i,
      /^\s*share this/i, /^\s*leave a comment/i
    ];
    for (var j = 0; j < uiPatterns.length; j++) {
      if (uiPatterns[j].test(text)) return true;
    }

    return false;
  };

  // ══════════════════════════════════════════════════════════════
  // HTML EXTRACTION (contentHtml — clean semantic HTML)
  // ══════════════════════════════════════════════════════════════

  /**
   * Produce clean HTML from a content element.
   * Preserves only semantic tags, strips all attributes except
   * href on <a> and src/alt on <img>.
   */
  CleanNewsReadability.prototype._cleanHtmlContent = function (el) {
    if (!el) return '';
    var clone = el.cloneNode(true);

    // First, remove the same cruft we remove for text
    var removeSelectors = [
      'script', 'style', 'noscript', 'iframe', 'object', 'embed',
      'form', 'input', 'textarea', 'select', 'button',
      'svg', 'canvas', 'video', 'audio', 'map', 'area',
      'nav', 'footer',
      '[class*="ad-"]', '[class*="social"]', '[class*="share"]',
      '[class*="comment"]', '[class*="sidebar"]', '[class*="widget"]',
      '[class*="newsletter"]', '[class*="subscribe"]', '[class*="related"]',
      '[class*="recommended"]', '[class*="cookie"]', '[class*="banner"]',
      '[class*="popup"]', '[class*="modal"]', '[class*="overlay"]',
      '[class*="breadcrumb"]', '[class*="pagination"]', '[class*="pager"]',
      '[class*="author-bio"]', '[class*="credit"]'
    ];
    removeSelectors.forEach(function (sel) {
      try {
        var nodes = clone.querySelectorAll(sel);
        for (var i = nodes.length - 1; i >= 0; i--) {
          nodes[i].parentNode.removeChild(nodes[i]);
        }
      } catch (e) {}
    });

    // Now sanitize the remaining tree
    this._sanitizeHtmlTree(clone);

    return clone.innerHTML.trim();
  };

  /**
   * Recursively sanitize an HTML tree.
   * - PRESERVED_HTML_TAGS: keep tag, strip all attributes (except a.href, img.src/alt)
   * - REMOVE_HTML_COMPLETELY: remove tag + all children
   * - Everything else: unwrap (replace with children)
   */
  CleanNewsReadability.prototype._sanitizeHtmlTree = function (node) {
    if (node.nodeType !== 1) return;

    var tag = node.tagName ? node.tagName.toLowerCase() : '';

    // Remove completely (tag + all children)
    if (REMOVE_HTML_COMPLETELY.indexOf(tag) !== -1) {
      if (node.parentNode) node.parentNode.removeChild(node);
      return;
    }

    // Preserved tag: clean attributes, recurse into children
    if (PRESERVED_HTML_TAGS.indexOf(tag) !== -1) {
      this._cleanElementAttributes(node);
      this._sanitizeChildren(node);
      return;
    }

    // Everything else: unwrap — sanitize children first, then replace this node
    this._sanitizeChildren(node);
    if (node.parentNode) {
      var parent = node.parentNode;
      while (node.firstChild) {
        parent.insertBefore(node.firstChild, node);
      }
      parent.removeChild(node);
    }
  };

  /**
   * Sanitize all children of a node (iterate a copy since we may mutate).
   */
  CleanNewsReadability.prototype._sanitizeChildren = function (node) {
    var children = [];
    for (var i = 0; i < node.childNodes.length; i++) {
      children.push(node.childNodes[i]);
    }
    for (var j = 0; j < children.length; j++) {
      this._sanitizeHtmlTree(children[j]);
    }
  };

  /**
   * Strip ALL attributes from an element, then restore only the safe ones.
   * - <a> → keep href, add target="_blank" rel="noopener noreferrer"
   * - <img> → keep src and alt only
   * - Everything else → no attributes
   */
  CleanNewsReadability.prototype._cleanElementAttributes = function (el) {
    var tag = el.tagName ? el.tagName.toLowerCase() : '';
    var preserve = {};

    if (tag === 'a') {
      var href = el.getAttribute('href');
      if (href) {
        // Skip javascript: and empty links
        if (href.indexOf('javascript:') !== 0 && href !== '#') {
          preserve.href = href;
        }
      }
      preserve.target = '_blank';
      preserve.rel = 'noopener noreferrer';
    } else if (tag === 'img') {
      var src = el.getAttribute('src') || el.getAttribute('data-src') || '';
      if (src && src.indexOf('data:') !== 0) {
        preserve.src = src;
      }
      var alt = el.getAttribute('alt');
      if (alt) preserve.alt = alt;
    } else if (tag === 'time') {
      var datetime = el.getAttribute('datetime');
      if (datetime) preserve.datetime = datetime;
    }

    // Remove ALL attributes
    while (el.attributes.length > 0) {
      el.removeAttribute(el.attributes[0].name);
    }

    // Restore preserved attributes
    var keys = Object.keys(preserve);
    for (var i = 0; i < keys.length; i++) {
      el.setAttribute(keys[i], preserve[keys[i]]);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // UTILITIES
  // ══════════════════════════════════════════════════════════════

  /**
   * Create a short excerpt. Prefers the meta description, falls back to first 300 chars of text.
   */
  CleanNewsReadability.prototype._createExcerpt = function (contentText, metaDescription) {
    // Prefer meta description
    if (metaDescription && metaDescription.length > 20) {
      var desc = metaDescription.trim();
      if (desc.length > 300) desc = desc.substring(0, 297) + '...';
      return desc;
    }

    if (!contentText || contentText.length === 0) return '';

    var paragraphs = contentText.split(/\n\n+/).filter(function (p) { return p.trim().length > 0; });
    var excerpt = '';
    for (var i = 0; i < Math.min(3, paragraphs.length); i++) {
      if (excerpt.length + paragraphs[i].length > 300) break;
      excerpt += (excerpt ? ' ' : '') + paragraphs[i].trim();
    }

    if (excerpt.length > 300) excerpt = excerpt.substring(0, 297) + '...';
    return excerpt;
  };

  return CleanNewsReadability;
})();

// ── Global extraction function (used by content.js) ─────────────
function extractArticleContent() {
  try {
    var reader = new CleanNewsReadability();
    var data = reader.parse();

    // Validate: need meaningful content
    if (!data.contentText || data.contentText.trim().length < 50) {
      return {
        success: false,
        error: 'No se pudo extraer suficiente contenido de esta página. La página podría no ser un artículo.'
      };
    }

    return { success: true, data: data };
  } catch (e) {
    return { success: false, error: 'Error al extraer contenido: ' + e.message };
  }
}
