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

    // Håndterer formater som '11.10.2026' eller '11. 10. 2026'
    let isoStr = dateStr;
    const dotMatch = dateStr.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
    if (dotMatch) {
        isoStr = `${dotMatch[3]}-${dotMatch[2].padStart(2, '0')}-${dotMatch[1].padStart(2, '0')}`;
    }

    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return dateStr;

    // Formaterer på engelsk (eller endre 'en-GB' til 'nb-NO' hvis du foretrekker norsk)
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
            // Bilder: ![alt](url)
            .replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+\vert{}\/[^\s)]+)\)/g, '<img src="$2" alt="$1" class="article-body-img">')
            // Lenker: [tekst](url)
            .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+\vert{}\/[^\s)]+)\)/g, '<a href="$2" class="table-link" target="_blank" rel="noopener">$1</a>')
            // Fet skrift: **tekst**
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            // Kursiv: *tekst* eller _tekst_
            .replace(/(^|[^*])\*([^*]+)\*([^*]|$)/g, '$1<em>$2</em>$3')             .replace(/(^\vert{}[^_])_([^_]+)_([^_]\vert{}$)/g, '$1<em>$2</em>$3')
            // Gjennomstreking: ~~tekst~~
            .replace(/~~([^~]+)~~/g, '<del>$1</del>')
            // Inline kode: `kode`
            .replace(/`([^`]+)`/g, '<code>$1</code>');
    }

    // Hvis editoren allerede leverer ferdig HTML (<p>, <div>, <h1> osv.)
    if (bodyText.includes('<p>') || bodyText.includes('<div>') || bodyText.includes('<h')) {
        return parseMarkdown(bodyText);
    }

    // Hvis editoren lagrer ren tekst / Markdown med linjeskift
    return bodyText
        .split(/\n\s*\n/)
        .map(p => {
            const trimmed = p.trim();
            // Støtte for overskrifter (f.eks. ## Overskrift)
            if (trimmed.startsWith('### ')) {
                return `<h3>${parseMarkdown(trimmed.slice(4))}</h3>`;
            }
            if (trimmed.startsWith('## ')) {
                return `<h2>${parseMarkdown(trimmed.slice(3))}