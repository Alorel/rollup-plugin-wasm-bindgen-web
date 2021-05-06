import nodeResolve from '@rollup/plugin-node-resolve';
import {expect} from 'chai';
import {join} from 'path';
import type {OutputChunk, RollupBuild, RollupOutput} from 'rollup';
import {rollup} from 'rollup';
import type {Opts} from './index';
import {wasmBindgen} from './index';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const alias = require('@rollup/plugin-alias');

function makeBuild(opts?: Partial<Opts>): Promise<RollupBuild> {
  return rollup({
    input: join(__dirname, 'test-input.js'),
    plugins: [
      nodeResolve(),
      alias({
        entries: {
          '@alorel/rollup-plugin-wasm-bindgen-web/autoinit-wasm-import': join(__dirname, 'autoinit-wasm-import.js')
        }
      }),
      wasmBindgen({
        ...opts,
        wasmFilter: {
          include: /core[\\/]fixture-output[\\/]index\.js$/,
          ...opts?.wasmFilter
        }
      })
    ]
  });
}

function makeBundle(build: RollupBuild): Promise<RollupOutput> {
  return build.generate({
    format: 'es',
    preferConst: true,
    preserveModules: true
  });
}

function makeRegex(exposeWasm: boolean): RegExp {
  return new RegExp(`(autoinitWasmImport|__wasmBindgenRollupPluginDynamicImportLoader)\\(import\\(['"].+['"]\\), .+, ${exposeWasm}\\)`);
}

function findEntryChunk(bundle: RollupOutput): OutputChunk | undefined {
  return bundle.output.find((f): f is OutputChunk => f.type === 'chunk' && f.isEntry)!;
}

describe('With wasm exposed', () => {
  let bundle: RollupOutput;
  let entryChunk: OutputChunk | undefined;
  before(async () => {
    bundle = await makeBundle(await makeBuild({exposeWasm: true}));
    entryChunk = findEntryChunk(bundle);
  });

  it('Should call init factory with true as the exposeWasm argument', () => {
    expect(entryChunk).to.not.eq(undefined, 'entry chunk not found');
    expect(entryChunk!.code).to.match(makeRegex(true));
  });
});

describe('Without wasm exposed', function () {
  let bundle: RollupOutput;
  let entryChunk: OutputChunk | undefined;

  before('build', async () => {
    const build = await makeBuild();
    bundle = await makeBundle(build);
    entryChunk = findEntryChunk(bundle);
  });

  it('Should have a wasm asset', () => {
    expect(bundle.output.some(m => m.type === 'asset' && m.name === 'index_bg.wasm')).to.eq(true);
  });

  it('Should render entry chunk with Promise.all', () => {
    expect(entryChunk).to.not.eq(undefined, 'entry chunk not found');
    const c = entryChunk!.code;
    expect(c).to.match(/import (autoinitWasmImport|__wasmBindgenRollupPluginDynamicImportLoader) from ['"].+autoinit-wasm-import.*['"];\n/);
    expect(c).to.match(makeRegex(false));
  });
});
