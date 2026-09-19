import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { validateBannerDimensions, validateBannerFile, validateCompanyBanner } from '../services/banner-validation.service.js';

test('accepts recommended and boundary banner dimensions', () => {
    for (const [width, height] of [[1600, 600], [1200, 400], [1200, 600], [3840, 1920]]) {
        assert.doesNotThrow(() => validateBannerDimensions(width, height, 2 * 1024 * 1024));
    }
});

test('rejects oversized files and unsuitable dimensions', () => {
    assert.throws(() => validateBannerDimensions(1600, 600, 2 * 1024 * 1024 + 1), /2 MB/);
    for (const [width, height] of [[600, 1600], [800, 300], [4000, 1600], [1600, 1600], [1800, 400], [NaN, 600]]) {
        assert.throws(() => validateBannerDimensions(width, height, 1024), { status: 400 });
    }
});

test('reads actual PNG dimensions and rejects invalid image content', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'nms-banner-'));
    const filename = path.join(directory, 'banner.png');
    try {
        // Dimension detection reads the PNG signature and IHDR header.
        const header = Buffer.alloc(33);
        Buffer.from('89504e470d0a1a0a', 'hex').copy(header);
        header.writeUInt32BE(13, 8);
        header.write('IHDR', 12);
        header.writeUInt32BE(1600, 16);
        header.writeUInt32BE(600, 20);
        await writeFile(filename, header);
        await assert.doesNotReject(validateBannerFile(filename));
        header.writeUInt32BE(600, 16);
        header.writeUInt32BE(1600, 20);
        await writeFile(filename, header);
        await assert.rejects(validateBannerFile(filename), { status: 400 });
        await writeFile(filename, 'not an image');
        await assert.rejects(validateBannerFile(filename), /valid JPG, PNG or WebP/);
    } finally {
        await unlink(filename).catch(() => {});
        await rmdir(directory);
    }
});

test('role changes cannot inspect another company file, traversal path or remote URL', async () => {
    for (const url of ['/uploads/companies/2/banner.png', '/uploads/companies/1/../banner.png', 'https://example.com/banner.png']) {
        await assert.rejects(validateCompanyBanner(url, 1), { status: 400 });
    }
});
