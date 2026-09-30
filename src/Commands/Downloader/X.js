'use strict';

const { downloadUniversal } = require('../../Plugin/socialDl');

function findUrl(text) {
    return String(text || '').match(/https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/[^\s]+/i)?.[0]?.replace(/[)\]>.,;!?]+$/, '') || null;
}

module.exports = {
    name: 'x',
    alias: ['twitter', 'xdl'],
    desc: 'Download X/Twitter video',
    category: 'downloader',
    usage: '.x <URL>',
    owner: false,

    execute: async (sock, m, { args, reply, quoted }) => {
        let url = findUrl(args.join(' '));
        if (!url) {
            const target = m.quoted || quoted;
            url = findUrl(target?.text || target?.body || target?.message?.conversation || target?.message?.extendedTextMessage?.text || target?.message?.imageMessage?.caption || target?.message?.videoMessage?.caption);
        }
        if (!url) return reply('𓄄 *Provide a valid X/Twitter URL!*\n\nUsage: `.x https://...`');

        await reply('_*✪ Downloading X/Twitter media...*_');
        try {
            const { buffer, mimetype } = await downloadUniversal(url);
            await sock.sendMessage(m.chat, {
                video: buffer,
                mimetype,
                caption: '⬇️ *X/Twitter Downloader*'
            }, { quoted: m });
        } catch (error) {
            console.error('[X DOWNLOAD]', error.message || error);
            return reply(`✘ X/Twitter download failed: ${error.message || error}`);
        }
    }
};

module.exports.findUrl = findUrl;
