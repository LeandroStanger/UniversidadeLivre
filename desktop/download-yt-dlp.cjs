const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { pipeline } = require('node:stream/promises');

const YT_DLP_VERSION = '2026.08.19';
const DENO_VERSION = '2.9.7';
const YT_DLP_RELEASE = `https://github.com/yt-dlp/yt-dlp/releases/download/${YT_DLP_VERSION}`;
const DENO_RELEASE = `https://github.com/denoland/deno/releases/download/v${DENO_VERSION}`;
const YT_DLP_REPOSITORY = `https://raw.githubusercontent.com/yt-dlp/yt-dlp/${YT_DLP_VERSION}`;
const DENO_REPOSITORY = `https://raw.githubusercontent.com/denoland/deno/v${DENO_VERSION}`;

function getBuildTarget(platform = process.platform, architecture = process.arch) {
    const targets = {
        'linux-x64': {
            ytDlpAsset: 'yt-dlp_linux',
            denoAsset: 'deno-x86_64-unknown-linux-gnu.zip'
        },
        'linux-arm64': {
            ytDlpAsset: 'yt-dlp_linux_aarch64',
            denoAsset: 'deno-aarch64-unknown-linux-gnu.zip'
        },
        'darwin-x64': {
            ytDlpAsset: 'yt-dlp_macos',
            denoAsset: 'deno-x86_64-apple-darwin.zip'
        },
        'darwin-arm64': {
            ytDlpAsset: 'yt-dlp_macos',
            denoAsset: 'deno-aarch64-apple-darwin.zip'
        },
        'win32-x64': {
            ytDlpAsset: 'yt-dlp.exe',
            denoAsset: 'deno-x86_64-pc-windows-msvc.zip'
        },
        'win32-arm64': {
            ytDlpAsset: 'yt-dlp_arm64.exe',
            denoAsset: 'deno-aarch64-pc-windows-msvc.zip'
        }
    };
    const target = targets[`${platform}-${architecture}`];
    if (!target) throw new Error(`Plataforma desktop não suportada: ${platform}-${architecture}.`);
    return target;
}

function getPlatformDirectory(platform, architecture) {
    const platformNames = { darwin: 'mac', win32: 'win', linux: 'linux' };
    const platformName = platformNames[platform];
    if (!platformName) throw new Error(`Plataforma desktop não suportada: ${platform}.`);
    return `${platformName}-${architecture}`;
}

async function fetchBuffer(url) {
    const response = await fetch(url, { redirect: 'follow' });
    if (!response.ok) throw new Error(`Download falhou com HTTP ${response.status}: ${url}`);
    return Buffer.from(await response.arrayBuffer());
}

async function downloadFile(url, filePath) {
    await fs.promises.writeFile(filePath, await fetchBuffer(url));
}

function findSha256(checksums, filename) {
    for (const entry of checksums.split(/\r?\n/)) {
        const match = /^([a-f0-9]{64})\s+\*?(.+)$/i.exec(entry.trim());
        if (match?.[2] === filename) return match[1].toLowerCase();
    }

    const hash = /^Hash\s*:\s*([a-f0-9]{64})\s*$/im.exec(checksums);
    const assetPath = /^Path\s*:\s*(.+?)\s*$/im.exec(checksums);
    const assetName = assetPath?.[1].split(/[\\/]/).pop();
    if (hash && assetName === filename) return hash[1].toLowerCase();

    throw new Error(`O checksum oficial de ${filename} não foi encontrado.`);
}

async function downloadVerified(url, filePath, expectedSha256) {
    const temporaryPath = `${filePath}.download`;
    try {
        await fs.promises.rm(temporaryPath, { force: true });
        await downloadFile(url, temporaryPath);
        const hash = crypto.createHash('sha256');
        await pipeline(fs.createReadStream(temporaryPath), hash);
        const actualSha256 = hash.digest('hex');
        if (actualSha256 !== expectedSha256) {
            throw new Error(`Checksum SHA-256 inválido para ${path.basename(filePath)}.`);
        }
        await fs.promises.rm(filePath, { force: true });
        await fs.promises.rename(temporaryPath, filePath);
    } catch (error) {
        await fs.promises.rm(temporaryPath, { force: true });
        throw error;
    }
}

function extractDenoArchive(archivePath, destinationDirectory) {
    if (process.platform === 'win32') {
        const escapePowerShellPath = value => path.resolve(value).replace(/'/g, "''");
        execFileSync('powershell.exe', [
            '-NoLogo',
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            `Expand-Archive -LiteralPath '${escapePowerShellPath(archivePath)}' -DestinationPath '${escapePowerShellPath(destinationDirectory)}' -Force`
        ], { stdio: 'inherit' });
        return;
    }
    execFileSync('unzip', ['-o', '-q', archivePath, 'deno', '-d', destinationDirectory], { stdio: 'inherit' });
}

async function prepareBinaries() {
    const target = getBuildTarget();
    const binaryDirectory = path.join(__dirname, 'bin', 'yt-dlp', getPlatformDirectory(process.platform, process.arch));
    const executableName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
    const denoName = process.platform === 'win32' ? 'deno.exe' : 'deno';
    const markerPath = path.join(binaryDirectory, '.versions.json');
    const temporaryDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'ulivre-yt-dlp-'));
    try {
        await fs.promises.mkdir(binaryDirectory, { recursive: true });
        try {
            const versions = JSON.parse(await fs.promises.readFile(markerPath, 'utf8'));
            const binaries = await Promise.all([
                fs.promises.stat(path.join(binaryDirectory, executableName)),
                fs.promises.stat(path.join(binaryDirectory, denoName)),
                fs.promises.stat(path.join(binaryDirectory, 'LICENSE.yt-dlp')),
                fs.promises.stat(path.join(binaryDirectory, 'THIRD_PARTY_LICENSES.yt-dlp.txt')),
                fs.promises.stat(path.join(binaryDirectory, 'LICENSE.deno.md'))
            ]);
            if (
                versions.ytDlp === YT_DLP_VERSION
                && versions.deno === DENO_VERSION
                && binaries.every(binary => binary.isFile() && binary.size > 0)
            ) {
                console.log(`yt-dlp ${YT_DLP_VERSION} and Deno ${DENO_VERSION} already prepared.`);
                return;
            }
        } catch (error) {
            if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
        }

        const [ytDlpChecksums, denoChecksum] = await Promise.all([
            fetchBuffer(`${YT_DLP_RELEASE}/SHA2-256SUMS`).then(buffer => buffer.toString('utf8')),
            fetchBuffer(`${DENO_RELEASE}/${target.denoAsset}.sha256sum`).then(buffer => buffer.toString('utf8'))
        ]);
        const ytDlpPath = path.join(binaryDirectory, executableName);
        const denoArchivePath = path.join(temporaryDirectory, target.denoAsset);
        await Promise.all([
            downloadVerified(
                `${YT_DLP_RELEASE}/${target.ytDlpAsset}`,
                ytDlpPath,
                findSha256(ytDlpChecksums, target.ytDlpAsset)
            ),
            downloadVerified(
                `${DENO_RELEASE}/${target.denoAsset}`,
                denoArchivePath,
                findSha256(denoChecksum, target.denoAsset)
            )
        ]);

        const denoExtractionDirectory = path.join(temporaryDirectory, 'deno');
        await fs.promises.mkdir(denoExtractionDirectory);
        extractDenoArchive(denoArchivePath, denoExtractionDirectory);
        await fs.promises.copyFile(path.join(denoExtractionDirectory, denoName), path.join(binaryDirectory, denoName));
        if (process.platform !== 'win32') {
            await Promise.all([
                fs.promises.chmod(ytDlpPath, 0o755),
                fs.promises.chmod(path.join(binaryDirectory, denoName), 0o755)
            ]);
        }

        await Promise.all([
            downloadFile(`${YT_DLP_REPOSITORY}/LICENSE`, path.join(binaryDirectory, 'LICENSE.yt-dlp')),
            downloadFile(`${YT_DLP_REPOSITORY}/THIRD_PARTY_LICENSES.txt`, path.join(binaryDirectory, 'THIRD_PARTY_LICENSES.yt-dlp.txt')),
            downloadFile(`${DENO_REPOSITORY}/LICENSE.md`, path.join(binaryDirectory, 'LICENSE.deno.md'))
        ]);

        const ytDlpVersion = spawnSync(ytDlpPath, ['--version'], { encoding: 'utf8' });
        const denoVersion = spawnSync(path.join(binaryDirectory, denoName), ['--version'], { encoding: 'utf8' });
        if (ytDlpVersion.status !== 0 || !ytDlpVersion.stdout.trim().startsWith(YT_DLP_VERSION)) {
            throw new Error('O binário yt-dlp preparado não passou na verificação de versão.');
        }
        if (denoVersion.status !== 0 || !denoVersion.stdout.includes(`deno ${DENO_VERSION}`)) {
            throw new Error('O runtime Deno preparado não passou na verificação de versão.');
        }
        await fs.promises.writeFile(markerPath, JSON.stringify({ ytDlp: YT_DLP_VERSION, deno: DENO_VERSION }));
        console.log(`yt-dlp ${YT_DLP_VERSION} and Deno ${DENO_VERSION} prepared for ${process.platform}-${process.arch}.`);
    } finally {
        await fs.promises.rm(temporaryDirectory, { recursive: true, force: true });
    }
}

if (require.main === module) {
    prepareBinaries().catch(error => {
        console.error('Não foi possível preparar o yt-dlp e o runtime Deno:', error);
        process.exitCode = 1;
    });
}

module.exports = { findSha256, getBuildTarget, getPlatformDirectory, prepareBinaries };
