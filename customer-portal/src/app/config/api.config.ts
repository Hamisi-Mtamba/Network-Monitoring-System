// Backend server configuration
export const API_CONFIG = {

    backendUrl: '',

    publicApiUrl: '/api/public'

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

    if (!filePath) {
        return null;
    }

    if (
        filePath.startsWith('http://') ||
        filePath.startsWith('https://')
    ) {
        return filePath;
    }

    return `${API_CONFIG.backendUrl}${filePath}`;
};
