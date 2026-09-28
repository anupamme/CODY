'use strict';

const { request, collectMedia } = require('../../Plugin/prexzyMedia');

function findUrl(text) {
    return String(text || '').match(/https?:\/\/[^\s]+instagram\.com[^\s]*/i)?.[0]?.replace(/[)\]>.,;!?]+$/, '') || null;
}

module.exports = {
    name: 'ig',
    alias: ['instagram', 'insta', 'igdl'],
    desc: 'Download Instagram reels, videos, images, and carousels',
    category: 'downloader',
    usage: '.ig <Instagram URL>',
    owner: false,

    execute: async (sock, m, { args, reply, quoted }) => {
        let url = findUrl(args.join(' '));
        if (!url) {
            const target = m.quoted || quoted;
            url = findUrl(target?.text || target?.body || target?.message?.conversation || target?.message?.extendedTextMessage?.text || target?.message?.imageMessage?.caption || target?.message?.videoMessage?.caption);
        }
        if (!url) return reply('𓄄 *Provide a valid Instagram URL!*\n\nUsage: `.ig https://instagram.com/reel/...`');

        await reply('_*✪ Downloading Instagram media...*_');
        try {
            const { data } = await request('instagram', url);
            if (data?.status === false || data?.success === false) throw new Error(data?.message || data?.msg || 'No media returned');
            const media = collectMedia(data);
            if (!media.length) throw new Error('No downloadable media found in Instagram response');

            const title = data?.result?.desc || data?.result?.title || 'Instagram media';
            for (const item of media) {
                const caption = media.indexOf(item) === 0 ? `📸 *Instagram Downloader*\n\n${title}` : '';
                if (item.kind === 'audio') {
                    await sock.sendMessage(m.chat, { audio: { url: item.url }, mimetype: 'audio/mp4', caption }, { quoted: m });
                } else if (item.kind === 'image') {
                    await sock.sendMessage(m.chat, { image: { url: item.url }, caption }, { quoted: m });
                } else {
                    await sock.sendMessage(m.chat, { video: { url: item.url }, mimetype: 'video/mp4', caption }, { quoted: m });
                }
            }
        } catch (error) {
            console.error('[IG DOWNLOAD]', error.message || error);
            return reply(`✘ Instagram download failed: ${error.message || error}`);
        }
    }
};

module.exports.findUrl = findUrl;
