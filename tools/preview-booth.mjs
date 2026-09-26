#!/usr/bin/env node
/* The hero's stand as one self-contained script, for the single-file previews.

   The artifact viewer only runs scripts that are inline or come from a short
   list of CDNs, and it refuses fetch() outright. The site's stand is an ES
   module graph (booth.js -> three.js -> addons, joined by an import map) that
   fetches its model, so in a preview it never starts and the poster is all
   anyone sees. Here the whole graph is bundled into one module with no
   imports, and the model travels inside it:

     - the model is re-written without meshopt compression, so decoding it
       needs no WebAssembly (which the viewer may also refuse);
     - booth.js parses it from memory instead of loading it from a URL;
     - GLTFLoader decodes textures through <img> rather than fetch().

   Usage:  node tools/preview-booth.mjs OUT.js
   Needs:  npm install --no-save esbuild @gltf-transform/core
                                 @gltf-transform/extensions meshoptimizer
   Called by build-preview.py; not shipped (tools/ is excluded from uploads). */
import { build } from 'esbuild';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VENDOR = path.join(ROOT, 'assets/vendor/three');
const BOOTH = path.join(ROOT, 'assets/booth');

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(path.join(BOOTH, 'evolab-booth.glb'));
for (const e of doc.getRoot().listExtensionsUsed())
  if (e.extensionName === 'EXT_meshopt_compression') e.dispose();
const glb = Buffer.from(await io.writeBinary(doc)).toString('base64');

function patch(src, from, to, file){
  if (!src.includes(from)) throw new Error(`${file}: expected text not found: ${from.slice(0, 60)}`);
  return src.replace(from, to);
}

const out = process.argv[2];
await build({
  entryPoints: [path.join(BOOTH, 'booth.js')],
  bundle: true, format: 'esm', minify: true, outfile: out,
  legalComments: 'none', logLevel: 'warning',
  plugins: [{
    name: 'preview',
    setup(b){
      b.onResolve({ filter: /^three(\/addons\/.*)?$/ }, a => ({
        path: a.path === 'three' ? path.join(VENDOR, 'three.module.min.js')
                                 : path.join(VENDOR, a.path.replace(/^three\//, ''))
      }));
      b.onLoad({ filter: /booth[\\/]booth\.js$/ }, a => {
        let s = readFileSync(a.path, 'utf8');
        s = patch(s, "loader.setMeshoptDecoder(MeshoptDecoder);\n", '', 'booth.js');
        s = patch(s, "loader.load(new URL('evolab-booth.glb', import.meta.url).href, onLoad, undefined, () => {",
          "loader.parse(Uint8Array.from(atob(__GLB), c => c.charCodeAt(0)).buffer, '', onLoad, () => {", 'booth.js');
        s = patch(s, "import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';\n", '', 'booth.js');
        return { contents: `const __GLB = ${JSON.stringify(glb)};\n` + s, loader: 'js' };
      });
      b.onLoad({ filter: /GLTFLoader\.js$/ }, a => ({
        contents: patch(readFileSync(a.path, 'utf8'),
          "if ( typeof createImageBitmap === 'undefined' ||",
          "if ( true ||", 'GLTFLoader.js'),
        loader: 'js'
      }));
    }
  }]
});
