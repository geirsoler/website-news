const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://geirsolerod.no';
const NEWS_FILE = path.join(__dirname, '..', 'news.json');

function extractYouTubeId(urlOrId) {
    if (!urlOrId) return null;
    const match = urlOrId.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : (urlOrId.trim().length === 11 ? urlOrId.trim() : null);
}

function formatBody(bodyText) {
    if (!bodyText) return '';
    if (bodyText.includes('<p>') || bodyText.includes('<div>')) {
        return bodyText;
    }
    return bodyText
        .split(/\n\s*\n/)
        .map(p => `<p>${p.trim().replace(/\n/g, '<br>')}</p>`)
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

function buildArticleHtml(item, year) {
    const articleUrl = `${SITE_URL}/news/${year}/${item.id}.html`;
    
    let ogImageUrl = `${SITE_URL}/images/Geir Solerød profilbilde 1_1.jpg`;
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
        <div class="article-links">
            ${item.links.map(l => {
                const cleanLabel = l.label.replace(/&rarr;|→/g, '').trim();
                const icon = getLinkIcon(l);
                return `
                    <a href="${l.url}" class="btn btn-primary" target="_blank" rel="noopener" style="display: inline-flex; align-items: center; gap: 0.5rem;">
                        ${icon}
                        <span>${cleanLabel}</span>
                    </a>
                `;
            }).join('')}
        </div>
    ` : '';

    const displayDate = item.displayDate || item.date || '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${item.title} | Geir Soler&oslash;d</title>
    <meta name="description" content="${item.teaser || item.title}">
    <link rel="canonical" href="${articleUrl}">
    <link rel="icon" type="image/svg+xml" href="../../my-favicons/favicon.svg">

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="article">
    <meta property="og:title" content="${item.title}">
    <meta property="og:description" content="${item.teaser || ''}">
    <meta property="og:url" content="${articleUrl}">
    <meta property="og:image" content="${ogImageUrl}">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${item.title}">
    <meta name="twitter:description" content="${item.teaser || ''}">
    <meta name="twitter:image" content="${ogImageUrl}">

    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,500;0,6..96,600;0,6..96,700;1,6..96,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">

    <!-- Felles CSS -->
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
            margin: 2rem auto 5rem auto;
            padding: 0 1.5rem;
        }

        .back-nav {
            margin-bottom: 2rem;
        }

        .back-link {
            color: var(--accent);
            text-decoration: none;
            font-size: 0.9rem;
            font-weight: 500;
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            transition: color 0.2s ease;
        }

        .back-link:hover {
            color: var(--accent-hover);
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
            margin: 2rem 0;
        }

        .article-body p {
            margin-bottom: 1.4rem;
        }

        .article-links {
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
            margin-top: 2.5rem;
            padding-top: 1.8rem;
            border-top: 1px solid var(--border);
        }

        .btn-primary .icon-score {
            width: 14px;
            height: 17px;
            transform: translateY(1px);
            filter: brightness(0) !important;
        }

        .btn-primary .icon-cat {
            width: 14px;
            height: 14px;
            transform: translateY(0);
            filter: brightness(0) !important;
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
        <div class="back-nav">
            <a href="../../news.html" class="back-link">&larr; Back to all news</a>
        </div>

        <article class="single-article-card">
            <header>
                <div class="article-meta">
                    <span class="news-tag">${item.category || 'Update'}</span>
                    <span class="news-date">${displayDate}</span>
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

function runBuild() {
    if (!fs.existsSync(NEWS_FILE)) {
        console.error('Fant ikke news.json på sti:', NEWS_FILE);
        process.exit(1);
    }

    const rawData = fs.readFileSync(NEWS_FILE, 'utf8');
    const parsed = JSON.parse(rawData);
    const newsItems = Array.isArray(parsed) ? parsed : (parsed.items || []);

    console.log(`Bygger ${newsItems.length} artikler...`);

    newsItems.forEach(item => {
        let year = '2026';
        if (item.date && item.date.match(/^\d{4}/)) {
            year = item.date.slice(0, 4);
        }

        const targetDir = path.join(__dirname, '..', 'news', year);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const filePath = path.join(targetDir, `${item.id}.html`);
        const html = buildArticleHtml(item, year);

        fs.writeFileSync(filePath, html, 'utf8');
        console.log(`✓ Generert: news/${year}/${item.id}.html`);
    });

    console.log('Ferdig!');
}

runBuild();
