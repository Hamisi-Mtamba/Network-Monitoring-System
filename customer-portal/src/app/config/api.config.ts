// Backend server URL
export const API_CONFIG = {

    // Main backend server
    backendUrl: 'http://192.168.88.254:4000',

    // Public API root
    publicApiUrl: 'http://192.168.88.254:4000/api/public'

} as const;


// Build one company's public API URL
export const getCompanyPublicApiUrl = (
    companySlug: string
): string => {

    return `${API_CONFIG.publicApiUrl}/companies/${companySlug}`;
};


// Convert backend upload paths into browser URLs
export const getPublicFileUrl = (
    filePath?: string | null
): string | null => {

    // Stop when there is no file
    if (!filePath) {
        return null;
    }

    // Leave complete external URLs unchanged
    if (
        filePath.startsWith('http://') ||
        filePath.startsWith('https://')
    ) {
        return filePath;
    }

    // Prefix locally uploaded images with backend server
    return `${API_CONFIG.backendUrl}${filePath}`;
};