import { SeoData } from '../types';
import { robustFetch } from './fetchService';

/**
 * Fetches and parses HTML with automatic retries and a robust fetching layer.
 */
async function fetchAndParseHtml(url: string, retries = 3, delay = 1000): Promise<{ title: string; description: string }> {
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
        try {
            const response = await robustFetch(url);

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

    // 1. Try robots.txt (the professional way)
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

    // 2. NEW SOTA Method: Fetch homepage and look for <link rel="sitemap">
    try {
        console.log(`Checking for sitemap <link> on homepage: ${siteUrl}`);
        const response = await robustFetch(siteUrl, { headers: { 'Accept': 'text/html' }});
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        doc.querySelectorAll('link[rel="sitemap"]').forEach(link => {
            const href = link.getAttribute('href');
            if (href) {
                // Resolve relative URLs against the base site URL
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
    
    // 3. If nothing found, try common paths
    console.log("No sitemaps found yet, checking common paths...");
    const commonPaths = ['/sitemap.xml', '/sitemap_index.xml', '/post-sitemap.xml', '/page-sitemap.xml'];
    const pathChecks = commonPaths.map(async path => {
        const potentialSitemapUrl = new URL(path, siteUrl).href;
        try {
            const response = await robustFetch(potentialSitemapUrl, {}, { throwOnHttpError: false });
            // Check headers for XML content type to ensure it's likely a sitemap
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
 * This function is engineered for maximum compatibility, correctly handling nested sitemap indexes,
 * XML namespaces, and other common inconsistencies that break simpler parsers.
 */
async function parseSitemap(sitemapXml: string, sitemapUrl: string): Promise<string[]> {
    const parser = new DOMParser();
    const sitemapDoc = parser.parseFromString(sitemapXml, "application/xml");

    // Immediately fail with a clear, actionable error if the XML is malformed.
    if (sitemapDoc.querySelector("parsererror")) {
        const errorText = sitemapDoc.querySelector("parsererror div")?.textContent || "Unknown XML parsing error.";
        throw new Error(`The XML from sitemap '${sitemapUrl}' is malformed and could not be parsed. Error: ${errorText}`);
    }

    // Use a highly robust regex to extract all <loc> URLs. This method is immune to XML namespace issues.
    const locRegex = /<loc>(.*?)<\/loc>/g;
    const allUrls = Array.from(sitemapXml.matchAll(locRegex), m => {
        // A clever trick to decode any XML entities (like &amp;) into valid URL characters.
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = m[1];
        return tempDiv.textContent || tempDiv.innerText || "";
    }).filter(Boolean); // Filter out any empty results

    if (allUrls.length === 0) {
        console.warn(`No <loc> tags could be found in sitemap: ${sitemapUrl}`);
        return [];
    }
    
    // Reliably detect if this is a sitemap index by inspecting the root element name.
    const isSitemapIndex = sitemapDoc.documentElement.localName === 'sitemapindex';

    if (isSitemapIndex) {
        console.log(`Sitemap index detected at ${sitemapUrl}. Processing ${allUrls.length} nested sitemaps recursively...`);
        const nestedUrlPromises = allUrls.map(async (nestedSitemapUrl) => {
            try {
                const response = await robustFetch(nestedSitemapUrl);
                const nestedSitemapXml = await response.text();
                return parseSitemap(nestedSitemapXml, nestedSitemapUrl); // Recursive call
            } catch (e) {
                console.warn(`Failed to process nested sitemap ${nestedSitemapUrl}:`, (e as Error).message);
                return [];
            }
        });
        // Flatten the array of arrays into a single list of all URLs.
        return (await Promise.all(nestedUrlPromises)).flat();
    }
    
    // If it's not a sitemap index, we have our final list of page URLs.
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
            if (currentIndex >= urls.length) return; // Guard against race condition at the end
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
 * Optimistically includes URLs if the HEAD request fails, letting the full crawl handle errors.
 */
async function validateUrl(url: string): Promise<string | null> {
    try {
        const response = await robustFetch(url, { method: 'HEAD' }, { throwOnHttpError: false });

        if (response.ok) {
            const contentType = response.headers.get('Content-Type');
            if (contentType && contentType.includes('text/html')) {
                return url; // It's confirmed HTML.
            }
            console.log(`Skipping non-HTML URL: ${url} (Content-Type: ${contentType})`);
            return null; // It's not HTML, so we filter it out.
        }
        
        // If HEAD is not allowed (e.g., 405) or another non-OK status, we can't be sure.
        // Let's be optimistic and include it. The full GET later will fail if it's not a page.
        console.warn(`HEAD request for ${url} returned status ${response.status}. Optimistically including for full GET.`);
        return url;
    } catch (e) {
        // Network error, timeout, etc.
        console.warn(`HEAD request for ${url} failed, optimistically including for full GET. Reason:`, (e as Error).message);
        return url;
    }
}

/**
 * A helper function to fetch and parse a single sitemap URL, providing a clear, contextualized error on failure.
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
        // Create a new, more specific error to throw, which will be shown in the UI.
        throw new Error(`Failed to parse ${loc}: ${originalError.message}`);
    }
}

/**
 * Tier 3 Failsafe: Fetches the homepage and extracts all internal links.
 * Includes a Google Cache fallback if the direct fetch fails.
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
            throw e; // Re-throw the original error, as the fallback didn't work.
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
            // Check if it's an internal link (same origin) and not an anchor/non-http link
            if (absoluteUrl.origin === base.origin && absoluteUrl.protocol.startsWith('http')) {
                // Clean URL by removing hash and trailing slash for uniqueness
                absoluteUrl.hash = '';
                let cleanUrl = absoluteUrl.href;
                if (cleanUrl.endsWith('/')) {
                    cleanUrl = cleanUrl.slice(0, -1);
                }
                links.add(cleanUrl);
            }
        } catch (e) {
            // Ignore invalid URLs (e.g., 'mailto:', 'tel:')
        }
    });

    // Also include the pageUrl itself, cleaned
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

        // This API call is specifically crafted for SOTA performance:
        // - url=${domain}/* : Get all pages under the domain.
        // - output=json : Easy to parse.
        // - fl=original : We only want the original URL field.
        // - collapse=urlkey : Get only the last unique version of each URL, preventing duplicates.
        // - filter=mimetype:text/html : Server-side filter for HTML pages, vastly reducing response size.
        // - filter=statuscode:200 : Only get pages that were successfully archived.
        const waybackApiUrl = `https://web.archive.org/cdx/search/cdx?url=${domain}/*&output=json&fl=original&collapse=urlkey&filter=mimetype:text/html&filter=statuscode:200`;

        const response = await robustFetch(waybackApiUrl, {}, {timeout: 20000}); // Longer timeout for archive
        const data = await response.json();

        if (!Array.isArray(data) || data.length <= 1) { // data[0] is the header
            console.warn(`Wayback Machine returned no data for ${domain}`);
            return [];
        }

        // The first row is the header, e.g., ["original"]. We skip it.
        const urls = data.slice(1).map((row: string[]) => row[0]).filter(Boolean);
        
        // Final client-side cleanup.
        const assetExtensions = /\.(css|js|json|xml|rss|atom|pdf|jpg|jpeg|png|gif|svg|webp|woff|woff2|ttf|eot|mp4|webm|mp3|ogg)$/i;
        const filteredUrls = urls.filter(url => !assetExtensions.test(new URL(url).pathname));

        console.log(`Found ${filteredUrls.length} potential HTML URLs from the Wayback Machine.`);
        return filteredUrls;
    } catch (e) {
        console.error("Wayback Machine API query failed:", e);
        // This is a last resort, so if it fails, we don't throw, we just return empty.
        // The calling function will then handle the "no URLs found" case.
        return [];
    }
}


/**
 * The main crawler function, orchestrating the state-of-the-art fetching and parsing logic.
 * This new engine is resilient to single-sitemap failures and intelligently falls back from user error.
 */
export const crawlSite = async (
    url: string,
    sitemapUrl?: string,
    onProgress: (crawled: number, total: number) => void = () => {},
    onStatusUpdate: (message: string) => void = () => {}
): Promise<SeoData[]> => {
    console.log(`Starting premium, resilient crawl for: ${url}`);
    
    let allUrlsFromSitemaps: string[] = [];
    let initialSitemapError: Error | null = null;

    // TIER 1: Attempt to use the user-provided sitemap first.
    if (sitemapUrl) {
        onStatusUpdate(`Processing user-provided sitemap: ${sitemapUrl}`);
        try {
            allUrlsFromSitemaps = await fetchAndParseSitemapLocation(sitemapUrl);
        } catch (e) {
            initialSitemapError = e as Error;
            console.warn(`User-provided sitemap failed. Reason: ${initialSitemapError.message}. Falling back to automatic discovery.`);
        }
    }

    // TIER 2: If no sitemap was provided, or if the provided one failed, run automatic discovery.
    if (allUrlsFromSitemaps.length === 0) {
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
                // If all discovered sitemaps failed, we throw the reason for the first failure.
                throw (failedSitemaps[0] as PromiseRejectedResult).reason;
            }
            allUrlsFromSitemaps = successfulUrls;
        }
    }
    
    // TIER 3 & 4: ULTIMATE FAILSAFE LOGIC
    if (allUrlsFromSitemaps.length === 0) {
        let liveCrawlError: Error | null = null;
        try {
            onStatusUpdate("Sitemap not found. Attempting to crawl links from the homepage as a fallback...");
            allUrlsFromSitemaps = await extractInternalLinksFromUrl(url, onStatusUpdate);
        } catch (e) {
            console.error("Homepage Link Extraction with Google Cache also failed.", e);
            liveCrawlError = e as Error;
        }

        // Activate Wayback Machine if homepage crawl failed OR returned no links
        if (allUrlsFromSitemaps.length === 0) {
            onStatusUpdate("Live crawling failed. Activating deep index analysis via the Internet Archive...");
            allUrlsFromSitemaps = await fetchUrlsFromWaybackMachine(url, onStatusUpdate);
            
             // If even the Wayback machine fails, now we throw the comprehensive error.
            if (allUrlsFromSitemaps.length === 0) {
                let errorMessage = "Failed to crawl the website. All live discovery methods and historical lookups failed.";
                if (initialSitemapError) {
                    errorMessage += ` The user-provided sitemap was unreachable.`;
                } else {
                    errorMessage += ` Automatic discovery found nothing.`;
                }
                if (liveCrawlError) {
                     errorMessage += ` The fallback attempt to crawl the homepage also failed (Reason: ${liveCrawlError.message}).`;
                }
                errorMessage += ` A final attempt to query the Internet Archive's Wayback Machine also found no usable URLs for this domain. The site may be new, un-indexed, or completely inaccessible.`;
                
                throw new Error(errorMessage);
            }
        }
    }
    
    // Deduplicate URLs before the expensive validation step
    const uniqueUrls = Array.from(new Set(allUrlsFromSitemaps));

    if (uniqueUrls.length === 0) {
        throw new Error("Sitemap(s) were found and parsed, but they contained no URLs. Please check your sitemap configuration in WordPress.");
    }

    // STAGE 1: Ultra-fast validation of all URLs to find HTML pages
    console.log(`Discovered ${uniqueUrls.length} unique URLs. Validating content types before full crawl...`);
    const VALIDATION_CONCURRENCY_LIMIT = 50; // Use higher concurrency for lightweight HEAD requests.
    onStatusUpdate(`Found ${uniqueUrls.length} unique URLs. Validating which are HTML pages...`);
    onProgress(0, uniqueUrls.length);

    const validationResults = await processUrlsWithConcurrency(
        uniqueUrls,
        validateUrl,
        VALIDATION_CONCURRENCY_LIMIT,
        (current, total) => onProgress(current, total) // Pass progress through
    );

    const pageUrls = validationResults.filter((result): result is string => result !== null);

    if (pageUrls.length === 0) {
        throw new Error("Found sitemap(s), but they contained no valid, crawlable HTML page URLs after filtering. The sitemap might only contain non-HTML resources (like images or PDFs), or the server may be blocking automated requests.");
    }

    // STAGE 2: Full, robust crawl of validated HTML pages
    console.log(`Validated ${pageUrls.length} crawlable HTML pages. Starting metadata extraction.`);
    onStatusUpdate(`Extracting SEO data from ${pageUrls.length} validated pages...`);
    const CONCURRENCY_LIMIT = 30;
    onProgress(0, pageUrls.length); // Reset progress for the crawling stage

    const crawlFn = (pageUrl: string) =>
        fetchAndParseHtml(pageUrl).then(data => ({ ...data, url: pageUrl }));

    const results = await processUrlsWithConcurrency(pageUrls, crawlFn, CONCURRENCY_LIMIT, onProgress);
    const validResults = results.filter((result): result is SeoData => result !== null);

    if (validResults.length === 0) {
        throw new Error("Crawled all validated URLs from the sitemap but could not retrieve SEO data from any of them. The site may be blocking the crawler, or have other accessibility issues.");
    }

    console.log(`Successfully crawled and processed ${validResults.length} pages.`);
    return validResults;
};