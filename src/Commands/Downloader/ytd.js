// yt.js — Downloads YouTube media through the prexzyapis.com hosted API.
//
// The old local `ytsave` (yt-dlp) fallback was removed: it kept dying with
// "yt-dlp exited with code 1" on datacenter IPs because YouTube blocks them
// (see vendor/yt-dlp.conf history). The prexzy API resolves those URLs fine,
// so this command is now API-only and transparent about failures.
const { request, pickUrl, apiError } = require('../../Plugin/prexzyMedia');
const PREFIX = process.env.PREFIX || '.';

const YOUTUBE_URL = /https?:\/\/(?:www\.|m\.|music\.)?(?:youtube\.com|youtu\.be)\/\S+/i;

function extractUrl(text) {
    const match = String(text || '').match(YOUTUBE_URL);
    return match ? match[0].replace(/[)>\].,;!?]+$/, '') : null;
}

function fileNameFor(title, ext) {
    const safe = String(title || 'YouTube Media').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 60);
    return `${safe}.${ext === 'audio' ? 'mp3' : 'mp4'}`;
}

/**
 * Sends one prexzyapis media response to the chat. Accepts the primary
 * `download_url` or any per-quality entry from the `qualities` array.
 * Returns true on success, false when the payload holds no usable URL.
 */
async function sendFromApi(sock, m, url, asAudio = false) {
    const { data, status } = await request(asAudio ? 'ytmp3' : 'ytmp4', url);
    if (data?.status === false || data?.success === false) throw apiError(data, status);

    const info = data.info || data.result?.info || {};
    const title = info.title || data.title || data.result?.title || 'YouTube Media';

    // Primary link first, then every quality fallback the API offers. googlevideo
    // links expire quickly and can 403 one-at-a-time, so keep trying until one
    // actually sends.
    const candidates = [
        data.download_url,
        data.url,
        data.result?.download_url,
        data.result?.url,
        data.data?.download_url,
        ...(Array.isArray(data.qualities) ? data.qualities : [])
            .map(q => q?.download_url || q?.url)
            .filter(u => typeof u === 'string')
    ];

    const failures = [];
    for (const candidate of candidates) {
        const mediaUrl = pickUrl(candidate);
        if (!mediaUrl) continue;

        try {
            if (asAudio) {
                await sock.sendMessage(m.chat, {
                    audio: { url: mediaUrl },
                    mimetype: 'audio/mpeg',
                    fileName: fileNameFor(title, 'audio')
                }, { quoted: m });
            } else {
                await sock.sendMessage(m.chat, {
                    video: { url: mediaUrl },
                    caption: `${title} · ${data.quality || info.quality || ''}`.trim(),
                    mimetype: 'video/mp4'
                }, { quoted: m });
            }
            return true;
        } catch (error) {
            failures.push(error.message || String(error));
        }
    }

    if (failures.length) {
        throw new Error(`media link failed: ${failures.join(' | ')}`);
    }
    return false;
}

module.exports = {
    name: 'yt',
    alias: ['youtube', 'ytdl', 'youtubedownload'],
    desc: 'Download YouTube video or audio',
    category: 'Search',
    usage: `${PREFIX}yt <youtube url> [-a for mp3]`,
    examples: [`.yt https://youtu.be/rsF9VaubHWM`, `.yt https://youtu.be/rsF9VaubHWM -a`],

    execute: async (sock, m, { args, reply }) => {
        const raw = (args.join(' ').trim()) || m.quoted?.body || m.quoted?.text || '';
        const asAudio = /(^|\s)(-a|--audio|mp3)(\s|$)/i.test(raw);
        const url = extractUrl(raw);

        if (!url) {
            return reply(`⊘ *Usage:* ${PREFIX}yt <youtube url>\n📝 *Audio:* ${PREFIX}yt <url> -a`);
        }

        await sock.sendMessage(m.chat, { react: { text: '📥', key: m.key } });

        try {
            if (await sendFromApi(sock, m, url, asAudio)) {
                return sock.sendMessage(m.chat, { react: { text: '❤️‍🩹', key: m.key } });
            }
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            return reply(`⊘ *Download failed.*\nThe API returned no media link for this video.`);
        } catch (error) {
            console.error('[YT API]', error.message || error);
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply(`⊘ *Download failed.*\n${error.message || error}`);
        }
    }
};

// Kept public for focused command-level tests; the bot router still uses execute().
module.exports.extractUrl = extractUrl;
module.exports.sendFromApi = sendFromApi;
