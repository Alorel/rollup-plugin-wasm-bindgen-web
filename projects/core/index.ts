import type {FilterPattern} from '@rollup/pluginutils';
import {createFilter} from '@rollup/pluginutils';
import type {SimpleLiteral} from 'estree';
import type {BaseNode} from 'estree-walker';
import {asyncWalk} from 'estree-walker';
import MagicString from 'magic-string';
import {basename, dirname, extname, join} from 'path';
import type {AcornNode, Plugin, TransformResult} from 'rollup';
import {AssetLoader} from './AssetLoader';

const enum Strings {
  ImportName = '__wasmBindgenRollupPluginDynamicImportLoader'
}

const enum AstTypes {
  ImportExpression = 'ImportExpression',
  Literal = 'Literal'
}

function resolveWasmFile(id: string): [string, string] {
  const base = basename(id, extname(id));
  const wasmName = `${base}_bg.wasm`;

  return [wasmName, join(dirname(id), wasmName)];
}

/** Standard Rollup filter */
interface Filter {
  exclude?: FilterPattern;

  include?: FilterPattern;
}

interface Opts {

  /**
   * JS source files to look for dynamic imports in.
   * @default {include: /\.[jt]sx?$/}
   */
  jsFilter?: Filter;

  /**
   * Whether to include a source map in the generated code
   * @default true
   */
  sourceMap?: boolean;

  /**
   * Filter to match dynamically imported wasm-bindgen output files
   * @default Don't match anything
   */
  wasmFilter?: Filter;
}

function wasmBindgenPlugin(opts: Opts): Plugin { // eslint-disable-line max-lines-per-function
  const {
    jsFilter = {
      include: /\.[jt]sx?$/
    },
    sourceMap = true,
    wasmFilter
  } = opts;

  const matchesWasm = createFilter(wasmFilter?.include, wasmFilter?.exclude);
  const matchesJs = createFilter(jsFilter.include, jsFilter.exclude);
  const wasmLoader = new AssetLoader();
  const returnTransformResult: (ms: MagicString) => TransformResult = sourceMap ?
    (ms => ({code: ms.toString(), map: ms.generateMap()})) :
    (ms => ({code: ms.toString(), map: {mappings: ''}}));

  return {
    name: 'rollup-plugin-wasm-bindgen-web',
    async transform(code, id) {
      if (!matchesJs(id)) {
        return null;
      }

      const ctx = this; // eslint-disable-line @typescript-eslint/no-this-alias
      const importExpressions: Array<{ id: string; node: any; }> = [];
      const ast = this.parse(code);

      // Find dynamic imports for our wasm modules
      await asyncWalk(ast as unknown as BaseNode, {
        async enter(node: any) { // typings don't have import expressions..
          if (
            node.type !== AstTypes.ImportExpression ||
            node.source?.type !== AstTypes.Literal
          ) {
            return;
          }

          const source = node.source as SimpleLiteral & AcornNode;
          const importedId = (await ctx.resolve(source.value as string, id))?.id;
          if (!importedId || !matchesWasm(importedId)) {
            return;
          }

          importExpressions.push({id: importedId, node});
        }
      });

      if (!importExpressions.length) {
        return {ast, code, map: null};
      }

      const ms = new MagicString(code);

      // Emit a wasm asset and format each dynamic import
      await Promise.all(
        importExpressions.map(async ({id: wasmBridgeId, node}) => {
          const [name, wasmPath] = resolveWasmFile(wasmBridgeId);
          const source = await wasmLoader.load(wasmPath);
          const assetId = this.emitFile({
            name,
            source,
            type: 'asset'
          });
          ms.prependLeft(node.start, `${Strings.ImportName}(\n`);
          ms.appendRight(node.end, `,\nimport.meta.ROLLUP_FILE_URL_${assetId}\n)`);
        })
      );

      ms.prepend(`import ${Strings.ImportName} from '@alorel/rollup-plugin-wasm-bindgen-web/autoinit-wasm-import';\n`);

      return returnTransformResult(ms);
    },
    watchChange(id) {
      wasmLoader.invalidate(id);
    }
  };
}

export {
  Opts,
  wasmBindgenPlugin as wasmBindgen
};
