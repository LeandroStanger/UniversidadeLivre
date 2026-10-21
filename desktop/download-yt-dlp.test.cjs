const assert = require('node:assert/strict');
const test = require('node:test');
const { findSha256 } = require('./download-yt-dlp.cjs');

const checksum = 'a0c3101b4158d1dfb7d6a78a7bf0f3de80c96bb423c152beec8beb22786f2238';
const denoChecksum = `Algorithm : SHA256
Hash      : ${checksum.toUpperCase()}
Path      : C:\\a\\deno\\deno\\target\\release\\deno-x86_64-pc-windows-msvc.zip`;

test('reads Deno release checksum metadata on Windows', () => {
    assert.equal(
        findSha256(denoChecksum, 'deno-x86_64-pc-windows-msvc.zip'),
        checksum
    );
});

test('reads checksums from a SHA256SUMS list', () => {
    assert.equal(
        findSha256(`${checksum} *yt-dlp.exe\n${'f'.repeat(64)} other.exe`, 'yt-dlp.exe'),
        checksum
    );
});

test('rejects metadata for a different asset', () => {
    assert.throws(
        () => findSha256(denoChecksum, 'deno-aarch64-pc-windows-msvc.zip'),
        /checksum oficial/
    );
});
