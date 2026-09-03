// =========================================================
// COMPANY BRANDING
// =========================================================

export interface CompanyBranding {

    primary_color?: string | null;

    secondary_color?: string | null;

    accent_color?: string | null;

    background_color?: string | null;

    navbar_color?: string | null;

    background_image_url?: string | null;

    login_image_url?: string | null;

    banner_image_url?: string | null;
}


// =========================================================
// COMPANY SETTINGS
// =========================================================

export interface CompanySettings {

    branding?: CompanyBranding;
}


// =========================================================
// COMPANY
// =========================================================

export interface Company {

    id: number;

    name: string;

    slug: string;

    logo_url?: string | null;

    email?: string | null;

    phone?: string | null;

    address?: string | null;

    status: string;

    settings?: CompanySettings | null;

    created_at?: string;

    updated_at?: string;


    // Platform list statistics
    admin_count?: number;

    package_count?: number;

    payment_count?: number;
}


// =========================================================
// PLATFORM COMPANY LIST RESPONSE
// =========================================================

export interface CompaniesResponse {

    success: boolean;

    companies: Company[];
}


// =========================================================
// SINGLE COMPANY RESPONSE
// =========================================================

export interface CompanyResponse {

    success: boolean;

    company: Company;

    message?: string;
}


// =========================================================
// CREATE COMPANY REQUEST
// =========================================================

export interface CreateCompanyRequest {

    name: string;

    slug: string;

    email?: string | null;

    phone?: string | null;

    address?: string | null;

    logo_url?: string | null;

    settings?: CompanySettings;

    branding?: CompanyBranding;
}


// =========================================================
// UPDATE COMPANY REQUEST
// =========================================================

export interface UpdateCompanyRequest {

    name?: string;

    slug?: string;

    email?: string | null;

    phone?: string | null;

    address?: string | null;

    logo_url?: string | null;
}


// =========================================================
// UPDATE COMPANY BRANDING REQUEST
// =========================================================

export interface UpdateCompanyBrandingRequest {

    logo_url?: string | null;

    branding?: CompanyBranding;
}


// =========================================================
// UPDATE COMPANY LOGO REQUEST
// =========================================================

export interface UpdateCompanyLogoRequest {

    logo_url: string | null;
}


// =========================================================
// COMPANY IMAGE TYPES
// =========================================================

export type CompanyBrandingImageType =
    | 'background'
    | 'login'
    | 'banner';


// =========================================================
// COMPANY IMAGE UPLOAD RESPONSE
// =========================================================

export interface CompanyImageUploadResponse {

    success: boolean;

    message?: string;

    company?: Company;

    url?: string;

    image_url?: string;

    logo_url?: string;
}