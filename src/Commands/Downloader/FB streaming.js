'use strict';

const { downloadFacebook } = require('../../Plugin/socialDl');

function findUrl(text) {
    return String(text || '').match(/https?:\/\/[^\s]+(?:facebook\.com|fb\.watch)[^\s]*/i)?.[0]?.replace(/[)\]>.,;!?]+$/, '') || null;
}

module.exports = {
    name: 'fbstream',
    alias: ['fbs', 'fbsdown'],
    desc: 'Download Facebook video',
    category: 'downloader',
    usage: '.fbstream <Facebook URL>',
    owner: false,

    execute: async (sock, m, { args, reply, quoted }) => {
        let url = findUrl(args.join(' '));
        if (!url) {
            const target = m.quoted || quoted;
            url = findUrl(target?.text || target?.body || target?.message?.conversation || target?.message?.extendedTextMessage?.text || target?.message?.imageMessage?.caption || target?.message?.videoMessage?.caption);
        }
        if (!url) return reply('𓄄 *Provide a valid Facebook URL!*\n\nUsage: `.fbstream https://facebook.com/...`');

        await sock.sendMessage(m.chat, { react: { text: '📘', key: m.key } });
        try {
            const { buffer, mimetype } = await downloadFacebook(url);
            await sock.sendMessage(m.chat, {
                video: buffer,
                mimetype,
                fileName: 'facebook_video.mp4',
                caption: '📘 *Facebook Downloader*'
            }, { quoted: m });
            await sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });
        } catch (error) {
            console.error('[FB STREAM ERROR]', error.message || error);
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } }).catch(() => {});
            return reply(`✘ Facebook download failed: ${error.message || error}`);
        }
    }
};
