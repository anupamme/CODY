'use strict';

const { request, collectMedia } = require('../../Plugin/prexzyMedia');

function findUrl(text) {
    return String(text || '').match(/https?:\/\/[^\s]+facebook\.com[^\s]*/i)?.[0]?.replace(/[)\]>.,;!?]+$/, '') || null;
}

module.exports = {
    name: 'fb',
    alias: ['facebook', 'fbdown'],
    desc: 'Download Facebook video via Prexzy',
    category: 'downloader',
    usage: '.fb <Facebook URL>',
    owner: false,

    execute: async (sock, m, { args, reply, quoted }) => {
        let url = findUrl(args.join(' '));
        if (!url) {
            const target = m.quoted || quoted;
            url = findUrl(target?.text || target?.body || target?.message?.conversation || target?.message?.extendedTextMessage?.text || target?.message?.imageMessage?.caption || target?.message?.videoMessage?.caption);
        }
        if (!url) return reply('𓄄 *Provide a valid Facebook URL!*\n\nUsage: `.fb https://facebook.com/...`');

        await reply('_*✪ Downloading Facebook media...*_');
        try {
            const { data } = await request('facebookv2', url);
            if (data?.status === false || data?.success === false) throw new Error(data?.message || data?.msg || 'No media returned');
            const media = collectMedia(data);
            if (!media.length) throw new Error('No downloadable media found in facebookv2 response');

            const title = data?.result?.desc || data?.result?.title || 'Facebook media';
            for (const item of media) {
                const caption = media.indexOf(item) === 0 ? `📘 *Facebook Downloader*\n\n${title}` : '';
                if (item.kind === 'audio') {
                    await sock.sendMessage(m.chat, { audio: { url: item.url }, mimetype: 'audio/mp4', caption }, { quoted: m });
                } else if (item.kind === 'image') {
                    await sock.sendMessage(m.chat, { image: { url: item.url }, caption }, { quoted: m });
                } else {
                    await sock.sendMessage(m.chat, { video: { url: item.url }, mimetype: 'video/mp4', caption }, { quoted: m });
                }
            }
        } catch (error) {
            console.error('[FB DOWNLOAD]', error.message || error);
            return reply(`✘ Facebook download failed: ${error.message || error}`);
        }
    }
};

module.exports.findUrl = findUrl;
