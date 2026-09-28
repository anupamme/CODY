'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

test('Render Blueprint targets the real repository and required runtime variables', () => {
    const yaml = fs.readFileSync('render.yaml', 'utf8');
    for (const value of [
        'repo: https://github.com/crysnovax/CODY',
        'branch: main',
        'runtime: node',
        'buildCommand: npm ci',
        'startCommand: npm start',
        'healthCheckPath: /ping',
        'key: PREFIX',
        'key: SESSION_ID',
        'key: BOT_NAME'
    ]) assert.match(yaml, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('connection manager defaults to the Render SESSION_ID variable', () => {
    const source = fs.readFileSync('library/connection/connection.js', 'utf8');
    assert.match(source, /createSocket\(sessionId\s*=\s*process\.env\.SESSION_ID\)/);
});
