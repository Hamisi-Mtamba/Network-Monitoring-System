// Company branding configuration
export interface CompanyBranding {

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