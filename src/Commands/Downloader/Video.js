const yts = require('yt-search');
const axios = require('axios');
const { request, pickUrl, apiError } = require('../../Plugin/prexzyMedia');

module.exports = {
    name: 'video',
    alias: ['ytvideo', 'ytv'],
    desc: 'Download YouTube video',
    category: 'downloader',

    execute: async (sock, m, { text, reply }) => {
        try {

            if (!text) {
                return reply("✘ Provide a video name\nExample: `${prefix}video Alan Walker Lily`");
            }

            await sock.sendMessage(m.chat, {
                react: { text: "🔎", key: m.key }
            });

            const { videos } = await yts(text);
            if (!videos.length) {
                await sock.sendMessage(m.chat, {
                    react: { text: "🙈", key: m.key }
                });
                return reply("𓄄 _*No video found*_");
            }

            const vid = videos[0];

            await sock.sendMessage(m.chat, {
                react: { text: "⬇️", key: m.key }
            });

        //    await sock.sendMessage(m.chat, {
        //        image: { url: vid.thumbnail },
          //      caption:
//`亗 *${vid.title}*

//𓄄 Duration: ${vid.timestamp}
//⚉ Views: ${vid.views}
//✦ Channel: ${vid.author.name}

//✪ _*Downloading video...*_`
        //    }, { quoted: m });

            const { data, status } = await request('ytmp4', vid.url);

            // The prexzy ytmp4 endpoint returns a ready-to-stream mp4 link
            // (top-level download_url, plus per-quality entries as fallback).
            const videoDownloadUrl = pickUrl(
                data?.download_url,
                data?.url,
                ...(Array.isArray(data?.qualities) ? data.qualities : [])
                    .map(q => q?.download_url || q?.url)
                    .filter(u => typeof u === 'string')
            );

            if (!data?.status || !videoDownloadUrl) {
                await sock.sendMessage(m.chat, {
                    react: { text: "🤧", key: m.key }
                });
                if (!data?.status) throw apiError(data, status);
                return reply("✘ Failed to download video");
            }

            await sock.sendMessage(m.chat, {
                react: { text: "📤", key: m.key }
            });

            // Download to buffer for reliable playback (URL streaming fails in WhatsApp)
            const videoBuffer = await axios.get(videoDownloadUrl, { responseType: 'arraybuffer', timeout: 120000 });

            const channelHandle = extractChannelHandle(vid.author);

            await sock.sendMessage(m.chat, {
                video: videoBuffer.data,
                mimetype: "video/mp4",
                caption: `☕︎ ${channelHandle} — ${vid.timestamp}`
            }, { quoted: m });

            await sock.sendMessage(m.chat, {
                react: { text: "🐾", key: m.key }
            });

        } catch (err) {
            console.log(err);

            await sock.sendMessage(m.chat, {
                react: { text: "😞", key: m.key }
            });

            reply("✘ Error downloading video");
        }
    }
};

// Pulls the @handle out of the channel URL when one exists (author.url like
// https://youtube.com/@crysnovax), falling back to the display name if the
// channel only has a /channel/UC... URL with no vanity handle set.
function extractChannelHandle(author) {
    if (!author) return 'Unknown';

    const url = author.url || '';
    const handleMatch = url.match(/\/@([^/?#]+)/);

    if (handleMatch) {
        return `@${handleMatch[1]}`;
    }

    // No @handle in the URL (plain /channel/UC... link) — fall back to
    // the display name rather than showing a broken/empty handle
    return author.name || 'Unknown';
}
