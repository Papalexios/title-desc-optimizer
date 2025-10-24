import { robustFetch } from './fetchService';
import { SerpResult } from '../types';

/**
 * Parses the HTML content of a search engine results page to extract organic results.
 * This parser is designed to be resilient to minor changes in SERP structure.
 */
function parseSerpHTML(html: string): SerpResult[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const results: SerpResult[] = [];

    // Common selectors for Google's organic result containers.
    // This array makes the scraper adaptable to different SERP layouts.
    const resultSelectors = [
        'div.g', // Standard organic result
        'div.tF2Cxc', // Another common container
        'div.kvH3mc' // Often used for featured snippets or other rich results
    ];

    doc.querySelectorAll(resultSelectors.join(', ')).forEach(el => {
        // Find the main link and title element (usually an h3).
        const titleEl = el.querySelector('h3');
        const linkEl = el.querySelector('a');

        if (titleEl && linkEl) {
            const url = linkEl.href;
            const title = titleEl.innerText;

            // Find the description snippet. Google uses various selectors for this.
            const descriptionEl = el.querySelector('div.VwiC3b, div.s, span.st, div.a-truncate');
            const description = descriptionEl ? (descriptionEl as HTMLElement).innerText : '';
            
            // Basic validation to ensure it's a plausible search result and not an ad or other element.
            if (url && title && url.startsWith('http')) {
                results.push({
                    title: title.trim(),
                    url,
                    description: description.trim()
                });
            }
        }
    });

    // Limit to the top 7 results to keep the context for the AI concise and relevant.
    return results.slice(0, 7);
}


/**
 * Fetches and parses live search engine results for a given query.
 * It relies on the robustFetch utility to cycle through CORS proxies to scrape Google.
 */
export async function fetchSerpData(query: string, location?: string): Promise<SerpResult[]> {
    console.log(`Fetching live SERP data for query: "${query}" ${location ? `in "${location}"` : ''}`);
    
    const searchQuery = location ? `${query} in ${location}` : query;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&gl=us&hl=en`;

    try {
        // A production-grade implementation would use a dedicated SERP API.
        // For this app, we rely on our robustFetch utility which will cycle through CORS proxies
        // to scrape Google, which is necessary for modern SERPs.
        const response = await robustFetch(searchUrl, {
            headers: {
                 // Mimic a real browser to reduce chances of being blocked.
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        }, { timeout: 20000 }); // Longer timeout for scraping services

        const html = await response.text();
        const serpResults = parseSerpHTML(html);

        if (serpResults.length === 0) {
            console.warn(`SERP parsing returned 0 results for "${query}". The SERP structure may have changed, or the scraping service was blocked.`);
        }

        return serpResults;

    } catch (error) {
        console.error(`Failed to fetch or parse SERP data for query "${query}":`, error);
        // It's better to return an empty array than to fail the entire rewrite process.
        // The AI prompt is designed to handle this case gracefully.
        return [];
    }
}
