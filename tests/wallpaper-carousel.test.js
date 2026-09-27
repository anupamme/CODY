'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const wallpaper = require('../src/Commands/Search/WP.js');

test('wallpaper carousel cards use image buffers and native URL buttons', () => {
    const cards = wallpaper.buildCarouselCards([
        { proxy: 'https://cdn.example/a.jpg', buffer: Buffer.from('image'), mimetype: 'image/jpeg' }
    ], 'nature', 'Test provider');
    assert.equal(cards.length, 1);
    assert.ok(Buffer.isBuffer(cards[0].image));
    assert.equal(cards[0].nativeFlow[0].url, 'https://cdn.example/a.jpg');
    assert.equal(cards[0].nativeFlow[1].copy, 'https://cdn.example/a.jpg');
});

test('wallpaper carousel sends cards through the standard Baileys sendMessage path', async () => {
    const calls = [];
    const sent = await wallpaper.sendWallpaperCarousel({
        sendMessage: async (...args) => {
            calls.push(args);
            return { key: { id: 'carousel-1' } };
        }
    }, 'chat@s.whatsapp.net', [
        { proxy: 'https://cdn.example/a.jpg', buffer: Buffer.from('image'), mimetype: 'image/jpeg' }
    ], 'nature', 'Test provider', { key: { id: 'quoted' } });
    assert.equal(sent.key.id, 'carousel-1');
    assert.equal(calls.length, 1);
    assert.equal(calls[0][1].cards.length, 1);
    assert.ok(Buffer.isBuffer(calls[0][1].cards[0].image));
    assert.deepEqual(calls[0][2], { quoted: { key: { id: 'quoted' } } });
});
