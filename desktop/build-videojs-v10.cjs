const path = require('node:path');
const esbuild = require('esbuild');

esbuild.build({
    entryPoints: [path.join(__dirname, 'videojs-v10.js')],
    bundle: true,
    minify: true,
    format: 'iife',
    globalName: 'UniversidadeLivreVideoJs10',
    legalComments: 'none',
    outfile: path.join(__dirname, '..', 'base', 'videojs-v10.bundle.js')
}).catch(error => {
    console.error('Unable to build the local Video.js 10 player:', error);
    process.exitCode = 1;
});
