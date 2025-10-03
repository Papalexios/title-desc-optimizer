import { SeoData } from '../types';

// A single, high-performance, commercial-grade proxy endpoint replaces the old, unreliable system.
const CORS_PROXY = (url: string) => `https://cors.sh/${encodeURIComponent(url)}`;
const NON_HTML_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg|pdf|zip|xml|css|js|ico|json|txt|docx|xls|xlsx|ppt|pptx)(\?.*)?$/i;

/**
 * A robust fetch wrapper that includes a timeout to prevent hanging requests.
 */
function fetchWithTimeout(resource: RequestInfo, options: RequestInit = {}, timeout = 15000): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const response = fetch(resource, {
        ...options,
        signal: controller.signal
    });
    response.finally(() => {
        clearTimeout(id);
    });
    return response;
}

/**
 * An intelligent fetch utility that uses the new robust proxy.
 */
async function fetchWithProxy(url: string): Promise<Response> {
    const proxiedUrl = CORS_PROXY(url);
    const response = await fetchWithTimeout(proxiedUrl, {}, 15000); // 15s timeout
    if (!response.ok) {
        throw new Error(`Request failed with status: ${response.status} ${response.statusText}`);
    }
    return response;
}


/**
 * Fetches and parses HTML with automatic retries and a robust proxy.
 */
async function fetchAndParseHtml(url: string, retries = 3, delay = 1000): Promise<{ title: string; description: string }> {
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
        try {
            const response = await fetchWithProxy(url);

            const html = await response.text();
            if (!html) throw new Error(`Empty response for ${url}`);

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const title = doc.querySelector('title')?.textContent || '';
            const description = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';

            return { title, description }; // Success!
        } catch (error) {
            const err = error as Error;
            let reason = err.message;
            if (err.name === 'AbortError') {
                reason = `Request timed out.`;
            }

            if (attempt > retries) {
                console.error(`Error fetching ${url} after ${attempt} attempts:`, reason);
                throw error;
            }

            const retryDelay = delay * Math.pow(2, attempt - 1) + Math.random() * 500;
            console.warn(`Request for ${url} failed (${reason}). Retrying in ${retryDelay.toFixed(0)}ms... (Attempt ${attempt}/${retries})`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }
    throw new Error(`Failed to fetch ${url} after all retries.`);
}

/**
 * Professional sitemap discovery engine. First checks robots.txt, then falls back to common paths.
 */
async function findSitemaps(siteUrl: string): Promise<string[]> {
    const sitemaps = new Set<string>();
    const robotsUrl = new URL('/robots.txt', siteUrl).href;

    // 1. Try robots.txt (the professional way)
    try {
        console.log(`Checking for sitemaps in ${robotsUrl}`);
        const response = await fetchWithProxy(robotsUrl);
        const text = await response.text();
        const matches = text.matchAll(/^Sitemap:\s*(.*)/gim);
        for (const match of matches) {
            sitemaps.add(match[1].trim());
        }
        if (sitemaps.size > 0) {
            console.log(`Found ${sitemaps.size} sitemap(s) in robots.txt:`, Array.from(sitemaps));
            return Array.from(sitemaps);
        }
    } catch (e) {
        console.warn(`Could not fetch or parse robots.txt: ${(e as Error).message}`);
    }

    // 2. If robots.txt fails or is empty, try common paths
    console.log("No sitemaps in robots.txt, checking common paths...");
    const commonPaths = ['/sitemap.xml', '/sitemap_index.xml', '/post-sitemap.xml', '/page-sitemap.xml'];
    const pathChecks = commonPaths.map(async path => {
        const potentialSitemapUrl = new URL(path, siteUrl).href;
        try {
            const response = await fetchWithProxy(potentialSitemapUrl);
            // Check headers for XML content type to ensure it's likely a sitemap
            if (response.ok && (response.headers.get('content-type')?.includes('xml') || response.headers.get('content-type')?.includes('text/xml'))) {
                 console.log(`Found sitemap at common path: ${potentialSitemapUrl}`);
                 return potentialSitemapUrl;
            }
        } catch (e) { /* It's normal for these to fail with 404, so we don't log an error. */ }
        return null;
    });

    return (await Promise.all(pathChecks)).filter((url): url is string => !!url);
}

/**
 * A robust sitemap parser that handles nested sitemap index files and XML namespaces.
 */
async function parseSitemap(sitemapXml: string, sitemapUrl: string): Promise<string[]> {
    const parser = new DOMParser();
    const sitemapDoc = parser.parseFromString(sitemapXml, "application/xml");
    if (sitemapDoc.querySelector("parsererror")) throw new Error(`Failed to parse XML for sitemap: ${sitemapUrl}`);

    // If it's a sitemap index, recursively fetch and parse all child sitemaps
    const sitemapNodes = sitemapDoc.getElementsByTagName("sitemap");
    if (sitemapNodes.length > 0) {
        console.log(`Sitemap index detected at ${sitemapUrl}. Fetching ${sitemapNodes.length} nested sitemaps...`);
        const sitemapUrls = Array.from(sitemapNodes)
            .map(node => node.getElementsByTagName('loc')[0]?.textContent)
            .filter((text): text is string => !!text);

        const nestedUrlPromises = sitemapUrls.map(async (nestedSitemapUrl) => {
            try {
                const response = await fetchWithProxy(nestedSitemapUrl);
                const nestedSitemapXml = await response.text();
                return parseSitemap(nestedSitemapXml, nestedSitemapUrl); // Recursive call
            } catch (e) {
                console.warn(`Failed to process nested sitemap ${nestedSitemapUrl}:`, (e as Error).message);
                return [];
            }
        });
        return (await Promise.all(nestedUrlPromises)).flat();
    }

    // Otherwise, it's a regular sitemap with page URLs
    const urlNodes = sitemapDoc.getElementsByTagName("url");
    return Array.from(urlNodes)
        .map(node => node.getElementsByTagName('loc')[0]?.textContent)
        .filter((text): text is string => !!text);
}


/**
 * An "ultra-fast" concurrency pool, now without artificial delays for maximum throughput.
 */
async function processUrlsWithConcurrency<T>(
    urls: string[],
    asyncFn: (url: string) => Promise<T | null>,
    concurrencyLimit: number,
    onProgress: (crawled: number, total: number) => void
): Promise<(T | null)[]> {
    const results: (T | null)[] = new Array(urls.length);
    let completed = 0;
    let index = 0;

    const worker = async () => {
        while (index < urls.length) {
            const currentIndex = index++;
            const url = urls[currentIndex];
            try {
                results[currentIndex] = await asyncFn(url);
            } catch {
                results[currentIndex] = null;
            } finally {
                completed++;
                onProgress(completed, urls.length);
            }
        }
    };

    const workers = Array.from({ length: Math.min(concurrencyLimit, urls.length) }, worker);
    await Promise.all(workers);
    return results;
}

/**
 * The main crawler function, orchestrating the state-of-the-art fetching and parsing logic.
 */
export const crawlSite = async (
    url: string,
    sitemapUrl?: string,
    onProgress: (crawled: number, total: number) => void = () => {}
): Promise<SeoData[]> => {
    console.log(`Starting state-of-the-art crawl for: ${url}`);
    
    let sitemapLocations: string[] = [];

    // Prioritize user-provided sitemap, otherwise discover automatically
    if (sitemapUrl) {
        console.log(`User provided a specific sitemap: ${sitemapUrl}`);
        sitemapLocations = [sitemapUrl];
    } else {
        sitemapLocations = await findSitemaps(url);
    }
    
    // CRITICAL CHANGE: Provide a clear error instead of silently failing
    if (sitemapLocations.length === 0) {
        throw new Error("Could not automatically discover a sitemap. Please find your sitemap URL (often ending in .xml) and provide it in the optional input field.");
    }
    
    console.log(`Processing sitemaps:`, sitemapLocations);

    // Fetch and parse all discovered sitemaps concurrently
    const sitemapProcessingPromises = sitemapLocations.map(async (loc) => {
        try {
            const response = await fetchWithProxy(loc);
            const sitemapXml = await response.text();
            return await parseSitemap(sitemapXml, loc);
        } catch(e) {
            console.warn(`Could not process sitemap at ${loc}:`, (e as Error).message);
            return [];
        }
    });

    const allUrlsFromSitemaps = (await Promise.all(sitemapProcessingPromises)).flat();
    
    // Deduplicate and filter URLs
    const uniqueUrls = Array.from(new Set(allUrlsFromSitemaps));
    const pageUrls = uniqueUrls.filter(u => !NON_HTML_EXTENSIONS.test(u));

    if (pageUrls.length === 0) {
        throw new Error("Found sitemap(s), but they contained no valid, crawlable HTML page URLs after filtering.");
    }

    console.log(`Discovered ${uniqueUrls.length} unique URLs. Analyzing ${pageUrls.length} filtered HTML pages.`);
    
    // Dramatically increased concurrency for a massive speed boost.
    const CONCURRENCY_LIMIT = 30;
    console.log(`Processing ${pageUrls.length} URLs with a concurrency limit of ${CONCURRENCY_LIMIT}.`);
    onProgress(0, pageUrls.length);

    const crawlFn = (pageUrl: string) =>
        fetchAndParseHtml(pageUrl).then(data => ({ ...data, url: pageUrl }));

    const results = await processUrlsWithConcurrency(pageUrls, crawlFn, CONCURRENCY_LIMIT, onProgress);
    const validResults = results.filter((result): result is SeoData => result !== null);

    if (validResults.length === 0) {
        throw new Error("Crawled all URLs from the sitemap but could not retrieve SEO data from any of them. The site may be blocking the crawler, or have other accessibility issues.");
    }

    console.log(`Successfully crawled and processed ${validResults.length} pages.`);
    return validResults;
};