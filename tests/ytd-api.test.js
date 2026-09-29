'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const axios = require('axios');

global.prefix = global.prefix || '.';
const command = require('../src/Commands/Downloader/ytd.js');

// Stub axios (the HTTP seam used by prexzyMedia.request) rather than the
// exported request function — command modules destructure it at load time.
const originalGet = axios.get;
test.after(() => { axios.get = originalGet; });

function stubApi(responder) {
    axios.get = async (url) => {
        const { data, status } = await responder(url);
        return { data, status };
    };
}

function sentMessages(sockLog) {
    return sockLog.filter(args => args[1]?.video || args[1]?.audio);
}

test('ytd extracts YouTube URLs, trimming trailing punctuation', () => {
    assert.equal(command.extractUrl('download https://youtu.be/abc123!!!'), 'https://youtu.be/abc123');
    assert.equal(command.extractUrl('https://www.youtube.com/watch?v=abc&list=PL1'), 'https://www.youtube.com/watch?v=abc&list=PL1');
    assert.equal(command.extractUrl('no link here'), null);
});

test('ytd sends video via the ytmp4 endpoint and falls back through quality links', async () => {
    const calls = [];
    stubApi((url) => {
        calls.push(url);
        return {
            status: 200,
            data: {
                status: true,
                info: { title: 'Test video', quality: '1080p' },
                download_url: 'https://primary.example/video.mp4',
                qualities: [
                    { quality: '1080p', download_url: 'https://primary.example/video.mp4' },
                    { quality: '480p', download_url: 'https://fallback.example/video.mp4' }
                ]
            }
        };
    });

    const sent = [];
    const sock = { sendMessage: async (...args) => { sent.push(args); } };
    const ok = await command.sendFromApi(sock, { chat: 'x', key: {} }, 'https://youtu.be/abc');
    assert.equal(ok, true);
    assert.match(calls[0], /prexzyapis\.com\/download\/ytmp4\?url=/);
    assert.equal(sent[0][1].video.url, 'https://primary.example/video.mp4');
    assert.match(sent[0][1].caption, /Test video/);
});

test('ytd audio mode hits ytmp3 and sends an audio message', async () => {
    const calls = [];
    stubApi((url) => {
        calls.push(url);
        return {
            status: 200,
            data: { status: true, info: { title: 'Song' }, download_url: 'https://cdn.example/audio.mp3' }
        };
    });

    const sent = [];
    const sock = { sendMessage: async (...args) => { sent.push(args); } };
    const ok = await command.sendFromApi(sock, { chat: 'x', key: {} }, 'https://youtu.be/abc', true);
    assert.equal(ok, true);
    assert.match(calls[0], /prexzyapis\.com\/download\/ytmp3\?url=/);
    assert.equal(sent[0][1].audio.url, 'https://cdn.example/audio.mp3');
    assert.equal(sent[0][1].mimetype, 'audio/mpeg');
});

test('ytd retries the next quality link when the primary one fails to send', async () => {
    stubApi(() => ({
        status: 200,
        data: {
            status: true,
            info: { title: 'Test video' },
            download_url: 'https://expired.example/video.mp4',
            qualities: [{ download_url: 'https://fresh.example/video.mp4' }]
        }
    }));

    const sent = [];
    const failures = [];
    const sock = {
        sendMessage: async (chat, content) => {
            if (String(content?.video?.url || '').includes('expired')) {
                failures.push(content.video.url);
                throw new Error('403');
            }
            sent.push(content);
        }
    };
    const ok = await command.sendFromApi(sock, { chat: 'x', key: {} }, 'https://youtu.be/abc');
    assert.equal(ok, true);
    assert.equal(failures.length, 1);
    assert.equal(sent[0].video.url, 'https://fresh.example/video.mp4');
});

test('ytd surfaces the API failure message instead of a generic error', async () => {
    stubApi(() => ({
        status: 200,
        data: { status: false, message: 'Video unavailable' }
    }));
    await assert.rejects(
        () => command.sendFromApi({ sendMessage: async () => {} }, { chat: 'x', key: {} }, 'https://youtu.be/abc'),
        /Video unavailable/
    );
});
