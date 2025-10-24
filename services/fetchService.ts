

// A structured list of CORS proxies, defining how to construct the request URL for each.
const PROXIES = [
    { type: 'direct', endpoint: null, name: 'direct connection' },
    // Prioritize more reliable proxies first
    { type: 'query_param', endpoint: 'https://api.allorigins.win/raw?url=', name: 'api.allorigins.win' },
    { type: 'prefix', endpoint: 'https://corsproxy.io/?', name: 'corsproxy.io' },
    // Keep cors.sh as later fallbacks
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
                     // Throw an error to be caught by the retry logic in the calling function, or to fail fast.
                     throw new Error(`Request failed with status: ${response.status} ${response.statusText}`);
                }
                // If not throwing, the caller is responsible for checking response.ok
                return response;
            }
            
            console.log(`Successfully fetched ${url} via ${proxy.name}`);
            return response; // Success!

        } catch (error) {
            lastError = error as Error;
            const err = error as Error;
            let reason = err.message;
            if (err.name === 'AbortError') {
                reason = `Request timed out after ${timeout / 1000}s.`;
            }

            // Provide intelligent feedback based on the context of the failure.
            if (proxy.type === 'direct' && (err.name === 'TypeError' || err.message.includes('Failed to fetch'))) {
                 console.warn(`Direct fetch for ${url} failed, likely due to a CORS policy. This is normal. Trying CORS proxies...`);
            } else {
                console.warn(`Fetch via ${proxy.name} failed for ${url}. Reason: ${reason}. Trying next...`);
            }
        }
    }
    
    // If all attempts have been exhausted
    throw lastError ?? new Error(`All fetch attempts (direct and through proxies) failed for the URL: ${url}. The target server might be down, blocking all requests, or there could be a network issue.`);
}