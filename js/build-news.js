const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://geirsolerod.no';
const NEWS_FILE = path.join(__dirname, '..', 'news.json');

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
            .replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+\vert{}\/[^\s)]+)\)/g, '<img src="$2" alt="$1" class="article-body-img">')
            .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+\vert{}\/[^\s)]+)\)/g, '<a href="$2" class="table-link" target="_blank" rel="noopener">$1</a>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/(^|[^*])\*([^*]+)\*([^*]|$)/g, '$1<em>$2</em>$3')             .replace(/(^\vert{}[^_])_([^_]+)_([^_]\vert{}$)/g, '$1<em>$2</em>$3')
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
                    const cleanLabel = l.label.replace(/&rarr;|?/g, '').trim();
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
        const prevYear = (prevItem.date && prevItem.date.match(/^\d{4}/)) ? prevItem.date.slice(0, 4) : '2026';
        prevBtnHtml = `<a href="/news/${prevYear}/${prevItem.id}.html" class="news-nav-btn news-nav-prev" title="${prevItem.title.replace(/"/g, '&quot;')}">&lt; Prev</a>`;
    } else {
        prevBtnHtml = `<span class="news-nav-btn disabled" style="opacity: 0.3; cursor: default;">&lt; Prev</span>`;
    }

    let nextBtnHtml = '';
    if (nextItem) {
        const nextYear = (nextItem.date && nextItem.date.match(/^\d{4}/)) ? nextItem.date.slice(0, 4) : '2026';
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
    <link rel="canonical"