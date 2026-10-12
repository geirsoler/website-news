// URL til rådataene på GitHub
const NEWS_DATA_URL = 'https://raw.githubusercontent.com/geirsoler/website-news/main/news.json';

function parseNewsDate(dateStr) {
    if (!dateStr) return 0;
    // Håndterer formater som DD.MM.YYYY eller DD. MM. YYYY
    const dotMatch = dateStr.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
    if (dotMatch) {
        return new Date(`${dotMatch[3]}-${dotMatch[2].padStart(2, '0')}-${dotMatch[1].padStart(2, '0')}`).getTime();
    }
    // Håndterer ISO / YYYY-MM-DD
    const parsed = new Date(dateStr).getTime();
    return isNaN(parsed) ? 0 : parsed;
}

async function fetchNews() {
    try {
        const response = await fetch(NEWS_DATA_URL);
        if (!response.ok) throw new Error('Kunne ikke hente nyheter');
        const data = await response.json();
        const items = Array.isArray(data) ? data : (data.items || []);

        // Sorterer synkende etter dato: nyeste dato havner alltid først
        items.sort((a, b) => parseNewsDate(b.date) - parseNewsDate(a.date));

        return items;
    } catch (error) {
        console.error('Feil ved henting av nyheter:', error);
        return [];
    }
}