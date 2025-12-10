// services/fileParserService.ts

/**
 * Checks if a given string is a plausible, absolute HTTP/HTTPS URL and NOT an image/asset.
 */
const isValidUrl = (str: string): boolean => {
    if (!str) return false;
    try {
        const url = new URL(str);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

        // Strict Asset Filtering
        const lowerPath = url.pathname.toLowerCase();
        const ignoredExtensions = [
            '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico', 
            '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip',
            '.css', '.js', '.json', '.xml', '.mp4', '.mp3'
        ];
        
        if (lowerPath.includes('/wp-content/uploads/')) return false;
        if (ignoredExtensions.some(ext => lowerPath.endsWith(ext))) return false;

        return true;
    } catch (_) {
        return false;
    }
};

/**
 * Parses XML content to extract all URLs from <loc> tags.
 * Designed for sitemap.xml files.
 */
const parseXml = (content: string): string[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "application/xml");

    if (doc.querySelector("parsererror")) {
        throw new Error("The uploaded XML file is malformed and could not be parsed.");
    }

    const locs = doc.querySelectorAll('loc');
    return Array.from(locs)
        .map(loc => loc.textContent?.trim() || '')
        .filter(isValidUrl);
};

/**
 * Parses TXT content, treating each line as a potential URL.
 */
const parseTxt = (content: string): string[] => {
    return content.split(/\r?\n/)
        .map(line => line.trim())
        .filter(isValidUrl);
};

/**
 * Parses CSV content, intelligently finding the URL column and extracting URLs.
 */
const parseCsv = (content: string): string[] => {
    const lines = content.split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return [];

    const headerLine = lines[0].toLowerCase();
    // Common header names for URL columns in SEO tools
    const possibleHeaders = ['url', 'address', 'urls', 'link', 'page'];
    
    // Split headers safely, handling quoted values
    const headers = (headerLine.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [])
        .map(h => h.trim().replace(/"/g, ''));

    let urlIndex = headers.findIndex(h => possibleHeaders.includes(h));

    const dataLines = lines.slice(1);

    if (urlIndex === -1) {
        // If no header matches, check if the first column of data looks like URLs
        const firstColumnData = dataLines.map(line => (line.split(',')[0] || '').trim());
        const urlLikelihood = firstColumnData.filter(isValidUrl).length / dataLines.length;

        if (urlLikelihood > 0.7) { // If >70% of the first column are valid URLs
            console.warn("No 'url' header found in CSV. Assuming first column contains URLs based on content analysis.");
            urlIndex = 0;
        } else {
             throw new Error("Could not reliably determine the URL column in the CSV file. Please use a header like 'url', 'address', or 'link'.");
        }
    }

    return dataLines.map(line => {
        const columns = line.split(',');
        return (columns[urlIndex] || '').trim().replace(/"/g, '');
    }).filter(isValidUrl);
};

/**
 * Reads a file and parses it based on its extension to extract a list of URLs.
 * @param file The file to parse (.xml, .txt, or .csv).
 * @returns A promise that resolves to an array of string URLs.
 */
export const parseFileForUrls = async (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                if (!content) {
                    throw new Error("File is empty.");
                }

                let urls: string[] = [];
                const fileExtension = file.name.split('.').pop()?.toLowerCase();

                switch (fileExtension) {
                    case 'xml':
                        urls = parseXml(content);
                        break;
                    case 'txt':
                        urls = parseTxt(content);
                        break;
                    case 'csv':
                        urls = parseCsv(content);
                        break;
                    default:
                        throw new Error('Unsupported file type. Please upload a .xml, .txt, or .csv file.');
                }
                
                if (urls.length === 0) {
                     throw new Error("No valid URLs could be extracted from the file.");
                }

                resolve(Array.from(new Set(urls))); // Return unique URLs

            } catch (e) {
                reject(e);
            }
        };
        
        reader.onerror = (error) => {
            reject(new Error(`Error reading file: ${error}`));
        };

        reader.readAsText(file);
    });
};