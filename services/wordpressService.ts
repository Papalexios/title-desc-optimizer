import { WordPressCreds } from '../types';
import { robustFetch } from './fetchService';

/**
 * Finds the WordPress Post ID and Post Type for a given public URL.
 * It intelligently checks both 'posts' and 'pages' endpoints.
 */
async function getPostIdAndType(creds: WordPressCreds, pageUrl: string): Promise<{ id: number; type: 'posts' | 'pages' }> {
    const url = new URL(pageUrl);
    const slug = url.pathname.split('/').filter(Boolean).pop();
    if (!slug) {
        throw new Error("Could not determine slug from URL. Unable to update the homepage directly via this method.");
    }

    const encodedCreds = btoa(`${creds.username}:${creds.appPassword}`);
    const headers = { 'Authorization': `Basic ${encodedCreds}` };

    const postTypes: ('posts' | 'pages')[] = ['posts', 'pages'];

    for (const type of postTypes) {
        const apiUrl = `${creds.siteUrl}/wp-json/wp/v2/${type}?slug=${slug}`;

        try {
            console.log(`Searching for slug "${slug}" in post type "${type}"...`);
            const response = await robustFetch(apiUrl, { headers }, { throwOnHttpError: false });
            
            if (!response.ok) {
                 if(response.status === 404) continue; // Try the next post type
                 throw new Error(`API request failed with status ${response.status}`);
            }

            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
                console.log(`Found post ID ${data[0].id} for slug "${slug}" in "${type}".`);
                return { id: data[0].id, type }; // Found it!
            }
        } catch (error) {
            console.error(`Error fetching from ${type} endpoint:`, error);
            // Don't re-throw immediately, allow the loop to try the next type
        }
    }

    throw new Error(`Could not find a post or page with the slug "${slug}". Check permissions and ensure the page is public.`);
}

/**
 * Updates the SEO meta title and description for a specific post on a WordPress site.
 * This function is "ultra-smart" as it sends update keys for the most popular
 * SEO plugins (Yoast, AIOSEO, Rank Math) simultaneously.
 */
export async function updateSeoOnWordPress(creds: WordPressCreds, pageUrl: string, newTitle: string, newDescription: string): Promise<void> {
    
    let postInfo;
    try {
        postInfo = await getPostIdAndType(creds, pageUrl);
    } catch (error) {
         // Re-throw with more user-friendly context
         throw new Error(`Failed to find post on WordPress. Reason: ${(error as Error).message}`);
    }

    const { id, type } = postInfo;
    const apiUrl = `${creds.siteUrl}/wp-json/wp/v2/${type}/${id}`;
    
    const encodedCreds = btoa(`${creds.username}:${creds.appPassword}`);
    const headers = {
        'Authorization': `Basic ${encodedCreds}`,
        'Content-Type': 'application/json',
    };

    // This payload includes meta keys for the 3 most popular SEO plugins.
    // The WordPress REST API will only update the ones that exist for the target post.
    const bodyPayload = {
        meta: {
            // Yoast SEO
            '_yoast_wpseo_title': newTitle,
            '_yoast_wpseo_metadesc': newDescription,
            // All in One SEO (AIOSEO)
            '_aioseo_title': newTitle,
            '_aioseo_description': newDescription,
            // Rank Math
            'rank_math_title': newTitle,
            'rank_math_description': newDescription
        }
    };
    const body = JSON.stringify(bodyPayload);

    console.log(`Attempting to update Post ID ${id} at ${apiUrl} with payload:`, bodyPayload);

    try {
        const response = await robustFetch(apiUrl, {
            method: 'POST',
            headers,
            body
        }, { throwOnHttpError: false, timeout: 30000 });

        if (!response.ok) {
             if (response.status === 401 || response.status === 403) {
                throw new Error("Authorization failed. Please check your username and Application Password.");
             }
            const errorBody = await response.text();
            console.error("WP Update Error Response Body:", errorBody);
            throw new Error(`WordPress API returned an error (Status: ${response.status}). You may not have permission to edit this post.`);
        }

        // Success!
        console.log(`Successfully updated SEO for post ID ${id} on ${creds.siteUrl}`);

    } catch (error) {
        console.error("Error in updateSeoOnWordPress:", error);
        // Re-throw the original or a new error to be caught by the UI
        throw error;
    }
}
