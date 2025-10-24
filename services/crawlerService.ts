import { SeoData, SeoAnalysis, QuickScanResult } from '../types';
import { robustFetch } from './fetchService';

/**
 * NEW: Performs a fast, programmatic (non-AI) audit of all crawled pages.
 * This function identifies common, objective SEO issues without making any API calls.
 */
function performQuickScan(pages: SeoData[]): SeoAnalysis[] {
    const titleMap = new Map<string, string[]>();
    const descriptionMap = new Map<string, string[]>();

    // First pass: group pages by title and description to find duplicates
    pages.forEach(page => {
        if (page.title) {
            if (!titleMap.has(page.title)) titleMap.set(page.title, []);
            titleMap.get(page.title)!.push(page.url);
        }
        if (page.description) {
            if (!descriptionMap.has(page.description)) descriptionMap.set(page.description, []);
            descriptionMap.get(page.description)!.push(page.url);
        }
    });

    return pages.map(page => {
        const issues: string[] = [];
        const quickScanResult: QuickScanResult = {
            isTitleMissing: !page.title,
            isTitleTooLong: page.title.length > 60,
            isTitleTooShort: page.title.length > 0 && page.title.length < 30,
            isDescriptionMissing: !page.description,
            isDescriptionTooLong: page.description.length > 160,
            isDescriptionTooShort: page.description.length > 0 && page.description.length < 70,
            isTitleDuplicate: !!(page.title && titleMap.get(page.title)!.length > 1),
            isDescriptionDuplicate: !!(page.description && descriptionMap.get(page.description)!.length > 1),
        };

        if (quickScanResult.isTitleMissing) issues.push('Missing Title');
        if (quickScanResult.isTitleTooLong) issues.push('Title Too Long');
        if (quickScanResult.isTitleTooShort) issues.push('Title Too Short');
        if (quickScanResult.isTitleDuplicate) issues.push('Duplicate Title');
        if (quickScanResult.isDescriptionMissing) issues.push('Missing Description');
        if (quickScanResult.isDescriptionTooLong) issues.push('Description Too Long');
        if (quickScanResult.isDescriptionTooShort) issues.push('Description Too Short');
        if (quickScanResult.isDescriptionDuplicate) issues.push('Duplicate Description');

        return {
            ...page,
            status: 'scanned',
            issues,
            quickScan: quickScanResult,
        };
    });
}


/**
 * Fetches and parses HTML with automatic retries and a robust fetching layer.
 * Now extracts the main page content for deep AI analysis.
 */
async function fetchAndParseHtml(url: string, retries = 3, delay = 1000): Promise<{ title: string; description: string; content: string }> {
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
        try {
            const response = await robustFetch(url);

            const html = await response.text();
            if (!html) throw new Error(`Empty response for ${url}`);

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const title = doc.querySelector('title')?.textContent || '';
            const description = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
            
            const mainContentElement = doc.querySelector('main, article, [role="main"], .main-content, #main, #content');
            let contentText = '';
            if (mainContentElement) {
                const contentClone = mainContentElement.cloneNode(true) as HTMLElement;
                contentClone.querySelectorAll('script, style, nav, header, footer, aside, .sidebar, form, button, input').forEach(el => el.remove());
                contentText = contentClone.innerText.replace(/\s\s+/g, ' ').trim();
            } else {
                const bodyClone = doc.body.cloneNode(true) as HTMLElement;
                bodyClone.querySelectorAll('script, style, nav, header, footer, aside, .sidebar, form, button, input').forEach(el => el.remove());
                contentText = bodyClone.innerText.replace(/\s\s+/g, ' ').trim();
            }

            return { title, description, content: contentText.substring(0, 25000) };

        } catch (error) {
            const err = error as Error;
            let reason = err.message;

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
 * Professional sitemap discovery engine. Checks robots.txt, homepage, and then common paths.
 */
async function findSitemaps(siteUrl: string): Promise<string[]> {
    const sitemaps = new Set<string>();
    const robotsUrl = new URL('/robots.txt', siteUrl).href;

    try {
        console.log(`Checking for sitemaps in ${robotsUrl}`);
        const response = await robustFetch(robotsUrl);
        const text = await response.text();
        const matches = text.matchAll(/^Sitemap:\s*(.*)/gim);
        for (const match of matches) {
            sitemaps.add(match[1].trim());
        }
    } catch (e) {
        console.warn(`Could not fetch or parse robots.txt: ${(e as Error).message}`);
    }

    try {
        console.log(`Checking for sitemap <link> on homepage: ${siteUrl}`);
        const response = await robustFetch(siteUrl, { headers: { 'Accept': 'text/html' }});
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        doc.querySelectorAll('link[rel="sitemap"]').forEach(link => {
            const href = link.getAttribute('href');
            if (href) {
                sitemaps.add(new URL(href, siteUrl).href);
            }
        });
    } catch(e) {
        console.warn(`Could not parse homepage for sitemap links: ${(e as Error).message}`);
    }

    if (sitemaps.size > 0) {
        console.log(`Found ${sitemaps.size} sitemap(s) via robots.txt/homepage scan:`, Array.from(sitemaps));
        return Array.from(sitemaps);
    }
    
    console.log("No sitemaps found yet, checking common paths...");
    const commonPaths = ['/sitemap.xml', '/sitemap_index.xml', '/post-sitemap.xml', '/page-sitemap.xml'];
    const pathChecks = commonPaths.map(async path => {
        const potentialSitemapUrl = new URL(path, siteUrl).href;
        try {
            const response = await robustFetch(potentialSitemapUrl, {}, { throwOnHttpError: false });
            if (response.ok && (response.headers.get('content-type')?.includes('xml') || response.headers.get('content-type')?.includes('text/xml'))) {
                 console.log(`Found sitemap at common path: ${potentialSitemapUrl}`);
                 return potentialSitemapUrl;
            }
        } catch (e) { /* It's normal for these to fail with network errors, so we don't log an error. */ }
        return null;
    });

    return (await Promise.all(pathChecks)).filter((url): url is string => !!url);
}


/**
 * An "ultra-smart", enterprise-grade sitemap parser.
 */
async function parseSitemap(sitemapXml: string, sitemapUrl: string): Promise<string[]> {
    const parser = new DOMParser();
    const sitemapDoc = parser.parseFromString(sitemapXml, "application/xml");

    if (sitemapDoc.querySelector("parsererror")) {
        const errorText = sitemapDoc.querySelector("parsererror div")?.textContent || "Unknown XML parsing error.";
        throw new Error(`The XML from sitemap '${sitemapUrl}' is malformed and could not be parsed. Error: ${errorText}`);
    }

    const locRegex = /<loc>(.*?)<\/loc>/g;
    const allUrls = Array.from(sitemapXml.matchAll(locRegex), m => {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = m[1];
        return tempDiv.textContent || tempDiv.innerText || "";
    }).filter(Boolean);

    if (allUrls.length === 0) {
        console.warn(`No <loc> tags could be found in sitemap: ${sitemapUrl}`);
        return [];
    }
    
    const isSitemapIndex = sitemapDoc.documentElement.localName === 'sitemapindex';

    if (isSitemapIndex) {
        console.log(`Sitemap index detected at ${sitemapUrl}. Processing ${allUrls.length} nested sitemaps recursively...`);
        const nestedUrlPromises = allUrls.map(async (nestedSitemapUrl) => {
            try {
                const response = await robustFetch(nestedSitemapUrl);
                const nestedSitemapXml = await response.text();
                return parseSitemap(nestedSitemapXml, nestedSitemapUrl);
            } catch (e) {
                console.warn(`Failed to process nested sitemap ${nestedSitemapUrl}:`, (e as Error).message);
                return [];
            }
        });
        return (await Promise.all(nestedUrlPromises)).flat();
    }
    
    return allUrls;
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
            if (currentIndex >= urls.length) return;
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
 * Performs a lightweight HEAD request to validate if a URL points to an HTML document.
 */
async function validateUrl(url: string): Promise<string | null> {
    try {
        const response = await robustFetch(url, { method: 'HEAD' }, { throwOnHttpError: false });

        if (response.ok) {
            const contentType = response.headers.get('Content-Type');
            if (contentType && contentType.includes('text/html')) {
                return url;
            }
            console.log(`Skipping non-HTML URL: ${url} (Content-Type: ${contentType})`);
            return null;
        }
        
        console.warn(`HEAD request for ${url} returned status ${response.status}. Optimistically including for full GET.`);
        return url;
    } catch (e) {
        console.warn(`HEAD request for ${url} failed, optimistically including for full GET. Reason:`, (e as Error).message);
        return url;
    }
}

/**
 * A helper function to fetch and parse a single sitemap URL.
 */
async function fetchAndParseSitemapLocation(loc: string): Promise<string[]> {
    try {
        const response = await robustFetch(loc);
        const sitemapXml = await response.text();
        if (!sitemapXml.trim()) {
            throw new Error("Sitemap file is empty.");
        }
        return await parseSitemap(sitemapXml, loc);
    } catch(e) {
        const originalError = e as Error;
        throw new Error(`Failed to parse ${loc}: ${originalError.message}`);
    }
}

/**
 * Tier 3 Failsafe: Fetches the homepage and extracts all internal links.
 */
async function extractInternalLinksFromUrl(pageUrl: string, onStatusUpdate: (message: string) => void): Promise<string[]> {
    let html = '';
    try {
        console.log(`Extracting internal links from ${pageUrl}`);
        const response = await robustFetch(pageUrl);
        html = await response.text();
    } catch (e) {
        console.warn(`Direct fetch for homepage ${pageUrl} failed. Activating Google Cache fallback. Reason: ${(e as Error).message}`);
        onStatusUpdate("Direct fetch failed. Trying Google Cache as a last resort...");
        
        try {
            const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(pageUrl)}`;
            const cacheResponse = await robustFetch(cacheUrl);
            html = await cacheResponse.text();
        } catch (cacheError) {
            console.error(`Google Cache fallback also failed.`, cacheError);
            throw e;
        }
    }
    
    if (!html) {
        console.warn('Extracted empty HTML content from homepage.');
        return [];
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const links = new Set<string>();
    const base = new URL(pageUrl);

    doc.querySelectorAll('a[href]').forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;

        try {
            const absoluteUrl = new URL(href, base.href);
            if (absoluteUrl.origin === base.origin && absoluteUrl.protocol.startsWith('http')) {
                absoluteUrl.hash = '';
                let cleanUrl = absoluteUrl.href;
                if (cleanUrl.endsWith('/')) {
                    cleanUrl = cleanUrl.slice(0, -1);
                }
                links.add(cleanUrl);
            }
        } catch (e) { /* Ignore invalid URLs */ }
    });

    base.hash = '';
    let cleanBaseUrl = base.href;
    if (cleanBaseUrl.endsWith('/')) {
        cleanBaseUrl = cleanBaseUrl.slice(0, -1);
    }
    links.add(cleanBaseUrl);

    return Array.from(links);
}

/**
 * Tier 4 Failsafe: Queries the Internet Archive's Wayback Machine for a historical index of URLs.
 */
async function fetchUrlsFromWaybackMachine(siteUrl: string, onStatusUpdate: (message: string) => void): Promise<string[]> {
    try {
        const domain = new URL(siteUrl).hostname.replace(/^www\./, '');
        onStatusUpdate(`Querying the Internet Archive for historical URLs for ${domain}...`);
        
        const waybackApiUrl = `https://web.archive.org/cdx/search/cdx?url=${domain}/*&output=json&fl=original&collapse=urlkey&filter=mimetype:text/html&filter=statuscode:200`;

        const response = await robustFetch(waybackApiUrl, {}, {timeout: 20000});
        const data = await response.json();

        if (!Array.isArray(data) || data.length <= 1) {
            console.warn(`Wayback Machine returned no data for ${domain}`);
            return [];
        }

        const urls = data.slice(1).map((row: string[]) => row[0]).filter(Boolean);
        
        const assetExtensions = /\.(css|js|json|xml|rss|atom|pdf|jpg|jpeg|png|gif|svg|webp|woff|woff2|ttf|eot|mp4|webm|mp3|ogg)$/i;
        const filteredUrls = urls.filter(url => !assetExtensions.test(new URL(url).pathname));

        console.log(`Found ${filteredUrls.length} potential HTML URLs from the Wayback Machine.`);
        return filteredUrls;
    } catch (e) {
        console.error("Wayback Machine API query failed:", e);
        return [];
    }
}

/**
 * REFACTORED: The core processing pipeline for any list of URLs.
 * This function takes an array of URLs, validates them, fetches their SEO data,
 * and performs the initial programmatic audit. It's now used by both the live
 * crawler and the new file upload feature.
 */
export const processAndScanUrls = async (
    urls: string[],
    onProgress: (crawled: number, total: number) => void,
    onStatusUpdate: (message: string) => void
): Promise<SeoAnalysis[]> => {
    const uniqueUrls = Array.from(new Set(urls));
    if (uniqueUrls.length === 0) {
        throw new Error("The list of URLs is empty or contains only duplicates.");
    }

    console.log(`Discovered ${uniqueUrls.length} unique URLs. Validating content types...`);
    onStatusUpdate(`Found ${uniqueUrls.length} unique URLs. Validating which are HTML pages...`);
    onProgress(0, uniqueUrls.length);

    const validationResults = await processUrlsWithConcurrency(
        uniqueUrls, validateUrl, 50, (c, t) => onProgress(c, t)
    );
    const pageUrls = validationResults.filter((result): result is string => result !== null);

    if (pageUrls.length === 0) {
        throw new Error("Found URLs, but none appear to be valid, crawlable HTML pages after filtering.");
    }

    console.log(`Validated ${pageUrls.length} crawlable HTML pages. Starting metadata extraction.`);
    onStatusUpdate(`Extracting SEO data from ${pageUrls.length} validated pages...`);
    onProgress(0, pageUrls.length);

    const crawlFn = (pageUrl: string) =>
        fetchAndParseHtml(pageUrl).then(data => ({ ...data, url: pageUrl }));

    const results = await processUrlsWithConcurrency(pageUrls, crawlFn, 30, onProgress);
    const validResults = results.filter((result): result is SeoData => result !== null);

    if (validResults.length === 0) {
        throw new Error("Crawled all validated URLs but could not retrieve SEO data from any of them. The site may be blocking the crawler.");
    }

    console.log(`Successfully processed ${validResults.length} pages.`);
    onStatusUpdate(`Processing complete. Performing initial programmatic SEO audit...`);

    const analyzedPages = performQuickScan(validResults);
    
    console.log(`Quick scan complete. Found actionable issues on several pages.`);
    return analyzedPages;
};


/**
 * The main crawler function, now focused on URL *discovery*.
 * It orchestrates the sitemap finding and parsing logic, then passes the
 * resulting URL list to the new, unified `processAndScanUrls` pipeline.
 */
export const crawlSite = async (
    url: string,
    sitemapUrl?: string,
    onProgress: (crawled: number, total: number) => void = () => {},
    onStatusUpdate: (message: string) => void = () => {}
): Promise<SeoAnalysis[]> => {
    console.log(`Starting premium, resilient crawl for: ${url}`);
    
    let allUrls: string[] = [];
    let initialSitemapError: Error | null = null;

    if (sitemapUrl) {
        onStatusUpdate(`Processing user-provided sitemap: ${sitemapUrl}`);
        try {
            allUrls = await fetchAndParseSitemapLocation(sitemapUrl);
        } catch (e) {
            initialSitemapError = e as Error;
            console.warn(`User-provided sitemap failed. Reason: ${initialSitemapError.message}. Falling back to automatic discovery.`);
        }
    }

    if (allUrls.length === 0) {
        onStatusUpdate(sitemapUrl ? `User sitemap failed. Trying automatic discovery...` : `Starting automatic sitemap discovery...`);
        const sitemapLocations = await findSitemaps(url);

        if (sitemapLocations.length > 0) {
            onStatusUpdate(`Discovered ${sitemapLocations.length} sitemap(s). Parsing URLs...`);
            
            const sitemapProcessingPromises = sitemapLocations.map(fetchAndParseSitemapLocation);
            const results = await Promise.allSettled(sitemapProcessingPromises);
            
            const successfulUrls = results
                .filter(r => r.status === 'fulfilled')
                .flatMap(r => (r as PromiseFulfilledResult<string[]>).value);
            
            const failedSitemaps = results.filter(r => r.status === 'rejected');
            
            failedSitemaps.forEach(f => console.warn(`A discovered sitemap could not be processed:`, (f as PromiseRejectedResult).reason.message));
            
            if (successfulUrls.length === 0 && failedSitemaps.length > 0) {
                throw (failedSitemaps[0] as PromiseRejectedResult).reason;
            }
            allUrls = successfulUrls;
        }
    }
    
    if (allUrls.length === 0) {
        let liveCrawlError: Error | null = null;
        try {
            onStatusUpdate("Sitemap not found. Attempting to crawl links from the homepage as a fallback...");
            allUrls = await extractInternalLinksFromUrl(url, onStatusUpdate);
        } catch (e) {
            console.error("Homepage Link Extraction with Google Cache also failed.", e);
            liveCrawlError = e as Error;
        }

        if (allUrls.length === 0) {
            onStatusUpdate("Live crawling failed. Activating deep index analysis via the Internet Archive...");
            allUrls = await fetchUrlsFromWaybackMachine(url, onStatusUpdate);
            
             if (allUrls.length === 0) {
                let errorMessage = "Failed to crawl the website. All live discovery methods and historical lookups failed.";
                if (initialSitemapError) errorMessage += ` The user-provided sitemap was unreachable.`;
                else errorMessage += ` Automatic discovery found nothing.`;
                if (liveCrawlError) errorMessage += ` The fallback attempt to crawl the homepage also failed (Reason: ${liveCrawlError.message}).`;
                errorMessage += ` A final attempt to query the Internet Archive's Wayback Machine also found no usable URLs for this domain.`;
                throw new Error(errorMessage);
            }
        }
    }

    if (allUrls.length === 0) {
        throw new Error("URL discovery was successful, but the source (sitemap or page) contained no URLs.");
    }
    
    // Hand off the discovered URLs to the unified processing pipeline.
    return processAndScanUrls(allUrls, onProgress, onStatusUpdate);
};