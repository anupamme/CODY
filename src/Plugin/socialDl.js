'use strict';

const path = require('node:path');
const { mkdir, readFile, unlink } = require('node:fs/promises');

let socialDlPromise;

function loadSocialDl() {
    if (!socialDlPromise) socialDlPromise = import('social-dl');
    return socialDlPromise;
}

async function saveToBuffer(save, extension) {
    const dir = path.join(process.cwd(), 'cache', 'temp');
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, `social-dl-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`);
    try {
        await save(file);
        return await readFile(file);
    } finally {
        await unlink(file).catch(() => {});
    }
}

async function downloadYouTube(url, { audioOnly = false } = {}) {
    const socialDl = await loadSocialDl();
    const extension = audioOnly ? 'm4a' : 'mp4';
    const buffer = await saveToBuffer(
        file => socialDl.universalSave(url, file, { audioOnly }),
        extension
    );
    return {
        buffer,
        title: undefined,
        mimetype: audioOnly ? 'audio/mp4' : 'video/mp4',
        extension
    };
}

async function downloadUniversal(url, { audioOnly = false } = {}) {
    const socialDl = await loadSocialDl();
    const extension = audioOnly ? 'm4a' : 'mp4';
    const buffer = await saveToBuffer(
        file => socialDl.universalSave(url, file, { audioOnly }),
        extension
    );
    return { buffer, mimetype: audioOnly ? 'audio/mp4' : 'video/mp4', extension };
}

async function downloadTikTok(url) {
    const socialDl = await loadSocialDl();
    const buffer = await saveToBuffer(
        file => socialDl.universalSave(url, file, { noWatermark: true }),
        'mp4'
    );
    return { buffer, mimetype: 'video/mp4', extension: 'mp4' };
}

async function downloadInstagram(url, format = 'mp4') {
    const socialDl = await loadSocialDl();
    const extension = format === 'mp3' ? 'mp3' : 'mp4';
    const buffer = await saveToBuffer(file => socialDl.instagramSave(url, file), extension);
    return { buffer, mimetype: format === 'mp3' ? 'audio/mpeg' : 'video/mp4', extension };
}

async function downloadFacebook(url, format = 'mp4') {
    const socialDl = await loadSocialDl();
    const extension = format === 'mp3' ? 'mp3' : 'mp4';
    const buffer = await saveToBuffer(file => socialDl.facebookSave(url, file), extension);
    return { buffer, mimetype: format === 'mp3' ? 'audio/mpeg' : 'video/mp4', extension };
}

module.exports = {
    loadSocialDl,
    downloadYouTube,
    downloadUniversal,
    downloadTikTok,
    downloadInstagram,
    downloadFacebook
};
