import { SeoData, SeoAnalysis, QuickScanResult } from '../types';
import { robustFetch } from './fetchService';
import { cacheService } from './cacheService';

// SOTA: Strict filter to prevent crawling images, assets, and non-html content.
function isInterestingUrl(url: string): boolean {
    if (!url) return false;
    const lower = url.toLowerCase();
    
    // Common media and asset extensions to ignore
    const ignoredExtensions = [
        '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico', 
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.rar',
        '.css', '.js', '.json', '.xml', // XML should be handled by sitemap parser, not crawled as a page
        '.mp4', '.mp3', '.avi', '.mov', '.wmv', '.flv', '.mkv'
    ];
    
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname.toLowerCase();
        
        // Block WP Uploads directory entirely
        if (pathname.includes('/wp-content/uploads/')) return false;
        if (pathname.includes('/wp-json/')) return false;
        
        if (ignoredExtensions.some(ext => pathname.endsWith(ext))) return false;
        
        return true;
    } catch (e) {
        return false;
    }
}

function performQuickScan(pages: SeoData[]): SeoAnalysis[] {
    const titleMap = new Map<string, string[]>();
    const descriptionMap = new Map<string, string[]>();

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
        if (quickScanResult.isDescriptionMissing) issues.push('Missing Description');
        if (quickScanResult.isDescriptionTooLong) issues.push('Desc Too Long');
        if (quickScanResult.isTitleDuplicate) issues.push('Duplicate Title');
        if (quickScanResult.isDescriptionDuplicate) issues.push('Duplicate Desc');
        
        return {
            ...page,
            status: 'scanned',
            issues,
            quickScan: quickScanResult,
        };
    });
}

async function fetchAndParseHtml(url: string): Promise<{ title: string; description: string; content: string }> {
    const response = await robustFetch(url);
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const title = doc.querySelector('title')?.textContent || '';
    const description = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    const mainContentElement = doc.querySelector('main, article, [role="main"]');
    // FIX: Cast to HTMLElement to access innerText property, which is not on the base Element type.
    let contentText = ((mainContentElement as HTMLElement) || doc.body).innerText.replace(/\s\s+/g, ' ').trim();
    return { title, description, content: contentText.substring(0, 25000) };
}

async function findSitemaps(siteUrl: string): Promise<string[]> {
    const sitemaps = new Set<string>();
    try {
        const response = await robustFetch(new URL('/robots.txt', siteUrl).href);
        const text = await response.text();
        const matches = text.matchAll(/^Sitemap:\s*(.*)/gim);
        for (const match of matches) sitemaps.add(match[1].trim());
    } catch (e) { /* silent fail */ }
    if (sitemaps.size > 0) return Array.from(sitemaps);
    
    const commonPaths = ['/sitemap.xml', '/sitemap_index.xml', '/wp-sitemap.xml'];
    const pathChecks = await Promise.all(commonPaths.map(async path => {
        try {
            const url = new URL(path, siteUrl).href;
            const res = await robustFetch(url, {}, { throwOnHttpError: false });
            if (res.ok) return url;
        } catch {}
        return null;
    }));
    return pathChecks.filter((url): url is string => !!url);
}

async function parseSitemap(sitemapXml: string, sitemapUrl: string): Promise<string[]> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(sitemapXml, "application/xml");
    if (doc.querySelector("parsererror")) throw new Error(`XML malformed in ${sitemapUrl}`);
    
    // SOTA Fix: Only select <loc> elements that are direct children of <url> or <sitemap>
    // This prevents selecting <image:loc> inside <image:image> which are assets, not pages.
    // However, DOMParser with namespaces can be tricky.
    // A robust way is to select all 'loc' and filter their text content.
    
    const allLocs = Array.from(doc.querySelectorAll('loc'));
    
    const urls = allLocs
        .map(loc => loc.textContent || '')
        .filter(url => url && isInterestingUrl(url)); // Apply Strict Filter immediately
    
    if (doc.documentElement.localName === 'sitemapindex') {
        const nestedUrls = await Promise.all(urls.map(async (nestedUrl) => {
            try {
                const res = await robustFetch(nestedUrl);
                return parseSitemap(await res.text(), nestedUrl);
            } catch { return []; }
        }));
        return nestedUrls.flat();
    }
    return urls;
}

async function processUrlsWithConcurrency<T>(urls: string[], asyncFn: (url: string) => Promise<T | null>, concurrencyLimit: number, onProgress: (crawled: number, total: number) => void): Promise<(T | null)[]> {
    const results: (T | null)[] = [];
    let i = 0;
    const worker = async () => {
        while (i < urls.length) {
            const url = urls[i++];
            if (url) {
                try {
                    results.push(await asyncFn(url));
                } catch { results.push(null); }
                onProgress(results.length, urls.length);
            }
        }
    };
    await Promise.all(Array.from({ length: Math.min(concurrencyLimit, urls.length) }, worker));
    return results;
}

async function validateUrl(url: string): Promise<string | null> {
    if (!isInterestingUrl(url)) return null;
    try {
        const res = await robustFetch(url, { method: 'HEAD' });
        const contentType = res.headers.get('Content-Type');
        return contentType && contentType.includes('text/html') ? url : null;
    } catch { 
        // If HEAD fails, we used to optimistically include it. 
        // But for SOTA efficiency, if HEAD fails, we skip unless we are very sure.
        // Let's assume valid if robustFetch didn't throw network error, but we can't confirm type.
        // We'll rely on the extension filter to keep us safe.
        return url; 
    } 
}

async function fetchAndParseSitemapLocation(loc: string): Promise<string[]> {
    const response = await robustFetch(loc);
    return await parseSitemap(await response.text(), loc);
}

export const processAndScanUrls = async (urls: string[], onProgress: (crawled: number, total: number) => void, onStatusUpdate: (message: string) => void): Promise<SeoAnalysis[]> => {
    // Stage 1: Filter Junk
    const uniqueUrls = Array.from(new Set(urls.filter(isInterestingUrl)));
    onStatusUpdate(`Validating ${uniqueUrls.length} potentially valid URLs...`);
    
    // Check which URLs are NOT in cache
    const cachedDataMap = await cacheService.getMany(uniqueUrls);
    const urlsToProcess: string[] = [];
    const cachedResults: SeoAnalysis[] = [];
    
    uniqueUrls.forEach(url => {
        const cached = cachedDataMap.get(url);
        if (cached) {
            cachedResults.push(cached);
        } else {
            urlsToProcess.push(url);
        }
    });
    
    let processedResults: SeoData[] = [];

    if (urlsToProcess.length > 0) {
        onStatusUpdate(`Validating ${urlsToProcess.length} new URLs (found ${cachedResults.length} in cache)...`);
        
        // Validate new URLs (HEAD check)
        const validationResults = await processUrlsWithConcurrency(urlsToProcess, validateUrl, 20, (c,t) => { /* internal validation progress */ });
        const validPageUrls = validationResults.filter((r): r is string => r !== null);
        
        onStatusUpdate(`Crawling content from ${validPageUrls.length} pages...`);
        
        const crawlFn = async (url: string) => {
            const cached = await cacheService.get(url);
            if (cached) return cached as SeoData;

            const data = await fetchAndParseHtml(url);
            const seoData = { ...data, url };
            return seoData;
        };

        const results = await processUrlsWithConcurrency(validPageUrls, crawlFn, 10, (current, total) => {
             onProgress(cachedResults.length + current, uniqueUrls.length);
        });
        processedResults = results.filter((r): r is SeoData => r !== null);
    } else {
        onStatusUpdate(`Loaded all ${uniqueUrls.length} URLs from high-speed cache.`);
        onProgress(uniqueUrls.length, uniqueUrls.length);
    }
    
    const allSeoData = [...cachedResults, ...processedResults];
    
    onStatusUpdate(`Performing initial SEO audit...`);
    return performQuickScan(allSeoData);
};

export const crawlSite = async (url: string, sitemapUrl?: string, onProgress: (c: number, t: number) => void = () => {}, onStatusUpdate: (m: string) => void = () => {}): Promise<SeoAnalysis[]> => {
    let allUrls: string[] = [];
    if (sitemapUrl) {
        onStatusUpdate(`Fetching sitemap: ${sitemapUrl}`);
        try {
            allUrls = await fetchAndParseSitemapLocation(sitemapUrl);
        } catch (e) {
            onStatusUpdate(`Provided sitemap failed. Trying auto-discovery...`);
        }
    }

    if (allUrls.length === 0) {
        onStatusUpdate(`Discovering sitemaps...`);
        const sitemapLocations = await findSitemaps(url);
        if (sitemapLocations.length > 0) {
            onStatusUpdate(`Found ${sitemapLocations.length} sitemaps. Parsing...`);
            const results = await Promise.allSettled(sitemapLocations.map(fetchAndParseSitemapLocation));
            allUrls = results.filter(r => r.status === 'fulfilled').flatMap(r => (r as PromiseFulfilledResult<string[]>).value);
        }
    }
    
    if (allUrls.length === 0) {
      throw new Error("Sitemap discovery failed. Could not find any URLs to process.");
    }
    
    return processAndScanUrls(allUrls, onProgress, onStatusUpdate);
};