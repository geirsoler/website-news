                                                                 // URL til rådataene på GitHub
const NEWS_DATA_URL = 'https://raw.githubusercontent.com/geirsoler/website-news/main/news.json';

async function fetchNews() {
    try {
        const response = await fetch(NEWS_DATA_URL);
        if (!response.ok) throw new Error('Kunne ikke hente nyheter');
        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error('Feil ved henting av nyheter:', error);
        return [];
    }
}