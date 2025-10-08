
// A diversified list of CORS proxies, with `null` representing a direct fetch attempt.
const PROXIES: (string | null)[] = [
    null, // Priority #1: Attempt a direct fetch.
    'https://cors.sh/',
    'https://proxy.cors.sh/'
    // Note: Other public proxies can be added here if needed, but are often less reliable.
    // e.g., 'https://api.allorigins.win/raw?url='
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
        const isDirectFetch = proxy === null;
        const requestUrl = isDirectFetch ? url : `${proxy}${encodeURIComponent(url)}`;
        
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
            
            return response; // Success!

        } catch (error) {
            lastError = error as Error;
            const err = error as Error;
            let reason = err.message;
            if (err.name === 'AbortError') {
                reason = `Request timed out after ${timeout / 1000}s.`;
            }

            // Provide intelligent feedback based on the context of the failure.
            if (isDirectFetch && (err.name === 'TypeError' || err.message.includes('Failed to fetch'))) {
                 console.warn(`Direct fetch for ${url} failed, likely due to a CORS policy. This is normal. Trying CORS proxies...`);
            } else {
                const source = isDirectFetch ? 'direct connection' : new URL(proxy!).hostname;
                console.warn(`Fetch via ${source} failed for ${url}. Reason: ${reason}. Trying next...`);
            }
        }
    }
    
    // If all attempts have been exhausted
    throw lastError ?? new Error(`All fetch attempts (direct and through proxies) failed for the URL: ${url}. The target server might be down, blocking all requests, or there could be a network issue.`);
}
