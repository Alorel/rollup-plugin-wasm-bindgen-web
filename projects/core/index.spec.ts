import nodeResolve from '@rollup/plugin-node-resolve';
import {expect} from 'chai';
import {join} from 'path';
import type {OutputChunk, RollupOutput} from 'rollup';
import {rollup} from 'rollup';
import {wasmBindgen} from './index';

describe('PlaceholderTestSuite', function () {
  let bundle: RollupOutput;
  let entryChunk: OutputChunk | undefined;

  before('build', async () => {
    const build = await rollup({
      input: join(__dirname, 'test-input.js'),
      plugins: [
        nodeResolve(),
        wasmBindgen({
          wasmFilter: {
            include: /core[\\/]fixture-output[\\/]index\.js$/
          }
        })
      ]
    });

    bundle = await build.generate({
      format: 'es',
      preferConst: true,
      preserveModules: false
    });

    entryChunk = bundle.output.find((f): f is OutputChunk => f.type === 'chunk' && f.isEntry)!;
  });

  it('Should have a wasm asset', () => {
    expect(bundle.output.some(m => m.type === 'asset' && m.name === 'index_bg.wasm')).to.eq(true);
  });

  it('Should render entry chunk with Promise.all', () => {
    expect(entryChunk).to.not.eq(undefined, 'undefined');
    const c = entryChunk!.code;
    expect(c).to.include('import __wasmBindgenRollupPluginDynamicImportLoader from \'@alorel/rollup-plugin-wasm-bindgen-web/autoinit-wasm-import\';');
    expect(c).to.match(/__wasmBindgenRollupPluginDynamicImportLoader\(\nimport\(['"].+['"]\),\n.+\n\)/);
  });
});
