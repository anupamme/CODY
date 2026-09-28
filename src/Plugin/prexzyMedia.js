'use strict';

const axios = require('axios');

const API_BASE = 'https://prexzyapis.com/download/';
const HTTP_URL = /^https?:\/\//i;

function pickUrl(...values) {
    return values.find(value => typeof value === 'string' && HTTP_URL.test(value)) || null;
}

function request(endpoint, sourceUrl, options = {}) {
    const url = `${API_BASE}${endpoint}?url=${encodeURIComponent(sourceUrl)}`;
    return axios.get(url, {
        timeout: options.timeout || 60000,
        headers: {
            Accept: 'application/json',
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36'
        }
    });
}

function mediaKind(item, url) {
    const declared = String(item?.type || item?.mime || item?.format || '').toLowerCase();
    if (declared.includes('audio') || /^(m4a|mp3|aac|ogg|wav|opus)$/.test(declared)) return 'audio';
    if (declared.includes('image') || /^(jpg|jpeg|png|gif|webp)$/.test(declared)) return 'image';
    if (declared.includes('video') || /^(mp4|mov|webm|mkv)$/.test(declared)) return 'video';
    const path = String(url || '').split('?')[0].toLowerCase();
    if (/\.(m4a|mp3|aac|ogg|wav|opus)$/.test(path)) return 'audio';
    if (/\.(jpg|jpeg|png|gif|webp)$/.test(path)) return 'image';
    return 'video';
}

function itemFromObject(value) {
    if (!value || typeof value !== 'object') return null;
    const url = pickUrl(
        value.original_url,
        value.download_url,
        value.without_water_mark_mp4,
        value.without_water_mark_video,
        value.water_mark_mp4,
        value.water_mark_video,
        value.no_watermark,
        value.video,
        value.image,
        value.url,
        value.link,
        value.src
    );
    if (!url) return null;
    return {
        url,
        kind: mediaKind(value, url),
        title: value.title || value.desc || value.description || '',
        thumbnail: pickUrl(value.thumb, value.cover, value.thumbnail, value.original_thumb, value.original_cover)
    };
}

function collectMedia(data) {
    const root = data?.result || data?.data || data || {};
    const items = [];
    const seen = new Set();
    const add = (item) => {
        if (!item?.url || seen.has(item.url)) return;
        seen.add(item.url);
        items.push(item);
    };

    const visit = (value, depth = 0) => {
        if (depth > 8 || value == null) return;
        if (typeof value === 'string') {
            if (HTTP_URL.test(value)) add({ url: value, kind: mediaKind(null, value) });
            return;
        }
        if (Array.isArray(value)) {
            value.forEach(entry => visit(entry, depth + 1));
            return;
        }
        if (typeof value !== 'object') return;
        const item = itemFromObject(value);
        if (item) add(item);
        for (const [key, child] of Object.entries(value)) {
            if (/^(url|original_url|download_url|link|src|thumb|cover|thumbnail)$/i.test(key)) continue;
            visit(child, depth + 1);
        }
    };

    visit(root);
    return items;
}

function firstInfo(data) {
    return data?.info || data?.result?.info || data?.data?.info || {};
}

module.exports = { request, pickUrl, collectMedia, firstInfo, mediaKind };
