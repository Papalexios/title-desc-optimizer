

// A structured list of CORS proxies, defining how to construct the request URL for each.
const PROXIES = [
    { type: 'direct', endpoint: null, name: 'direct connection' },
    // Prioritize more reliable proxies first
    { type: 'query_param', endpoint: 'https://api.allorigins.win/raw?url=', name: 'api.allorigins.win' },
    { type: 'prefix', endpoint: 'https://corsproxy.io/?', name: 'corsproxy.io' },
    { type: 'prefix', endpoint: 'https://cors.sh/', name: 'cors.sh' },
    { type: 'prefix', endpoint: 'https://proxy.cors.sh/', name: 'proxy.cors.sh' },
];


/**
 * A state-of-the-art, resilient fetch utility that attempts a direct connection first,
 * then cycles through multiple CORS proxies as a fallback.
 * Includes a timeout to prevent hanging requests and configurable error handling.
 * @param url The URL to fetch.
 * @param options Standard fetch options.
 * @param config Configuration for timeout and error handling.
 * @returns A promise that resolves to the fetch response.
 * @throws An error if the direct fetch and all proxies fail.
 */
export async function robustFetch(
    url: string, 
    options: RequestInit = {}, 
    config: { timeout?: number; throwOnHttpError?: boolean } = {}
): Promise<Response> {
    const { timeout = 15000, throwOnHttpError = true } = config;
    let lastError: Error | null = null;

    for (const proxy of PROXIES) {
        let requestUrl: string;
        
        switch (proxy.type) {
            case 'direct':
                requestUrl = url;
                break;
            case 'prefix':
                // For proxies like corsproxy.io/?https://... or cors.sh/https://...
                requestUrl = `${proxy.endpoint}${url}`;
                break;
            case 'query_param':
                 // For proxies like allorigins.win/raw?url=...
                requestUrl = `${proxy.endpoint}${encodeURIComponent(url)}`;
                break;
        }

        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);
            
            const response = await fetch(requestUrl, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(id);
            
            if (!response.ok) {
                if (throwOnHttpError) {
                     throw new Error(`Request failed with status: ${response.status}`);
                }
                return response;
            }
            
            // console.log(`Successfully fetched ${url} via ${proxy.name}`); // Silenced for SOTA efficiency
            return response; // Success!

        } catch (error) {
            lastError = error as Error;
            // console.warn(`Fetch via ${proxy.name} failed for ${url}. Trying next...`); // Silenced for SOTA efficiency
        }
    }
    
    // Only log the final error if absolute failure
    console.error(`All fetch attempts failed for: ${url}`);
    throw lastError ?? new Error(`All fetch attempts failed for the URL: ${url}`);
}