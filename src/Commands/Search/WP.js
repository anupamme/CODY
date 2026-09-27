const axios = require('axios');
const config = require('../../../settings/config');

const BOT_NAME = config.botname || process.env.BOTNAME || 'CRYSNOVA';
const PRIMARY_API = 'https://wallpaper.crysnovax.link/api/search';
const FALLBACK_API = 'https://wallhaven.cc/api/v1/search';
const IMAGE_TIMEOUT = 30000;

function normalizeResults(data) {
    const raw = Array.isArray(data) ? data : (data?.results || data?.data || data?.wallpapers || []);
    return raw.map(item => ({
        ...item,
        proxy: item.proxy || item.path || item.thumbs?.original || item.thumbs?.large || item.url
    })).filter(item => /^https?:\/\//i.test(String(item.proxy || '')));
}

async function searchWallpapers(query) {
    try {
        const response = await axios.get(PRIMARY_API, {
            params: { query },
            timeout: 20000,
            validateStatus: () => true
        });
        if (response.status < 200 || response.status >= 300 || response.data?.status === false) {
            throw new Error(response.data?.details || response.data?.error || `Wallpaper API HTTP ${response.status}`);
        }
        const results = normalizeResults(response.data);
        if (results.length) return { results, source: 'CRYSNOVA Wallpaper API' };
        throw new Error('CRYSNOVA Wallpaper API returned no results');
    } catch (primaryError) {
        console.warn('[WALLPAPER] Primary API unavailable:', primaryError.message);
        const response = await axios.get(FALLBACK_API, {
            params: { q: query, sorting: 'relevance', page: 1 },
            timeout: 20000
        });
        const results = normalizeResults(response.data);
        if (!results.length) throw new Error('No wallpapers returned by either provider');
        return { results, source: 'Wallhaven fallback' };
    }
}

async function downloadImageBuffer(url) {
    const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: IMAGE_TIMEOUT,
        maxContentLength: 20 * 1024 * 1024,
        maxBodyLength: 20 * 1024 * 1024,
        validateStatus: status => status >= 200 && status < 300,
        headers: { Accept: 'image/*', 'User-Agent': 'CODY-Wallpaper/2.0' }
    });
    const buffer = Buffer.from(response.data);
    if (!buffer.length) throw new Error('empty image response');
    return { buffer, mimetype: response.headers?.['content-type'] || 'image/jpeg' };
}

async function resolveImages(results) {
    const resolved = await Promise.all(results.slice(0, 10).map(async wallpaper => {
        try {
            const media = await downloadImageBuffer(wallpaper.proxy);
            return { ...wallpaper, ...media };
        } catch (error) {
            console.warn('[WALLPAPER] Image skipped:', wallpaper.proxy, error.message);
            return null;
        }
    }));
    return resolved.filter(Boolean);
}

function buildCarouselCards(images, query, source) {
    return images.map((wallpaper, index) => ({
        image: wallpaper.buffer,
        mimetype: wallpaper.mimetype,
        title: `Wallpaper ${index + 1}`,
        caption: `🖼️ *Wallpaper ${index + 1}*\n🔍 ${query}\n⚉ ${source}`,
        footer: `${BOT_NAME} Vault`,
        nativeFlow: [
            { text: '📥 Download', url: wallpaper.proxy },
            { text: '📋 Copy URL', copy: wallpaper.proxy }
        ]
    }));
}

async function sendWallpaperCarousel(sock, jid, images, query, source, quoted) {
    const cards = buildCarouselCards(images, query, source);
    // Passing cards to Baileys' sendMessage path creates interactiveMessage.carouselMessage.
    // Each card contains a Buffer, so prepareWAMessageMedia uploads it instead of putting
    // an unreachable remote URL in the carousel header.
    const sent = await sock.sendMessage(jid, {
        text: `🖼️ *WALLPAPER SEARCH: ${query}*`,
        footer: `Found ${images.length} results · ${source}`,
        cards
    }, { quoted });
    if (!sent?.key?.id && !sent?.message?.key?.id && !sent?.id) {
        throw new Error('carousel send returned no message key');
    }
    return sent;
}

module.exports = {
    name: 'wallpaper',
    alias: ['wlp', 'wall'],
    desc: 'Search for beautiful wallpapers',
    category: 'Search',
    usage: '.wallpaper <query>',

    execute: async (sock, m, { args, reply }) => {
        const query = args.join(' ').trim();
        if (!query) return reply('_Provide a wallpaper query to search._');

        try {
            await sock.sendMessage(m.chat, { react: { text: '🖼️', key: m.key } });
            const { results, source } = await searchWallpapers(query);
            const images = await resolveImages(results);
            if (!images.length) throw new Error('Wallpaper URLs were returned, but none could be downloaded');

            let delivered = false;
            try {
                await sendWallpaperCarousel(sock, m.chat, images, query, source, m);
                delivered = true;
            } catch (error) {
                console.warn('[WALLPAPER] Real carousel failed; using image album fallback:', error.message);
            }
            if (!delivered) {
                for (const [index, wallpaper] of images.slice(0, 5).entries()) {
                    await sock.sendMessage(m.chat, {
                        image: wallpaper.buffer,
                        mimetype: wallpaper.mimetype,
                        caption: `🖼️ *Wallpaper ${index + 1}: ${query}*\n\n_⚉ ${BOT_NAME} Vault_\n${wallpaper.proxy}`
                    }, { quoted: m });
                }
            }
            await sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });
        } catch (error) {
            console.error('[WALLPAPER]', error.stack || error.message);
            await reply(`✘ Wallpaper search failed: ${error.message}`);
        }
    }
};

module.exports.normalizeResults = normalizeResults;
module.exports.searchWallpapers = searchWallpapers;
module.exports.downloadImageBuffer = downloadImageBuffer;
module.exports.resolveImages = resolveImages;
module.exports.buildCarouselCards = buildCarouselCards;
module.exports.sendWallpaperCarousel = sendWallpaperCarousel;
