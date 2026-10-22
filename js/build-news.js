const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://geirsolerod.no';
const ROOT_DIR = path.join(__dirname, '..');
const NEWS_FILE = path.join(ROOT_DIR, 'news.json');
const INDEX_HTML_FILE = path.join(ROOT_DIR, 'index.html');
const NEWS_HTML_FILE = path.join(ROOT_DIR, 'news.html');
const SITEMAP_FILE = path.join(ROOT_DIR, 'sitemap.xml');
const ROBOTS_FILE = path.join(ROOT_DIR, 'robots.txt');

// Hjelpefunksjon: Skriver kun til filen hvis innholdet faktisk er endret
function writeIfChanged(filePath, newContent) {
    if (fs.existsSync(filePath)) {
        const existingContent = fs.readFileSync(filePath, 'utf8');
        // Normaliserer linjeskift slik at CRLF vs LF ikke trigger unødvendig skriving
        const normExisting = existingContent.replace(/\r\n/g, '\n');
        const normNew = newContent.replace(/\r\n/g, '\n');
        if (normExisting === normNew) {
            return false; // Ingen faktisk innholdsendring
        }
    }
    fs.writeFileSync(filePath, newContent, 'utf8');
    return true; // Filen ble oppdatert
}

function extractYouTubeId(urlOrId) {
    if (!urlOrId) return null;
    const match = urlOrId.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : (urlOrId.trim().length === 11 ? urlOrId.trim() : null);
}

function formatDate(dateStr) {
    if (!dateStr) return '';

    let isoStr = dateStr;
    const dotMatch = dateStr.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
    if (dotMatch) {
        isoStr = `${dotMatch[3]}-${dotMatch[2].padStart(2, '0')}-${dotMatch[1].padStart(2, '0')}`;
    }

    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return dateStr;

    return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function formatBody(bodyText) {
    if (!bodyText) return '';

    function parseMarkdown(str) {
        return str
            .replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g, '<img src="$2" alt="$1" class="article-body-img">')
            .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g, '<a href="$2" class="table-link" target="_blank" rel="noopener">$1</a>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/(^|[^*])\*([^*]+)\*([^*]|$)/g, '$1<em>$2</em>$3')
            .replace(/(^|[^_])_([^_]+)_([^_]|$)/g, '$1<em>$2</em>$3')
            .replace(/~~([^~]+)~~/g, '<del>$1</del>')
            .replace(/`([^`]+)`/g, '<code>$1</code>');
    }

    if (bodyText.includes('<p>') || bodyText.includes('<div>') || bodyText.includes('<h')) {
        return parseMarkdown(bodyText);
    }

    return bodyText
        .split(/\n\s*\n/)
        .map(p => {
            const trimmed = p.trim();
            if (trimmed.startsWith('### ')) {
                return `<h3>${parseMarkdown(trimmed.slice(4))}</h3>`;
            }
            if (trimmed.startsWith('## ')) {
                return `<h2>${parseMarkdown(trimmed.slice(3))}</h2>`;
            }
            if (trimmed.startsWith('# ')) {
                return `<h2>${parseMarkdown(trimmed.slice(2))}</h2>`;
            }
            if (trimmed.startsWith('> ')) {
                return `<blockquote>${parseMarkdown(trimmed.slice(2))}</blockquote>`;
            }

            const formatted = trimmed.replace(/\n/g, '<br>');
            return `<p>${parseMarkdown(formatted)}</p>`;
        })
        .join('\n');
}

function getLinkIcon(link) {
    const text = (link.label || '').toLowerCase();
    const url = (link.url || '').toLowerCase();

    if (text.includes('score') || text.includes('sheet') || url.includes('scoreexchange')) {
        return '<img src="../../svg/C-clef.svg" alt="" class="table-icon icon-score">';
    }
    if (text.includes('catalog') || url.includes('catalogue')) {
        return '<img src="../../svg/bulleted-list-catalogue-svgrepo-com.svg" alt="" class="table-icon icon-cat">';
    }
    return '';
}

function getThumbUrl(item) {
    const rawThumb = item.thumb || item.image;
    if (!rawThumb) return '';
    return rawThumb.startsWith('http')
        ? rawThumb
        : `https://raw.githubusercontent.com/geirsoler/website-news/main${rawThumb.startsWith('/') ? '' : '/'}${rawThumb}`;
}

function getItemYear(item) {
    if (item.date) {
        const yearMatch = item.date.match(/\b(20\d{2})\b/);
        if (yearMatch) return yearMatch[1];
    }
    return '2026';
}

function buildArticleHtml(item, year, index, allItems) {
    const articleUrl = `${SITE_URL}/news/${year}/${item.id}.html`;

    let ogImageUrl = `${SITE_URL}/img/profile.jpg`;
    let pageImageHtml = '';

    const chosenImage = (item.image && item.image.trim() !== '') ? item.image : (item.thumb || '');
    if (chosenImage && chosenImage.trim() !== '') {
        let cleanPath = chosenImage.trim();
        if (cleanPath.startsWith('http')) {
            ogImageUrl = cleanPath;
        } else {
            if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;
            ogImageUrl = `${SITE_URL}${cleanPath}`;
        }

        if (item.image && item.image.trim() !== '') {
            let pageImgPath = item.image.trim();
            if (!pageImgPath.startsWith('http') && !pageImgPath.startsWith('/')) pageImgPath = '/' + pageImgPath;
            pageImageHtml = `
                <div class="article-image-container">
                    <img src="${pageImgPath}" alt="${item.title.replace(/"/g, '&quot;')}" class="article-image">
                </div>
            `;
        }
    }

    const ytId = extractYouTubeId(item.youtube);
    const mediaHtml = ytId ? `
        <div class="article-video-container">
            <iframe
                src="https://www.youtube.com/embed/${ytId}"
                title="${item.title.replace(/"/g, '&quot;')}"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen>
            </iframe>
        </div>
    ` : '';

    const linksHtml = (item.links && item.links.length) ? `
        <div class="article-resources">
            <span class="resources-label">Score & Catalogue Links</span>
            <div class="article-links">
                ${item.links.map(l => {
                    const cleanLabel = l.label.replace(/&rarr;|→/g, '').trim();
                    const icon = getLinkIcon(l);
                    return `
                        <a href="${l.url}" class="btn btn-secondary article-btn" target="_blank" rel="noopener" style="display: inline-flex; align-items: center; gap: 0.5rem;">
                            ${icon}
                            <span>${cleanLabel}</span>
                        </a>
                    `;
                }).join('')}
            </div>
        </div>
    ` : '';

    const formattedPublishDate = formatDate(item.date);

    const prevItem = (allItems && index > 0) ? allItems[index - 1] : null;
    const nextItem = (allItems && index < allItems.length - 1) ? allItems[index + 1] : null;

    let prevBtnHtml = '';
    if (prevItem) {
        const prevYear = getItemYear(prevItem);
        prevBtnHtml = `<a href="/news/${prevYear}/${prevItem.id}.html" class="news-nav-btn news-nav-prev" title="${prevItem.title.replace(/"/g, '&quot;')}">&lt; Prev</a>`;
    } else {
        prevBtnHtml = `<span class="news-nav-btn disabled" style="opacity: 0.3; cursor: default;">&lt; Prev</span>`;
    }

    let nextBtnHtml = '';
    if (nextItem) {
        const nextYear = getItemYear(nextItem);
        nextBtnHtml = `<a href="/news/${nextYear}/${nextItem.id}.html" class="news-nav-btn news-nav-next" title="${nextItem.title.replace(/"/g, '&quot;')}">Next &gt;</a>`;
    } else {
        nextBtnHtml = `<span class="news-nav-btn disabled" style="opacity: 0.3; cursor: default;">Next &gt;</span>`;
    }

    const navBarHtml = `
    <nav class="news-nav-bar" aria-label="News navigation">
        ${prevBtnHtml}
        <a href="../../news.html" class="news-nav-btn">All News</a>
        ${nextBtnHtml}
    </nav>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${item.title} | Geir Soler&oslash;d</title>
    <meta name="description" content="${item.teaser || item.title}">
    <link rel="canonical" href="${articleUrl}">
    <link rel="icon" type="image/svg+xml" href="../../my-favicons/favicon.svg">

    <meta property="og:type" content="article">
    <meta property="og:title" content="${item.title}">
    <meta property="og:description" content="${item.teaser || ''}">
    <meta property="og:url" content="${articleUrl}">
    <meta property="og:image" content="${ogImageUrl}">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${item.title}">
    <meta name="twitter:description" content="${item.teaser || ''}">
    <meta name="twitter:image" content="${ogImageUrl}">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,500;0,6..96,600;0,6..96,700;1,6..96,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">

    <link rel="stylesheet" href="../../css/main.css">

    <style>
        h1 {
            font-family: 'Bodoni Moda', serif;
            font-size: clamp(2.4rem, 5vw, 3.8rem);
            color: var(--text-bright);
            letter-spacing: 1px;
            margin-bottom: 0.4rem;
            font-weight: 600;
            line-height: 1.1;
        }

        .main-nav {
            position: -webkit-sticky;
            position: sticky;
            top: 1rem;
            z-index: 500;
            max-width: 580px;
            margin: 1.4rem auto 1rem;
            background: rgba(15, 20, 26, 0.88);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 10px;
            padding: 0.55rem 1.4rem;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }

        .nav-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
        }

        .nav-container a {
            color: var(--text);
            text-decoration: none;
            font-size: 0.85rem;
            font-weight: 500;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            transition: color 0.2s;
        }

        .nav-container a:hover,
        .nav-container a.active-link {
            color: var(--accent);
        }

        .article-wrapper {
            max-width: 860px;
            margin: 1.5rem auto 5rem auto;
            padding: 0 1.5rem;
        }

        .news-nav-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
            padding: 0 0.2rem;
        }

        .news-nav-btn {
            color: var(--accent) !important;
            background: none !important;
            border: none !important;
            padding: 0 !important;
            text-decoration: none;
            font-size: 0.9rem;
            font-weight: 500;
            transition: color 0.2s ease;
        }

        .news-nav-btn:hover {
            color: var(--accent-hover) !important;
            text-decoration: underline;
        }

        .single-article-card {
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 2.5rem;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
        }

        .article-meta {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 1.2rem;
        }

        .article-title {
            font-family: 'Bodoni Moda', serif;
            font-size: clamp(2rem, 3.8vw, 2.7rem);
            line-height: 1.25;
            color: var(--text-bright);
            letter-spacing: 0.4px;
            margin: 0 0 1.5rem 0;
            font-weight: 600;
        }

        .article-teaser {
            font-size: 1.15rem;
            line-height: 1.65;
            color: var(--text-bright);
            margin-bottom: 2rem;
            border-left: 3px solid var(--accent);
            padding-left: 1.2rem;
            font-style: italic;
        }

        .article-image-container {
            width: 100%;
            margin: 2rem 0;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid var(--border);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
        }

        .article-image {
            width: 100%;
            height: auto;
            max-height: 500px;
            object-fit: cover;
            display: block;
        }

        .article-video-container {
            position: relative;
            padding-bottom: 56.25%;
            height: 0;
            overflow: hidden;
            border-radius: 8px;
            margin: 2rem 0;
            background: #000;
            border: 1px solid var(--border);
            box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }

        .article-video-container iframe {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%; border: 0;
        }

        .article-body {
            font-size: 1.02rem;
            line-height: 1.75;
            color: var(--text);
            margin: 2rem 0 0 0;
        }

        .article-body p {
            margin-bottom: 1.4rem;
        }

        .article-resources {
            margin-top: 2.5rem;
            padding-top: 1.5rem;
            border-top: 1px solid var(--border);
            background: transparent;
        }

        .resources-label {
            display: block;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 1.2px;
            color: #94a3b8;
            font-weight: 600;
            margin-bottom: 0.9rem;
        }

        .article-links {
            display: flex;
            flex-wrap: wrap;
            gap: 0.8rem;
        }

        .article-btn {
            font-size: 0.85rem;
            padding: 0.5rem 1rem;
        }

        @media (max-width: 850px) {
            .main-nav {
                margin: 0 auto 0.6rem !important;
            }

            .article-wrapper {
                margin-top: 1rem !important;
            }
        }

        @media (max-width: 768px) {
            .main-nav {
                top: 0;
                max-width: 100% !important;
                border-radius: 0 !important;
                border-left: none !important;
                border-right: none !important;
                border-top: none !important;
                border-bottom: 1px solid var(--border) !important;
                padding: 0.65rem 1rem !important;
                margin: 0 0 0.5rem 0 !important;
            }

            .article-wrapper {
                padding: 0 1rem;
                margin-top: 1.2rem;
            }

            .single-article-card {
                padding: 1.5rem;
            }
        }
    </style>
</head>

<body>

    <header id="top">
        <h1>Geir Soler&oslash;d</h1>
        <div class="subtitle">Composer &bull; Lyricist &bull; Arranger</div>
    </header>

    <nav class="main-nav" id="main-nav">
        <div class="nav-container">
            <a href="../../index.html#top">Home</a>
            <a href="../../index.html#works">Works</a>
            <a href="../../news.html" class="active-link">News</a>
            <a href="../../index.html#biography">Bio</a>
            <a href="../../index.html#contact">Contact</a>

            <div class="menu-dropdown-wrapper">
                <button id="menu-btn" class="menu-btn" aria-label="Toggle navigation menu" aria-expanded="false">
                    <span class="bar"></span>
                    <span class="bar"></span>
                    <span class="bar"></span>
                </button>

                <div id="dropdown-menu" class="dropdown-menu">
                    <div class="dropdown-header">Pages</div>
                    <a href="../../index.html" class="dropdown-item">
                        <img src="../../svg/home-svgrepo-com.svg" alt="Home" class="table-icon icon-home">
                        <span>Home</span>
                    </a>
                    <a href="../../news.html" class="dropdown-item active-page">
                        <img src="../../svg/chat-bubble-sign-svgrepo-com.svg" alt="News" class="table-icon icon-news">
                        <span>News &amp; Updates</span>
                    </a>
                    <a href="../../catalogue.html" class="dropdown-item">
                        <img src="../../svg/bulleted-list-catalogue-svgrepo-com.svg" alt="Catalogue" class="table-icon icon-cat">
                        <span>Complete Catalogue</span>
                    </a>

                    <div class="dropdown-divider"></div>
                    <div class="dropdown-header">Sections on Home</div>
                    <a href="../../index.html#about" class="dropdown-item">About</a>
                    <a href="../../index.html#news" class="dropdown-item">Latest News</a>
                    <a href="../../index.html#works" class="dropdown-item">Selected Works</a>

                    <div class="dropdown-sub-items">
                        <a href="../../index.html#work-concert-band" class="dropdown-item dropdown-sub-item">Concert Band</a>
                        <a href="../../index.html#work-symphony-1" class="dropdown-item dropdown-sub-item">Orchestra</a>
                        <a href="../../index.html#work-marko-adriane" class="dropdown-item dropdown-sub-item">Stage Music</a>
                        <a href="../../index.html#work-choral-vocal" class="dropdown-item dropdown-sub-item">Choral Music</a>
                        <a href="../../index.html#work-literary-writing" class="dropdown-item dropdown-sub-item">Lyrics &amp; Texts</a>
                    </div>

                    <a href="../../index.html#biography" class="dropdown-item">Biography &amp; CV</a>
                    <a href="../../index.html#contact" class="dropdown-item">Contact</a>
                </div>
            </div>
        </div>
    </nav>

    <main class="article-wrapper">
        ${navBarHtml}

        <article class="single-article-card">
            <header>
                <div class="article-meta">
                    <span class="news-tag">${item.category || 'Update'}</span>
                    <span class="news-date">${formattedPublishDate}</span>
                </div>
                <h1 class="article-title">${item.title}</h1>
                ${item.teaser ? `<div class="article-teaser">${item.teaser}</div>` : ''}
            </header>

            ${pageImageHtml}
            ${mediaHtml}

            <div class="article-body">
                ${formatBody(item.body)}
            </div>

            ${linksHtml}
        </article>

        <div style="margin-top: 2rem;">
            ${navBarHtml}
        </div>
    </main>

    <footer id="footer">
        <div style="margin-bottom: 1.25rem; display: flex; justify-content: center; gap: 1.5rem; flex-wrap: wrap;">
            <a href="../../index.html#contact" style="color: var(--accent); text-decoration: none; font-size: 0.9rem;">Contact &amp; Inquiries</a>
            <span style="color: var(--border);">&bull;</span>
            <a href="https://www.scoreexchange.com/profiles/geir-solerod" target="_blank" rel="noopener" style="color: var(--accent); text-decoration: none; font-size: 0.9rem;">Sheet Music &amp; Scores</a>
            <span style="color: var(--border);">&bull;</span>
            <a href="https://www.facebook.com/gsun.music" target="_blank" rel="noopener" style="color: var(--accent); text-decoration: none; font-size: 0.9rem;">Facebook</a>
        </div>
        <p>&copy; 2026 Geir Soler&oslash;d. All rights reserved.</p>
    </footer>

    <a href="#top" id="floating-top-btn" class="floating-top-btn" title="Scroll to top">
        <span>&uarr; Top</span>
    </a>

    <script src="../../js/jsmain.js"></script>
</body>
</html>`;
}

function generateIndexNewsHtml(items) {
    const latest = items.slice(0, 2);
    return latest.map(item => {
        const thumbUrl = getThumbUrl(item);
        const year = getItemYear(item);
        const articleUrl = `/news/${year}/${encodeURIComponent(item.id)}.html`;

        const thumbHtml = thumbUrl ? `
                    <a href="${articleUrl}" class="news-card-thumb-link">
                        <img src="${thumbUrl}" alt="${item.title.replace(/"/g, '&quot;')}" class="news-card-thumb-img">
                    </a>` : '';

        return `                <article class="news-card-compact ${thumbUrl ? 'has-thumb' : 'no-thumb'}">
                    <div class="news-card-inner">
                        ${thumbHtml}
                        <div class="news-card-content">
                            <div class="news-meta-row">
                                <span class="news-tag">${item.category || 'Update'}</span>
                                <span class="news-date">${item.date || ''}</span>
                            </div>
                            <h3><a href="${articleUrl}">${item.title}</a></h3>
                            <p>${item.teaser || ''}</p>
                            <div>
                                <a href="${articleUrl}" class="read-more">Read more</a>
                            </div>
                        </div>
                    </div>
                </article>`;
    }).join('\n');
}

function generateNewsPageHtml(items) {
    if (!items || items.length === 0) {
        return '                <p style="color: #94a3b8; text-align: center;">No news updates found.</p>';
    }

    return items.map(item => {
        const thumbUrl = getThumbUrl(item);
        const year = getItemYear(item);
        const articleUrl = `/news/${year}/${encodeURIComponent(item.id)}.html`;

        const thumbHtml = thumbUrl ? `
                        <a href="${articleUrl}" class="news-feed-thumb-link">
                            <img src="${thumbUrl}" alt="${item.title.replace(/"/g, '&quot;')}" class="news-feed-thumb-img">
                        </a>` : '';

        return `            <article class="news-feed-entry">
                <div class="news-feed-inner">
                    ${thumbHtml}
                    <div class="news-feed-content">
                        <div class="news-meta-row">
                            <span class="news-tag">${item.category || 'Update'}</span>
                            <span class="news-date">${item.date || ''}</span>
                        </div>
                        <h2><a href="${articleUrl}">${item.title}</a></h2>
                        <p class="teaser-text">${item.teaser || ''}</p>
                        <div>
                            <a href="${articleUrl}" class="btn btn-secondary">
                                Read full article &rarr;
                            </a>
                        </div>
                    </div>
                </div>
            </article>`;
    }).join('\n');
}

function updateFileFeed(filePath, newFeedHtml) {
    if (!fs.existsSync(filePath)) {
        console.warn(`Advarsel: Fant ikke fil ${filePath}`);
        return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const startTag = '<!-- START_NEWS_FEED -->';
    const endTag = '<!-- END_NEWS_FEED -->';

    const startIndex = content.indexOf(startTag);
    const endIndex = content.indexOf(endTag);

    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
        console.warn(`Advarsel: Fant ikke markørene ${startTag} og ${endTag} i ${path.basename(filePath)}`);
        return;
    }

    const before = content.slice(0, startIndex + startTag.length);
    const after = content.slice(endIndex);
    const updated = `${before}\n${newFeedHtml}\n${after}`;

    if (writeIfChanged(filePath, updated)) {
        console.log(`✓ Oppdatert statisk nyhetsfeed i ${path.basename(filePath)}`);
    }
}

function buildSitemapAndRobots(newsItems) {
    // 1. robots.txt
    const robotsTxt = `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
    if (writeIfChanged(ROBOTS_FILE, robotsTxt)) {
        console.log(`✓ Oppdatert: robots.txt`);
    }

    // 2. sitemap.xml
    const today = new Date().toISOString().split('T')[0];
    const staticPages = [
        { loc: `${SITE_URL}/`, priority: '1.0', changefreq: 'weekly' },
        { loc: `${SITE_URL}/catalogue.html`, priority: '0.9', changefreq: 'monthly' },
        { loc: `${SITE_URL}/news.html`, priority: '0.8', changefreq: 'weekly' }
    ];

    let sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    sitemapXml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    staticPages.forEach(p => {
        sitemapXml += `  <url>\n`;
        sitemapXml += `    <loc>${p.loc}</loc>\n`;
        sitemapXml += `    <lastmod>${today}</lastmod>\n`;
        sitemapXml += `    <changefreq>${p.changefreq}</changefreq>\n`;
        sitemapXml += `    <priority>${p.priority}</priority>\n`;
        sitemapXml += `  </url>\n`;
    });

    newsItems.forEach(item => {
        const year = getItemYear(item);
        const articleUrl = `${SITE_URL}/news/${year}/${item.id}.html`;
        let modDate = today;
        if (item.date && item.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            modDate = item.date;
        }

        sitemapXml += `  <url>\n`;
        sitemapXml += `    <loc>${articleUrl}</loc>\n`;
        sitemapXml += `    <lastmod>${modDate}</lastmod>\n`;
        sitemapXml += `    <changefreq>monthly</changefreq>\n`;
        sitemapXml += `    <priority>0.7</priority>\n`;
        sitemapXml += `  </url>\n`;
    });

    sitemapXml += `</urlset>\n`;

    if (writeIfChanged(SITEMAP_FILE, sitemapXml)) {
        console.log(`✓ Oppdatert: sitemap.xml (${staticPages.length + newsItems.length} adresser)`);
    }
}

function runBuild() {
    if (!fs.existsSync(NEWS_FILE)) {
        console.error('Fant ikke news.json på sti:', NEWS_FILE);
        process.exit(1);
    }

    const rawData = fs.readFileSync(NEWS_FILE, 'utf8');
    const parsed = JSON.parse(rawData);
    let newsItems = Array.isArray(parsed) ? parsed : (parsed.items || []);

    newsItems.sort((a, b) => {
        function parseD(dStr) {
            if (!dStr) return 0;
            const m = dStr.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
            if (m) return new Date(`${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`).getTime();
            return new Date(dStr).getTime() || 0;
        }
        return parseD(b.date) - parseD(a.date);
    });

    console.log(`Sjekker ${newsItems.length} artikler...`);

    let generatedCount = 0;
    newsItems.forEach((item, index) => {
        const year = getItemYear(item);
        const targetDir = path.join(ROOT_DIR, 'news', year);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const filePath = path.join(targetDir, `${item.id}.html`);
        const html = buildArticleHtml(item, year, index, newsItems);

        if (writeIfChanged(filePath, html)) {
            console.log(`✓ Generert / oppdatert: news/${year}/${item.id}.html`);
            generatedCount++;
        }
    });

    if (generatedCount === 0) {
        console.log(`(Alle artikler var uendret – hoppet over generering)`);
    }

    // Bak nyhetene direkte inn i index.html og news.html (kun hvis endret)
    const indexNewsHtml = generateIndexNewsHtml(newsItems);
    updateFileFeed(INDEX_HTML_FILE, indexNewsHtml);

    const newsPageHtml = generateNewsPageHtml(newsItems);
    updateFileFeed(NEWS_HTML_FILE, newsPageHtml);

    // Generer SEO-filer (sitemap.xml og robots.txt)
    buildSitemapAndRobots(newsItems);

    console.log('Ferdig!');
}

runBuild();