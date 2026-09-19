import { validateCompanyBanner } from './banner-validation.service.js';

// These are the only image roles persisted by the branding workflow.
export const imageRoles = ['banner', 'background'];

// Keep legacy single-image branding usable without a database migration.
export function brandingImages(branding = {}) {
    if (Array.isArray(branding.images)) {
        return branding.images.filter(image => image && imageRoles.includes(image.role) && typeof image.url === 'string');
    }
    return imageRoles.flatMap(role => branding[`${role}_image_url`]
        ? [{ url: branding[`${role}_image_url`], role }] : []);
}

export function changeBrandingImages(branding, action) {
    // Normalize legacy fields before applying the requested image operation.
    let images = brandingImages(branding);
    if (!imageRoles.includes(action.role)) {
        throw Object.assign(new Error('Invalid image role'), { status: 400 });
    }
    if (action.type === 'upload') {
        if (!action.append) images = images.filter(image => image.role !== action.role);
        images = [...images, { url: action.url, role: action.role }];
    } else {
        // Match only an image already stored on the authenticated company.
        const match = images.find(image => image.url === action.url && image.role === action.role);
        if (action.url && !match) {
            throw Object.assign(new Error('Company image not found'), { status: 404 });
        }
        if (action.type === 'role') {
            if (!match || !imageRoles.includes(action.newRole)) {
                throw Object.assign(new Error('Select a valid image and role'), { status: 400 });
            }
            images = images.map(image => image === match ? { ...image, role: action.newRole } : image);
        } else {
            images = images.filter(image => action.url ? image !== match : image.role !== action.role);
        }
    }
    return {
        ...branding,
        images,
        banner_image_url: images.find(image => image.role === 'banner')?.url ?? null,
        background_image_url: images.find(image => image.role === 'background')?.url ?? null
    };
}

// Serialize edits per company so uploads and role changes cannot overwrite one another.
export async function saveBrandingImages(pool, companyId, action) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const current = await client.query('SELECT settings FROM companies WHERE id = $1 FOR UPDATE', [companyId]);
        if (!current.rows.length) throw Object.assign(new Error('Company not found'), { status: 404 });
        const branding = changeBrandingImages(current.rows[0].settings?.branding ?? {}, action);
        if (action.type === 'role' && action.newRole === 'banner') {
            await validateCompanyBanner(action.url, companyId);
        }
        const result = await client.query(`
            UPDATE companies SET settings = jsonb_set(COALESCE(settings, '{}'::jsonb), '{branding}', $1::jsonb, true),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id, name, slug, logo_url, email, phone, address, settings, status, created_at, updated_at
        `, [JSON.stringify(branding), companyId]);
        await client.query('COMMIT');
        return result.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}
