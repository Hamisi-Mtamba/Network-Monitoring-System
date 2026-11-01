import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { imageSize } from 'image-size';

// Convert validation failures into HTTP-aware errors for upload handlers.
const invalid = message => Object.assign(new Error(message), { status: 400 });
export const bannerRequirements = 'Use a landscape banner 1200–3840 px wide and 400–1920 px high, with a width-to-height ratio between 2:1 and 3:1. Recommended: 1600 × 600 px.';

// Enforce the size, dimensions, and aspect ratio accepted by the portal.
export function validateBannerDimensions(width, height, size) {
    if (size > 2 * 1024 * 1024) throw invalid('Banner images must be 2 MB or smaller.');
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1200 || width > 3840 ||
        height < 400 || height > 1920 || width / height < 2 || width / height > 3) {
        throw invalid(bannerRequirements);
    }
}

// Read the uploaded file so dimensions cannot be spoofed by request metadata.
export async function validateBannerFile(filePath) {
    let size, dimensions;
    try {
        size = (await stat(filePath)).size;
        if (size > 2 * 1024 * 1024) throw invalid('Banner images must be 2 MB or smaller.');
        dimensions = imageSize(await readFile(filePath));
    } catch (error) {
        if (error.status) throw error;
        throw invalid('Unable to read this banner. Upload a valid JPG, PNG or WebP image.');
    }
    if (!['jpg', 'png', 'webp'].includes(dimensions.type)) {
        throw invalid('Banner images must be JPG, PNG or WebP.');
    }
    // Match the displayed orientation of camera JPEGs.
    const rotated = [5, 6, 7, 8].includes(dimensions.orientation);
    validateBannerDimensions(rotated ? dimensions.height : dimensions.width,
        rotated ? dimensions.width : dimensions.height, size);
}

// Restrict banner validation to files stored under the authenticated company.
export async function validateCompanyBanner(url, companyId) {
    const prefix = `/uploads/companies/${companyId}/`;
    const filename = typeof url === 'string' && url.startsWith(prefix) ? url.slice(prefix.length) : '';
    if (!/^[a-zA-Z0-9_-]+\.(jpg|png|webp)$/.test(filename)) {
        throw invalid('Upload this image again as a banner so its size and dimensions can be checked.');
    }
    await validateBannerFile(path.join(process.cwd(), 'uploads', 'companies', String(companyId), filename));
}
