'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const socialDl = require('../src/Plugin/socialDl');
const command = require('../src/Commands/Downloader/ytd.js');

test('ytd extracts YouTube URLs and trims trailing punctuation', () => {
    assert.equal(command.extractUrl('download https://youtu.be/abc123!!!'), 'https://youtu.be/abc123');
    assert.equal(command.extractUrl('https://www.youtube.com/watch?v=abc&list=PL1'), 'https://www.youtube.com/watch?v=abc&list=PL1');
    assert.equal(command.extractUrl('no link here'), null);
});

test('ytd sends a social-dl video buffer', async () => {
    const original = socialDl.downloadYouTube;
    const sent = [];
    socialDl.downloadYouTube = async (url, options) => {
        assert.equal(url, 'https://youtu.be/abc12345678');
        assert.deepEqual(options, { audioOnly: false });
        return { buffer: Buffer.from('video'), mimetype: 'video/mp4' };
    };
    try {
        await command.sendFromSocialDl({ sendMessage: async (...args) => sent.push(args) }, { chat: 'x' }, 'https://youtu.be/abc12345678');
    } finally {
        socialDl.downloadYouTube = original;
    }
    assert.deepEqual(sent[0][1].video, Buffer.from('video'));
    assert.equal(sent[0][1].mimetype, 'video/mp4');
});

test('ytd sends a social-dl audio buffer when requested', async () => {
    const original = socialDl.downloadYouTube;
    const sent = [];
    socialDl.downloadYouTube = async (url, options) => {
        assert.equal(options.audioOnly, true);
        return { buffer: Buffer.from('audio'), mimetype: 'audio/mp4' };
    };
    try {
        await command.sendFromSocialDl({ sendMessage: async (...args) => sent.push(args) }, { chat: 'x' }, 'https://youtu.be/abc12345678', true);
    } finally {
        socialDl.downloadYouTube = original;
    }
    assert.deepEqual(sent[0][1].audio, Buffer.from('audio'));
    assert.equal(sent[0][1].mimetype, 'audio/mp4');
});
