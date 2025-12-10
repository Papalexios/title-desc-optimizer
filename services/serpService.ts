import { robustFetch } from './fetchService';
import { SerpResult } from '../types';

function parseSerpHTML(html: string): SerpResult[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const results: SerpResult[] = [];
    const resultSelectors = ['div.g', 'div.tF2Cxc', 'div.kvH3mc'];

    doc.querySelectorAll(resultSelectors.join(', ')).forEach(el => {
        const titleEl = el.querySelector('h3');
        const linkEl = el.querySelector('a');
        if (titleEl && linkEl) {
            const url = linkEl.href;
            const title = titleEl.innerText;
            const descriptionEl = el.querySelector('div.VwiC3b, div.s, span.st');
            const description = descriptionEl ? (descriptionEl as HTMLElement).innerText : '';
            if (url && title && url.startsWith('http')) {
                results.push({ title: title.trim(), url, description: description.trim() });
            }
        }
    });
    return results.slice(0, 7);
}

export async function fetchSerpData(query: string, location?: string): Promise<SerpResult[]> {
    console.log(`Fetching live SERP data for query: "${query}" ${location ? `in "${location}"` : ''}`);
    const searchQuery = location ? `${query} in ${location}` : query;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&gl=us&hl=en`;

    try {
        const response = await robustFetch(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        }, { timeout: 20000 });

        const html = await response.text();
        const serpResults = parseSerpHTML(html);

        if (serpResults.length === 0) {
            console.warn(`SERP parsing returned 0 results for "${query}".`);
        }
        return serpResults;
    } catch (error) {
        console.error(`Failed to fetch or parse SERP data for query "${query}":`, error);
        return [];
    }
}
