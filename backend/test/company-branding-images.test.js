import { test } from 'node:test';
import assert from 'node:assert/strict';
import { brandingImages, changeBrandingImages, saveBrandingImages } from '../services/company-branding-images.service.js';

const legacy = { primary_color: '#123456', banner_image_url: '/uploads/companies/1/banner.jpg', background_image_url: '/uploads/companies/1/background.jpg', login_image_url: '/login.jpg' };

test('legacy uploads retain their roles when another image is added', () => {
    const result = changeBrandingImages(legacy, { type: 'upload', role: 'banner', url: '/new.jpg', append: true });
    assert.equal(result.images.length, 3);
    assert.equal(result.primary_color, legacy.primary_color);
    assert.equal(result.login_image_url, legacy.login_image_url);
    assert.equal(result.banner_image_url, legacy.banner_image_url);
});

test('legacy replace uploads replace only images in that role', () => {
    const result = changeBrandingImages(legacy, { type: 'upload', role: 'banner', url: '/new.jpg' });
    assert.equal(result.images.length, 2);
    assert.equal(result.banner_image_url, '/new.jpg');
    assert.equal(result.background_image_url, legacy.background_image_url);
});

test('role changes move the existing image and synchronize legacy fields', () => {
    const result = changeBrandingImages(legacy, { type: 'role', role: 'banner', url: legacy.banner_image_url, newRole: 'background' });
    assert.equal(result.banner_image_url, null);
    assert.equal(result.images.length, 2);
    assert.ok(result.images.every(image => image.role === 'background'));
});

test('individual removal preserves the other images', () => {
    const added = changeBrandingImages(legacy, { type: 'upload', role: 'banner', url: '/new.jpg', append: true });
    const result = changeBrandingImages(added, { type: 'remove', role: 'banner', url: legacy.banner_image_url });
    assert.equal(result.images.length, 2);
    assert.equal(result.banner_image_url, '/new.jpg');
});

test('foreign images and unsupported roles are rejected', () => {
    for (const type of ['role', 'remove']) {
        assert.throws(() => changeBrandingImages(legacy, { type, role: 'banner', url: '/uploads/companies/2/banner.jpg', newRole: 'background' }), { status: 404 });
    }
    assert.throws(() => changeBrandingImages(legacy, { type: 'role', role: 'banner', url: legacy.banner_image_url, newRole: 'login' }), { status: 400 });
});

test('an empty collection does not resurrect deleted legacy artwork', () => {
    assert.deepEqual(brandingImages({ ...legacy, images: [] }), []);
});

test('writes lock and update only the resolved company, preserving other settings', async () => {
    const calls = [];
    const client = {
        query: async (sql, params) => {
            calls.push({ sql, params });
            if (sql.startsWith('SELECT')) return { rows: [{ settings: { branding: legacy, payment: { lipa_number: '123' } } }] };
            return { rows: [{ id: 1 }] };
        },
        release: () => calls.push({ sql: 'release' })
    };
    await saveBrandingImages({ connect: async () => client }, 1, { type: 'upload', role: 'background', url: '/new.jpg', append: true });
    assert.match(calls[1].sql, /WHERE id = \$1 FOR UPDATE/);
    assert.deepEqual(calls[1].params, [1]);
    assert.equal(calls[2].params[1], 1);
    assert.match(calls[2].sql, /jsonb_set.*'\{branding\}'/);
    assert.equal(calls[3].sql, 'COMMIT');
    assert.equal(calls[4].sql, 'release');
});

test('invalid image edits roll back and release the transaction', async () => {
    const calls = [];
    const client = {
        query: async sql => { calls.push(sql); return { rows: [{ settings: { branding: legacy } }] }; },
        release: () => calls.push('release')
    };
    await assert.rejects(saveBrandingImages({ connect: async () => client }, 1, { type: 'remove', role: 'banner', url: '/foreign.jpg' }), { status: 404 });
    assert.deepEqual(calls.slice(-2), ['ROLLBACK', 'release']);
    assert.ok(!calls.some(sql => sql.includes('UPDATE companies')));
});
