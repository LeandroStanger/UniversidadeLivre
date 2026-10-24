const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.join(__dirname, '..');
const compatibilityFile = path.join(projectRoot, 'base', 'iconify-compat.js');
const outputFile = path.join(projectRoot, 'base', 'iconify-icons.json');
const compatibilitySource = fs.readFileSync(compatibilityFile, 'utf8');
const iconNames = new Set([
    ...[...compatibilitySource.matchAll(/^\s*'[^']+': '([^']+)'/gm)].map(match => match[1]),
    'fluent:apps-24-filled',
    'fluent:arrow-enter-20-regular',
    'fluent:arrow-shuffle-48-regular',
    'fluent:arrow-sort-down-lines-24-regular',
    'fluent:arrow-sort-up-lines-24-regular',
    'fluent:board-heart-24-regular',
    'fluent:border-inside-24-regular',
    'fluent:bot-sparkle-48-regular',
    'fluent:chess-24-regular',
    'fluent:clipboard-text-edit-48-regular',
    'fluent:desktop-arrow-down-48-regular',
    'fluent:delete-48-regular',
    'fluent:document-add-48-regular',
    'fluent:eye-48-regular',
    'fluent:eye-off-32-regular',
    'fluent:games-48-regular',
    'fluent:incognito-48-filled',
    'fluent:pause-48-filled',
    'fluent:paint-brush-arrow-down-24-regular',
    'fluent:people-chat-48-regular',
    'fluent:playing-cards-20-regular',
    'fluent:play-48-filled',
    'fluent:speaker-2-48-filled',
    'fluent:table-add-28-filled',
    'fluent:table-edit-28-filled',
    'fluent:table-delete-row-28-filled'
]);
const icons = {};

for (const iconName of iconNames) {
    const separator = iconName.indexOf(':');
    const prefix = iconName.slice(0, separator);
    const name = iconName.slice(separator + 1);
    let collection;
    try {
        collection = require(`@iconify/json/json/${prefix}.json`);
    } catch (error) {
        throw new Error(`Unable to load Iconify collection "${prefix}"`, { cause: error });
    }

    const icon = collection.icons[name];
    if (!icon) {
        throw new Error(`Iconify icon "${iconName}" is missing from @iconify/json`);
    }
    icons[iconName] = {
        body: icon.body,
        height: icon.height || collection.height || 24,
        width: icon.width || collection.width || 24
    };
}

fs.writeFileSync(outputFile, `${JSON.stringify(icons)}\n`);
console.log(`Built ${Object.keys(icons).length} offline Iconify icons (${(fs.statSync(outputFile).size / 1024).toFixed(1)} KiB).`);
