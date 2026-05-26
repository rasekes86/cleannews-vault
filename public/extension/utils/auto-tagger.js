// CleanNews Vault v2.0 - Auto-Tagging Utilities
// Suggest tags based on source, title keywords, and content analysis

const CleanNewsAutoTagger = (() => {

  // ── Source-to-category mappings ──────────────────────────────────

  const SOURCE_CATEGORIES = {
    // Deportes
    'marca.com': ['deportes'],
    'as.com': ['deportes'],
    'espn.com': ['deportes'],
    'espn.com.ar': ['deportes'],
    'espn.com.br': ['deportes'],
    'espnfc.com': ['deportes', 'fútbol'],
    'goal.com': ['deportes', 'fútbol'],
    'sport.es': ['deportes'],
    'mundo Deportivo': ['deportes'],
    'sportyou.es': ['deportes'],
    'basketball-reference.com': ['deportes', 'baloncesto'],
    'formula1.com': ['deportes', 'fórmula 1'],
    'cyclismnews.com': ['deportes', 'ciclismo'],

    // Noticias (general Spanish press)
    'elpais.com': ['noticias'],
    'elmundo.es': ['noticias'],
    'eldiario.es': ['noticias'],
    'lavanguardia.com': ['noticias'],
    'abc.es': ['noticias'],
    'larepublica.pe': ['noticias'],
    'elperiodico.com': ['noticias'],
    'eldiario.es': ['noticias'],
    '20minutos.es': ['noticias'],
    'elnortedecastilla.es': ['noticias'],
    'ideal.es': ['noticias'],

    // Internacional
    'bbc.com': ['internacional'],
    'bbc.co.uk': ['internacional'],
    'cnn.com': ['internacional'],
    'reuters.com': ['internacional'],
    'apnews.com': ['internacional'],
    'aljazeera.com': ['internacional'],
    'theguardian.com': ['internacional'],
    'nytimes.com': ['internacional'],
    'washingtonpost.com': ['internacional'],
    'lemonde.fr': ['internacional'],
    'der-spiegel.de': ['internacional'],
    'ft.com': ['internacional', 'economía'],

    // Tecnología
    'techcrunch.com': ['tecnología'],
    'theverge.com': ['tecnología'],
    'wired.com': ['tecnología'],
    'arstechnica.com': ['tecnología'],
    'gizmodo.com': ['tecnología'],
    'engadget.com': ['tecnología'],
    'xataka.com': ['tecnología'],
    'genbeta.com': ['tecnología'],
    'muycomputer.com': ['tecnología'],
    'computerhoy.com': ['tecnología'],
    'theinformation.com': ['tecnología'],
    '9to5mac.com': ['tecnología', 'apple'],
    '9to5google.com': ['tecnología', 'google'],
    'techradar.com': ['tecnología'],
    'zdnet.com': ['tecnología'],
    'cnet.com': ['tecnología'],
    'mashable.com': ['tecnología'],
    'producthunt.com': ['tecnología'],
    'hackernews.com': ['tecnología'],
    'news.ycombinator.com': ['tecnología'],

    // Ciencia
    'nature.com': ['ciencia'],
    'sciencedaily.com': ['ciencia'],
    'scientificamerican.com': ['ciencia'],
    'newscientist.com': ['ciencia'],
    'wired.com': ['ciencia', 'tecnología'],
    'sciencemag.org': ['ciencia'],
    'plos.org': ['ciencia'],
    'arxiv.org': ['ciencia', 'investigación'],
    'phys.org': ['ciencia'],
    'nationalgeographic.com': ['ciencia', 'naturaleza'],
    'elconfidencial.com': ['ciencia', 'tecnología'],

    // Economía / Negocios
    'elconfidencial.com': ['economía'],
    'expansion.com': ['economía'],
    'cincodias.elpais.com': ['economía'],
    'bloomberg.com': ['economía'],
    'wsj.com': ['economía'],
    'businessinsider.com': ['economía', 'negocios'],
    'forbes.com': ['economía', 'negocios'],
    'fortune.com': ['negocios'],
    'ft.com': ['economía'],
    'marketwatch.com': ['economía'],
    'seekingalpha.com': ['economía', 'inversiones'],
    'economia.elpais.com': ['economía'],
    'eldiario.es/economia': ['economía'],

    // Cultura / Entretenimiento
    'rottentomatoes.com': ['cine', 'entretenimiento'],
    'imdb.com': ['cine', 'entretenimiento'],
    'metacritic.com': ['entretenimiento'],
    'spotify.com': ['música'],
    'pitchfork.com': ['música'],
    'rollingstone.com': ['música', 'cultura'],
    'pitchfork.com': ['música'],
    'elcultural.com': ['cultura'],
    'cultura.elpais.com': ['cultura'],
    'literaturainfantil.com': ['libros'],

    // Salud
    'who.int': ['salud'],
    'mayoclinic.org': ['salud'],
    'webmd.com': ['salud'],
    'healthline.com': ['salud'],
    'medicalnewstoday.com': ['salud'],
    'nih.gov': ['salud', 'ciencia'],
    'thelancet.com': ['salud', 'ciencia'],

    // Política
    'politico.com': ['política'],
    'politico.eu': ['política'],
    'thehill.com': ['política'],

    // Medio ambiente
    'carbonbrief.org': ['medio ambiente', 'ciencia'],
    'insideclimatenews.org': ['medio ambiente'],
    'grist.org': ['medio ambiente'],
    'ecologiaverde.com': ['medio ambiente']
  };

  // ── Title keyword patterns ──────────────────────────────────────

  const TITLE_KEYWORDS = {
    'inteligencia artificial': 'inteligencia artificial',
    'artificial intelligence': 'inteligencia artificial',
    'machine learning': 'inteligencia artificial',
    'deep learning': 'inteligencia artificial',
    'ia generativa': 'inteligencia artificial',
    'chatgpt': 'inteligencia artificial',
    'gpt-': 'inteligencia artificial',
    'openai': 'inteligencia artificial',
    'llm': 'inteligencia artificial',
    'bitcoin': 'criptomonedas',
    'ethereum': 'criptomonedas',
    'crypto': 'criptomonedas',
    'blockchain': 'criptomonedas',
    'defi': 'criptomonedas',
    'nft': 'criptomonedas',
    'startup': 'startups',
    'startup': 'startups',
    'emprendimiento': 'startups',
    'climático': 'clima',
    'climate change': 'clima',
    'calentamiento global': 'clima',
    'emisiones': 'clima',
    'sostenibilidad': 'sostenibilidad',
    'sostenible': 'sostenibilidad',
    'elecciones': 'política',
    'election': 'política',
    'votación': 'política',
    'parlamento': 'política',
    'gobierno': 'política',
    'fútbol': 'fútbol',
    'futbol': 'fútbol',
    'soccer': 'fútbol',
    'baloncesto': 'baloncesto',
    'basketball': 'baloncesto',
    'tenis': 'tenis',
    'fórmula 1': 'fórmula 1',
    'formula 1': 'fórmula 1',
    'copa del mundo': 'fútbol',
    'world cup': 'fútbol',
    'champions': 'fútbol',
    'nba': 'baloncesto',
    'receta': 'cocina',
    'recetas': 'cocina',
    'gastronomía': 'cocina',
    'viaje': 'viajes',
    'viajes': 'viajes',
    'turismo': 'viajes',
    'destino': 'viajes',
    'libro': 'libros',
    'lectura': 'libros',
    'review': 'reseña',
    'reseña': 'reseña',
    'opinión': 'opinión',
    'editorial': 'opinión',
    'inteligencia': 'ciencia',
    'investigación': 'ciencia',
    'descubrimiento': 'ciencia',
    'espacio': 'espacio',
    'nasa': 'espacio',
    'spacex': 'espacio',
    'martian': 'espacio',
    'misión': 'espacio',
    'vacuna': 'salud',
    'pandemia': 'salud',
    'covid': 'salud',
    'ciberseguridad': 'ciberseguridad',
    'hacker': 'ciberseguridad',
    'datos personales': 'privacidad',
    'privacidad': 'privacidad',
    'gdpr': 'privacidad',
    'rgpd': 'privacidad',
    'apple': 'apple',
    'google': 'google',
    'microsoft': 'microsoft',
    'meta platforms': 'meta',
    'amazon': 'amazon',
    'tesla': 'tesla',
    'eléctrico': 'coches eléctricos',
    'electrico': 'coches eléctricos',
    'ev ': 'coches eléctricos'
  };

  // ── Public API ──────────────────────────────────────────────────

  return {
    /**
     * Suggest up to 5 tags for an article based on its source, title,
     * and available content keywords.
     *
     * @param {object} article - Article object with at least `source`, `title`
     * @returns {string[]} Array of suggested tags (max 5)
     */
    suggestTags(article) {
      const tags = new Set();

      // 1. Source-based categories
      if (article.source) {
        const sourceLower = article.source.toLowerCase().trim();
        for (const [domain, categories] of Object.entries(SOURCE_CATEGORIES)) {
          if (sourceLower === domain || sourceLower.includes(domain)) {
            categories.forEach((c) => tags.add(c));
          }
        }
      }

      // 2. Also check sourceUrl domain
      if (article.sourceUrl && typeof CleanNewsUrl !== 'undefined') {
        const domain = CleanNewsUrl.getDomain(article.sourceUrl);
        for (const [sourceDomain, categories] of Object.entries(SOURCE_CATEGORIES)) {
          if (domain === sourceDomain || domain.endsWith('.' + sourceDomain)) {
            categories.forEach((c) => tags.add(c));
          }
        }
      }

      // 3. Title keyword matching
      if (article.title) {
        const titleLower = article.title.toLowerCase();
        for (const [keyword, tag] of Object.entries(TITLE_KEYWORDS)) {
          if (titleLower.includes(keyword)) {
            tags.add(tag);
          }
        }
      }

      // 4. Check content excerpt for keywords (lightweight)
      const excerptText = article.excerpt || '';
      if (excerptText) {
        const excerptLower = excerptText.toLowerCase();
        for (const [keyword, tag] of Object.entries(TITLE_KEYWORDS)) {
          if (excerptLower.includes(keyword) && tags.size < 5) {
            tags.add(tag);
          }
        }
      }

      // 5. Extract potential tags from existing article tags
      if (article.tags && Array.isArray(article.tags)) {
        article.tags.forEach((t) => tags.add(t));
      }

      // Return up to 5 tags, prioritized: keep a stable order
      const result = Array.from(tags).slice(0, 5);
      return result;
    },

    /**
     * Map a known source domain/name to one or more category tags.
     *
     * @param {string} source - Source name (e.g., "Marca" or "marca.com")
     * @returns {string[]} Category tags
     */
    categorizeSource(source) {
      if (!source) return [];

      const sourceLower = source.toLowerCase().trim();

      // Check source URL / domain first
      if (typeof CleanNewsUrl !== 'undefined') {
        try {
          const domain = CleanNewsUrl.getDomain(
            source.startsWith('http') ? source : 'https://' + source
          );
          for (const [sourceDomain, categories] of Object.entries(SOURCE_CATEGORIES)) {
            if (domain === sourceDomain || domain.endsWith('.' + sourceDomain)) {
              return [...categories];
            }
          }
        } catch (e) {
          // continue with name-based matching
        }
      }

      // Fall back to name-based matching
      for (const [domain, categories] of Object.entries(SOURCE_CATEGORIES)) {
        if (
          sourceLower === domain ||
          sourceLower.includes(domain) ||
          sourceLower.includes(domain.replace(/\.com$/, '').replace(/\./g, ' '))
        ) {
          return [...categories];
        }
      }

      return [];
    }
  };
})();

// Export globally
if (typeof window !== 'undefined') {
  window.CleanNewsAutoTagger = CleanNewsAutoTagger;
}
