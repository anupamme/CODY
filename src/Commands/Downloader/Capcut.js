'use strict';

const { downloadUniversal } = require('../../Plugin/socialDl');

function findUrl(text) {
    return String(text || '').match(/https?:\/\/(?:www\.)?capcut\.com\/[^\s]+/i)?.[0]?.replace(/[)\]>.,;!?]+$/, '') || null;
}

module.exports = {
    name: 'capcut',
    alias: ['cc', 'capcutdl'],
    desc: 'Download CapCut video',
    category: 'downloader',
    usage: '.capcut <URL>',
    owner: false,

    execute: async (sock, m, { args, reply, quoted }) => {
        let url = findUrl(args.join(' '));
        if (!url) {
            const target = m.quoted || quoted;
            url = findUrl(target?.text || target?.body || target?.message?.conversation || target?.message?.extendedTextMessage?.text || target?.message?.imageMessage?.caption || target?.message?.videoMessage?.caption);
        }
        if (!url) return reply('𓄄 *Provide a valid CapCut URL!*\n\nUsage: `.capcut https://...`');

        await reply('_*✪ Downloading CapCut media...*_');
        try {
            const { buffer, mimetype } = await downloadUniversal(url);
            await sock.sendMessage(m.chat, {
                video: buffer,
                mimetype,
                caption: '⬇️ *CapCut Downloader*'
            }, { quoted: m });
        } catch (error) {
            console.error('[CAPCUT DOWNLOAD]', error.message || error);
            return reply(`✘ CapCut download failed: ${error.message || error}`);
        }
    }
};

module.exports.findUrl = findUrl;
