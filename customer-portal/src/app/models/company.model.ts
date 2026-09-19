export interface CompanyBrandingImage {
    url: string;
    role: 'banner' | 'background';
}

// Company branding configuration
export interface CompanyBranding {

    images?: CompanyBrandingImage[];

    primary_color?: string;

    secondary_color?: string;

    accent_color?: string;

    background_color?: string;

    navbar_color?: string;

    background_image_url?: string | null;

    login_image_url?: string | null;

    banner_image_url?: string | null;
}


// Company settings
export interface CompanySettings {

    branding?: CompanyBranding;
}


// Public company information
export interface Company {

    id: number;

    name: string;

    slug: string;

    logo_url?: string | null;

    email?: string | null;

    phone?: string | null;

    address?: string | null;

    settings?: CompanySettings;
}


// Public company API response
export interface CompanyResponse {

    success: boolean;

    company: Company;
}
// Legacy uploads remain visible until the first image edit saves the collection.
export function getBrandingImages(branding?: CompanyBranding): CompanyBrandingImage[] {
    if (Array.isArray(branding?.images)) return branding.images.filter(image =>
        image && (image.role === 'banner' || image.role === 'background') && typeof image.url === 'string' && image.url.trim());
    return (['banner', 'background'] as const).flatMap(role => {
        const url = branding?.[`${role}_image_url`]?.trim();
        return url ? [{ url, role }] : [];
    });
}
