// CleanNews Vault - Algoritmo de Readability Completo
// Extracción limpia de contenido de artículos web

var CleanNewsReadability = (function() {
  'use strict';

  // Patrones negativos para clases/IDs
  var NEGATIVE_PATTERNS = [
    'comment', 'comments', 'sidebar', 'widget', 'widgets', 'ad', 'ads', 'advert',
    'advertising', 'social', 'share', 'sharing', 'footer', 'nav', 'navigation',
    'menu', 'header', 'promo', 'banner', 'sponsor', 'popup', 'modal', 'overlay',
    'related', 'recommended', 'newsletter', 'subscribe', 'signup', 'login',
    'cookie', 'consent', 'notice', 'alert', 'toolbar', 'breadcrumb', 'breadcrumbs',
    'pager', 'pagination', 'pager-', 'tag', 'tags', 'category', 'categories',
    'meta', 'metadata', 'rating', 'review', 'reviews', 'author-bio',
    'byline', 'dateline', 'caption', 'credit', 'copyright', 'legal',
    'disclaimer', 'terms', 'privacy', 'policy', 'affiliate', 'referral'
  ];

  // Patrones positivos para clases/IDs
  var POSITIVE_PATTERNS = [
    'article', 'post', 'content', 'entry', 'story', 'body', 'text', 'main',
    'news', 'blog', 'read', 'page', 'section', 'chapter', 'paragraph',
    'article-body', 'article-content', 'post-content', 'entry-content',
    'story-body', 'news-content', 'main-content', 'page-content',
    'article__body', 'post__body', 'article__content', 'post__content',
    'rich-text', 'text-content', 'prose', 'longform', 'reading',
    'article-text', 'post-text', 'content-body', 'story-content'
  ];

  // Tags a remover completamente
  var REMOVE_TAGS = [
    'script', 'style', 'noscript', 'iframe', 'frame', 'frameset',
    'object', 'embed', 'applet', 'form', 'input', 'textarea',
    'select', 'button', 'svg', 'canvas', 'video', 'audio',
    'map', 'area'
  ];

  // Tags poco probables de ser contenido principal
  var UNLIKELY_TAGS = [
    'nav', 'header', 'footer', 'aside', 'address', 'blockquote',
    'details', 'summary', 'dialog', 'figcaption'
  ];

  // Atributos de datos de anuncios
  var AD_DATA_ATTRS = [
    'data-ad', 'data-ad-slot', 'data-ad-unit', 'data-ad-client',
    'data-ad-width', 'data-ad-height', 'data-google-query-id',
    'data-ad-container', 'data-ad-position', 'data-adzone',
    'data-ad-group', 'data-ad-label'
  ];

  function CleanNewsReadability() {}

  /**
   * Punto de entrada principal - extrae el artículo de la página actual
   */
  CleanNewsReadability.prototype.parse = function() {
    var doc = document.cloneNode(true);

    // Limpiar el documento
    this._cleanDocument(doc);

    // Extraer metadata
    var metadata = this._extractMetadata(doc);

    // Encontrar el contenido principal
    var contentResult = this._extractContent(doc);

    // Calcular estadísticas
    var contentText = contentResult.content || '';
    var words = contentText.split(/\s+/).filter(function(w) { return w.length > 0; });
    var wordCount = words.length;
    var readTime = Math.max(1, Math.ceil(wordCount / 200));

    // Crear excerpt
    var excerpt = this._createExcerpt(contentText);

    return {
      title: metadata.title || document.title || 'Sin título',
      author: metadata.author || '',
      source: metadata.source || window.location.hostname,
      sourceUrl: window.location.href,
      content: contentText,
      excerpt: excerpt,
      publishedAt: metadata.publishedAt || '',
      wordCount: wordCount,
      readTime: readTime
    };
  };

  /**
   * Limpia el documento eliminando elementos innecesarios
   */
  CleanNewsReadability.prototype._cleanDocument = function(doc) {
    var self = this;

    // Remover tags completamente
    REMOVE_TAGS.forEach(function(tag) {
      var elements = doc.getElementsByTagName(tag);
      for (var i = elements.length - 1; i >= 0; i--) {
        elements[i].parentNode.removeChild(elements[i]);
      }
    });

    // Remover unlikely tags pero con más cuidado (no los eliminamos todos)
    UNLIKELY_TAGS.forEach(function(tag) {
      var elements = doc.getElementsByTagName(tag);
      for (var i = elements.length - 1; i >= 0; i--) {
        var el = elements[i];
        var score = self._getElementScore(el);
        if (score < 0) {
          el.parentNode.removeChild(el);
        }
      }
    });

    // Remover elementos con atributos de anuncios
    AD_DATA_ATTRS.forEach(function(attr) {
      var elements = doc.querySelectorAll('[' + attr + ']');
      for (var i = elements.length - 1; i >= 0; i--) {
        elements[i].parentNode.removeChild(elements[i]);
      }
    });

    // Remover elementos basados en clase/ID con patrones fuertes
    var allElements = doc.querySelectorAll('*');
    for (var i = 0; i < allElements.length; i++) {
      var el = allElements[i];
      var className = (el.className && typeof el.className === 'string') ? el.className : '';
      var id = el.id || '';

      if (self._isAdElement(className, id)) {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      }
    }

    // Remover elementos de comments
    var commentSections = doc.querySelectorAll(
      '[class*="comment"], [class*="Comment"], [id*="comment"], [id*="Comment"], ' +
      '[class*="discussion"], [class*="Discussion"], [id*="discussion"], ' +
      '[class*="disqus"], [id*="disqus"], [class*="fb-comments"], [class*="comments-area"]'
    );
    for (var j = commentSections.length - 1; j >= 0; j--) {
      if (commentSections[j].parentNode) {
        commentSections[j].parentNode.removeChild(commentSections[j]);
      }
    }

    // Remover elementos de redes sociales
    var socialElements = doc.querySelectorAll(
      '[class*="social"], [class*="share"], [class*="Social"], [class*="Share"], ' +
      '[class*="follow"], [class*="Follow"], [class*="like"], [class*="Like"], ' +
      '[class*="tweet"], [class*="retweet"], [class*="facebook"], [class*="twitter"], ' +
      '[class*="linkedin"], [class*="pinterest"], [class*="whatsapp"]'
    );
    for (var k = socialElements.length - 1; k >= 0; k--) {
      var socialEl = socialElements[k];
      var socialScore = self._getElementScore(socialEl);
      if (socialScore < 10) {
        if (socialEl.parentNode) {
          socialEl.parentNode.removeChild(socialEl);
        }
      }
    }

    // Remover cookie banners, popups, overlays
    var overlayElements = doc.querySelectorAll(
      '[class*="cookie"], [class*="consent"], [class*="banner"], [class*="popup"], ' +
      '[class*="modal"], [class*="overlay"], [class*="newsletter"], [class*="subscribe"], ' +
      '[class*="notification"], [class*="toast"], [class*="alert"]'
    );
    for (var l = overlayElements.length - 1; l >= 0; l--) {
      var overlayEl = overlayElements[l];
      var overlayScore = self._getElementScore(overlayEl);
      if (overlayScore < 5) {
        if (overlayEl.parentNode) {
          overlayEl.parentNode.removeChild(overlayEl);
        }
      }
    }
  };

  /**
   * Verifica si un elemento es claramente un anuncio
   */
  CleanNewsReadability.prototype._isAdElement = function(className, id) {
    var combined = (className + ' ' + id).toLowerCase();
    var adPatterns = [
      'ad-banner', 'ad-container', 'ad-wrapper', 'ad-slot', 'ad-unit',
      'ad-slot-', 'advertisement', 'ad-leaderboard', 'ad-rectangle',
      'ad-skyscraper', 'google-ad', 'adsbygoogle', 'ad-placement',
      'promoted-', 'sponsored-', 'sponsored_content', 'native-ad',
      'outbrain', 'taboola', 'zergnet', 'contentad'
    ];

    for (var i = 0; i < adPatterns.length; i++) {
      if (combined.indexOf(adPatterns[i]) !== -1) {
        return true;
      }
    }
    return false;
  };

  /**
   * Extrae metadata del documento
   */
  CleanNewsReadability.prototype._extractMetadata = function(doc) {
    var metadata = {
      title: '',
      author: '',
      source: window.location.hostname.replace('www.', ''),
      publishedAt: '',
      description: ''
    };

    // Título: prioridad og:title > title > h1
    var ogTitle = doc.querySelector('meta[property="og:title"]');
    if (ogTitle && ogTitle.getAttribute('content')) {
      metadata.title = ogTitle.getAttribute('content').trim();
    }
    if (!metadata.title) {
      var titleEl = doc.querySelector('title');
      if (titleEl) {
        metadata.title = titleEl.textContent.trim();
        // Limpiar sufijos comunes
        metadata.title = metadata.title
          .replace(/\s*[-|–—]\s*(el país|elmundo\.es|eldiario\.es|lavanguardia\.com|marca\.com|as\.com|abc\.es|larepublica|tn\.com\.ar|clarín|lanación|página|infobae|la nación).*$/i, '')
          .replace(/\s*[-|–—].*$/, '')
          .trim();
      }
    }
    if (!metadata.title) {
      var h1 = doc.querySelector('h1');
      if (h1) {
        metadata.title = h1.textContent.trim();
      }
    }

    // Autor
    var authorMeta = doc.querySelector('meta[name="author"], meta[name="article:author"]');
    if (authorMeta && authorMeta.getAttribute('content')) {
      metadata.author = authorMeta.getAttribute('content').trim();
    }
    if (!metadata.author) {
      var authorPatterns = [
        '[class*="author"]', '[class*="Author"]', '[class*="byline"]', '[class*="Byline"]',
        '[rel="author"]', '[data-author]', '[class*="autor"]', '[class*="Autor"]'
      ];
      for (var i = 0; i < authorPatterns.length && !metadata.author; i++) {
        var authorEl = doc.querySelector(authorPatterns[i]);
        if (authorEl) {
          var authorText = authorEl.textContent.trim();
          if (authorText.length > 0 && authorText.length < 100) {
            // Limpiar prefijos comunes
            authorText = authorText.replace(/^(por|by|de)\s*/i, '').trim();
            metadata.author = authorText;
          }
        }
      }
    }

    // Fecha de publicación
    var datePatterns = [
      'meta[property="article:published_time"]',
      'meta[name="date"]',
      'meta[name="datePublished"]',
      'meta[name="publish-date"]',
      'meta[name="DC.date.issued"]'
    ];
    for (var j = 0; j < datePatterns.length && !metadata.publishedAt; j++) {
      var dateEl = doc.querySelector(datePatterns[j]);
      if (dateEl && dateEl.getAttribute('content')) {
        var dateVal = dateEl.getAttribute('content').trim();
        var parsed = Date.parse(dateVal);
        if (!isNaN(parsed)) {
          var d = new Date(parsed);
          metadata.publishedAt = d.toLocaleDateString('es-ES', {
            year: 'numeric', month: 'long', day: 'numeric'
          });
        } else {
          metadata.publishedAt = dateVal;
        }
      }
    }
    if (!metadata.publishedAt) {
      var timeEl = doc.querySelector('time[datetime], time[pubdate]');
      if (timeEl) {
        var dt = timeEl.getAttribute('datetime') || timeEl.getAttribute('pubdate');
        if (dt) {
          var parsed2 = Date.parse(dt);
          if (!isNaN(parsed2)) {
            metadata.publishedAt = new Date(parsed2).toLocaleDateString('es-ES', {
              year: 'numeric', month: 'long', day: 'numeric'
            });
          }
        } else {
          metadata.publishedAt = timeEl.textContent.trim();
        }
      }
    }

    // Descripción
    var descMeta = doc.querySelector('meta[name="description"], meta[property="og:description"]');
    if (descMeta && descMeta.getAttribute('content')) {
      metadata.description = descMeta.getAttribute('content').trim();
    }

    return metadata;
  };

  /**
   * Extrae y limpia el contenido principal
   */
  CleanNewsReadability.prototype._extractContent = function(doc) {
    var candidates = this._findCandidates(doc);

    if (candidates.length === 0) {
      // Fallback: usar body entero
      var body = doc.body;
      if (body) {
        return { content: this._cleanTextContent(body) };
      }
      return { content: '' };
    }

    // Ordenar por score descendente
    candidates.sort(function(a, b) { return b.score - a.score; });

    var bestCandidate = candidates[0];

    // Si el score del mejor candidato es muy bajo, intentar combinar
    if (bestCandidate.score < 30 && candidates.length > 1) {
      return this._combineCandidates(candidates.slice(0, Math.min(3, candidates.length)));
    }

    return { content: this._cleanTextContent(bestCandidate.element) };
  };

  /**
   * Encuentra todos los candidatos a contenido principal
   */
  CleanNewsReadability.prototype._findCandidates = function(doc) {
    var candidates = [];
    var self = this;
    var candidateTags = ['div', 'article', 'main', 'section', 'td', 'li'];

    candidateTags.forEach(function(tag) {
      var elements = doc.getElementsByTagName(tag);
      for (var i = 0; i < elements.length; i++) {
        var el = elements[i];
        var score = self._scoreCandidate(el);
        if (score > 0) {
          candidates.push({
            element: el,
            score: score,
            tag: tag
          });
        }
      }
    });

    // También verificar <main> explícitamente
    var mainEl = doc.querySelector('main');
    if (mainEl) {
      var mainScore = this._scoreCandidate(mainEl);
      var alreadyHas = candidates.some(function(c) { return c.element === mainEl; });
      if (!alreadyHas) {
        candidates.push({
          element: mainEl,
          score: Math.max(mainScore, 50),
          tag: 'main'
        });
      }
    }

    // Verificar [role="main"] y [role="article"]
    var roleElements = doc.querySelectorAll('[role="main"], [role="article"]');
    roleElements.forEach(function(el) {
      var roleScore = self._scoreCandidate(el);
      var alreadyHasRole = candidates.some(function(c) { return c.element === el; });
      if (!alreadyHasRole) {
        candidates.push({
          element: el,
          score: Math.max(roleScore, 40),
          tag: el.tagName.toLowerCase()
        });
      }
    });

    return candidates;
  };

  /**
   * Calcula el score de un candidato
   */
  CleanNewsReadability.prototype._scoreCandidate = function(el) {
    var score = 0;
    var text = this._getDirectText(el);
    var textLength = text.replace(/\s+/g, ' ').trim().length;

    // Necesita suficiente texto para ser un candidato
    if (textLength < 80) return 0;

    // Score base por longitud de texto
    score += Math.min(Math.floor(textLength / 50), 30);

    // Bonus por párrafos directos
    var paragraphs = el.querySelectorAll('p');
    var directParagraphs = 0;
    for (var i = 0; i < paragraphs.length; i++) {
      var pText = paragraphs[i].textContent.trim();
      if (pText.length > 40) {
        directParagraphs++;
      }
    }
    score += directParagraphs * 3;

    // Penalización por densidad de enlaces
    var links = el.getElementsByTagName('a');
    var linkTextLength = 0;
    for (var j = 0; j < links.length; j++) {
      linkTextLength += links[j].textContent.length;
    }
    var linkDensity = textLength > 0 ? linkTextLength / textLength : 0;
    if (linkDensity > 0.5) {
      score *= 0.3;
    } else if (linkDensity > 0.3) {
      score *= 0.6;
    } else if (linkDensity < 0.05) {
      score *= 1.1;
    }

    // Score por tag
    var tag = el.tagName.toLowerCase();
    if (tag === 'article') score += 20;
    else if (tag === 'main') score += 15;
    else if (tag === 'section') score += 8;
    else if (tag === 'div') score += 2;

    // Score por clase/ID positivos
    var className = (el.className && typeof el.className === 'string') ? el.className.toLowerCase() : '';
    var id = (el.id || '').toLowerCase();

    POSITIVE_PATTERNS.forEach(function(pattern) {
      if (className.indexOf(pattern) !== -1) score += 15;
      if (id.indexOf(pattern) !== -1) score += 15;
    });

    // Penalización por clase/ID negativos
    NEGATIVE_PATTERNS.forEach(function(pattern) {
      if (className.indexOf(pattern) !== -1) score -= 20;
      if (id.indexOf(pattern) !== -1) score -= 20;
    });

    // Bonus por contenido semántico
    if (el.querySelector('h1, h2, h3') && directParagraphs > 0) score += 5;
    if (el.querySelector('img[alt]')) score += 3;
    if (el.querySelector('blockquote')) score += 5;
    if (el.querySelector('ul, ol')) score += 3;

    // Penalización por tener muchos elementos interactivos
    var inputs = el.querySelectorAll('input, select, button, textarea');
    if (inputs.length > 3) score -= inputs.length * 3;

    return Math.max(score, 0);
  };

  /**
   * Obtiene el texto directo de un elemento (no de hijos)
   */
  CleanNewsReadability.prototype._getDirectText = function(el) {
    var text = '';
    for (var i = 0; i < el.childNodes.length; i++) {
      if (el.childNodes[i].nodeType === 3) { // Text node
        text += el.childNodes[i].textContent;
      } else if (el.childNodes[i].nodeType === 1) { // Element node
        var tag = el.childNodes[i].tagName.toLowerCase();
        if (tag === 'p' || tag === 'span' || tag === 'a' || tag === 'strong' ||
            tag === 'em' || tag === 'b' || tag === 'i' || tag === 'br' ||
            tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' ||
            tag === 'h5' || tag === 'h6' || tag === 'li') {
          text += el.childNodes[i].textContent + ' ';
        }
      }
    }
    return text;
  };

  /**
   * Obtiene el score de un elemento (para limpieza)
   */
  CleanNewsReadability.prototype._getElementScore = function(el) {
    var className = (el.className && typeof el.className === 'string') ? el.className.toLowerCase() : '';
    var id = (el.id || '').toLowerCase();
    var score = 0;

    POSITIVE_PATTERNS.forEach(function(pattern) {
      if (className.indexOf(pattern) !== -1) score += 15;
      if (id.indexOf(pattern) !== -1) score += 15;
    });

    NEGATIVE_PATTERNS.forEach(function(pattern) {
      if (className.indexOf(pattern) !== -1) score -= 20;
      if (id.indexOf(pattern) !== -1) score -= 20;
    });

    return score;
  };

  /**
   * Combina múltiples candidatos de bajo score
   */
  CleanNewsReadability.prototype._combineCandidates = function(candidates) {
    var texts = [];
    var seen = new Set();

    for (var i = 0; i < candidates.length; i++) {
      var text = this._cleanTextContent(candidates[i].element);
      if (text.length > 100 && !seen.has(text.substring(0, 50))) {
        seen.add(text.substring(0, 50));
        texts.push(text);
      }
    }

    return { content: texts.join('\n\n') };
  };

  /**
   * Limpia y extrae el contenido de texto de un elemento
   */
  CleanNewsReadability.prototype._cleanTextContent = function(el) {
    if (!el) return '';

    // Clonar para no modificar el original
    var clone = el.cloneNode(true);

    // Remover remaining unwanted elements
    var removeSelectors = [
      'script', 'style', 'noscript', 'iframe', 'object', 'embed',
      'nav', 'footer', 'aside', 'form', 'button', 'input',
      'select', 'textarea', 'svg', 'canvas', 'img',
      '[class*="ad-"]', '[class*="social"]', '[class*="share"]',
      '[class*="comment"]', '[class*="sidebar"]', '[class*="widget"]',
      '[class*="newsletter"]', '[class*="subscribe"]', '[class*="related"]',
      '[class*="recommended"]', '[class*="cookie"]', '[class*="banner"]',
      '[class*="popup"]', '[class*="modal"]', '[class*="overlay"]',
      '[class*="breadcrumb"]', '[class*="pagination"]', '[class*="pager"]',
      '[class*="author-bio"]', '[class*="credit"]', '[class*="caption"]',
      '[class*="rating"]', '[class*="tag"]', '[class*="category"]'
    ];

    removeSelectors.forEach(function(selector) {
      try {
        var elements = clone.querySelectorAll(selector);
        for (var i = elements.length - 1; i >= 0; i--) {
          elements[i].parentNode.removeChild(elements[i]);
        }
      } catch(e) {}
    });

    // Unwrap divs anidados que solo contienen texto
    this._unwrapSimpleDivs(clone);

    // Extraer texto manteniendo estructura
    return this._extractTextWithStructure(clone);
  };

  /**
   * Desenvuelve divs simples que solo contienen texto
   */
  CleanNewsReadability.prototype._unwrapSimpleDivs = function(el) {
    var divs = el.querySelectorAll('div');
    for (var i = divs.length - 1; i >= 0; i--) {
      var div = divs[i];
      var children = div.childNodes;
      var hasBlockChildren = false;
      var textOnly = true;

      for (var j = 0; j < children.length; j++) {
        if (children[j].nodeType === 1) {
          textOnly = false;
          var childTag = children[j].tagName ? children[j].tagName.toLowerCase() : '';
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

  /**
   * Extrae texto manteniendo estructura de párrafos
   */
  CleanNewsReadability.prototype._extractTextWithStructure = function(el) {
    var lines = [];
    this._walkNode(el, lines, 0);
    return this._formatText(lines);
  };

  /**
   * Recorre recursivamente el DOM extrayendo texto
   */
  CleanNewsReadability.prototype._walkNode = function(node, lines, depth) {
    if (depth > 15) return; // Limitar profundidad

    if (node.nodeType === 3) { // Text node
      var text = node.textContent.replace(/\s+/g, ' ').trim();
      if (text.length > 0) {
        if (lines.length > 0) {
          var lastLine = lines[lines.length - 1];
          if (lastLine.type === 'text') {
            lines[lines.length - 1].content += ' ' + text;
            return;
          }
        }
        lines.push({ type: 'text', content: text });
      }
      return;
    }

    if (node.nodeType !== 1) return; // No es un elemento

    var tag = node.tagName ? node.tagName.toLowerCase() : '';

    // Tags de bloque
    var blockTags = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'dd', 'dt', 'figcaption', 'tr'];
    var headingTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    var ignoreTags = ['script', 'style', 'noscript', 'iframe', 'img', 'svg', 'canvas', 'br'];

    if (ignoreTags.indexOf(tag) !== -1) return;

    // Heading
    if (headingTags.indexOf(tag) !== -1) {
      var headingText = node.textContent.replace(/\s+/g, ' ').trim();
      if (headingText.length > 0) {
        lines.push({ type: 'heading', content: headingText, level: parseInt(tag.charAt(1)) });
      }
      return;
    }

    // Block elements - procesar hijos y posiblemente agregar separador
    if (blockTags.indexOf(tag) !== -1) {
      var childLines = [];
      for (var i = 0; i < node.childNodes.length; i++) {
        this._walkNode(node.childNodes[i], childLines, depth + 1);
      }

      // Filtrar líneas vacías
      childLines = childLines.filter(function(l) {
        return l.content && l.content.trim().length > 0;
      });

      if (childLines.length > 0) {
        // Combinar texto de hijos en una sola línea si son todos texto
        var allText = childLines.every(function(l) { return l.type === 'text'; });
        if (allText) {
          var combined = childLines.map(function(l) { return l.content; }).join(' ');
          if (combined.trim().length > 3) {
            lines.push({ type: 'text', content: combined.trim() });
          }
        } else {
          childLines.forEach(function(line) {
            if (line.content && line.content.trim().length > 3) {
              lines.push(line);
            }
          });
        }
      }
      return;
    }

    // Inline elements - procesar hijos normalmente
    for (var j = 0; j < node.childNodes.length; j++) {
      this._walkNode(node.childNodes[j], lines, depth + 1);
    }
  };

  /**
   * Formatea las líneas extraídas en texto legible
   */
  CleanNewsReadability.prototype._formatText = function(lines) {
    if (lines.length === 0) return '';

    var output = [];
    var prevType = null;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var text = line.content.trim();

      if (text.length < 3) continue;

      // Filtrar contenido basura
      if (this._isGarbageText(text)) continue;

      // Agregar separación entre párrafos
      if (prevType === 'text' && line.type === 'text') {
        // Verificar si son párrafos diferentes
        if (text.length > 80 || prevType === 'heading') {
          output.push('');
        } else {
          output.push('');
        }
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

  /**
   * Verifica si el texto es basura (muy corto, repeticiones, etc.)
   */
  CleanNewsReadability.prototype._isGarbageText = function(text) {
    if (text.length < 5) return true;

    // Muy pocas palabras
    var words = text.split(/\s+/);
    if (words.length < 3) return true;

    // Solo números y símbolos
    var alphaCount = text.replace(/[^a-zA-ZáéíóúñüÁÉÍÓÚÑÜ]/g, '').length;
    if (alphaCount / text.length < 0.3) return true;

    // Texto repetitivo
    if (words.length > 3) {
      var uniqueWords = new Set(words.map(function(w) { return w.toLowerCase(); }));
      if (uniqueWords.size / words.length < 0.2) return true;
    }

    // Patrones comunes de UI
    var uiPatterns = [
      /^leer más/i, /^ver más/i, /^continuar/i, /^cargar más/i,
      /^iniciar sesión/i, /^regístrate/i, /^suscríbete/i,
      /^publicidad/i, /^anuncio/i, /^aceptar/i, /^rechazar/i,
      /^cerrar/i, /^siguenos/i, /^compartir/i, /^comentar/i
    ];
    for (var i = 0; i < uiPatterns.length; i++) {
      if (uiPatterns[i].test(text)) return true;
    }

    return false;
  };

  /**
   * Crea un excerpt del contenido
   */
  CleanNewsReadability.prototype._createExcerpt = function(content) {
    if (!content || content.length === 0) return '';

    // Dividir en párrafos
    var paragraphs = content.split(/\n\n+/).filter(function(p) {
      return p.trim().length > 0;
    });

    // Tomar los primeros párrafos hasta 200 caracteres
    var excerpt = '';
    for (var i = 0; i < Math.min(3, paragraphs.length); i++) {
      if (excerpt.length + paragraphs[i].length > 300) break;
      excerpt += (excerpt ? ' ' : '') + paragraphs[i].trim();
    }

    if (excerpt.length > 200) {
      excerpt = excerpt.substring(0, 197) + '...';
    }

    return excerpt;
  };

  return CleanNewsReadability;
})();

// Función global para uso desde content script
function extractArticleContent() {
  try {
    var reader = new CleanNewsReadability();
    var result = reader.parse();

    // Validar resultado
    if (!result.content || result.content.trim().length < 50) {
      return {
        success: false,
        error: 'No se pudo extraer suficiente contenido de esta página. La página podría no ser un artículo.'
      };
    }

    return { success: true, data: result };
  } catch (e) {
    return {
      success: false,
      error: 'Error al extraer contenido: ' + e.message
    };
  }
}
