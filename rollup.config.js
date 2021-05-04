const {join} = require('path');
const {_buildBaseExternals, _buildUmdExternals} = require('./build/rollup/_baseExternals');
const {_buildLazyReq} = require('./build/rollup/_lazyReq');
const {_buildGroup} = require('./build/rollup/_buildGroup');
const replacePlugin = require('@rollup/plugin-replace');

// ########## BEGIN SETUP

const CONFIG = {
  assetFileNames: '[name][extname]',
  get cjsPluginSettings() {
    /*
     *   return {
     *   extensions: CONFIG.extensions,
     *   include: null,
     *   sourceMap: CONFIG.sourcemap
     * }
     */

    return null;
  },
  distDir: join(__dirname, 'dist'),
  dtsPluginSettings: {
    cliArgs: ['--rootDir', 'src']
  },
  entryFileNames: '[name].js',
  extensions: [
    '.js',
    '.ts'
  ],
  mainFields: [
    'fesm5',
    'esm5',
    'module',
    'browser',
    'main'
  ],
  sourcemap: false,
  srcDir: join(__dirname, 'projects'),
  umd: {
    globals: {},
    name: {
      core: 'MyLibrary'
    }
  }
};

// ########## END SETUP

function createConfig(rollupConfig) {
  const {
    project,
    cjs5 = false,
    fcjs5 = false,
    cjs2015 = false,
    fcjs2015 = false,
    esm5 = false,
    fesm5 = false,
    esm2015 = false,
    fesm2015 = false,
    stdumd = false,
    minumd = false,
    dts = false,
    tsconfig = 'tsconfig.json',
    watch = false
  } = rollupConfig;

  if ([cjs5, fcjs5, cjs2015, fcjs2015].filter(Boolean).length > 1) {
    throw new Error('These options are mutually exclusive: cjs5, fcjs5, cjs2015, fcjs2015');
  } else if (![cjs5, fcjs5, cjs2015, fcjs2015, esm5, fesm5, esm2015, fesm2015, stdumd, minumd].some(Boolean)) {
    throw new Error('At least one option required: cjs5, fcjs5, cjs2015, fcjs2015, esm5, fesm5, esm2015, fesm2015, minumd, stdumd');
  }

  const distDir = join(CONFIG.distDir, project);
  const projectDir = join(CONFIG.srcDir, project);

  const baseSettings = {
    external: _buildBaseExternals,
    input: join(projectDir, 'index.ts'),
    watch: {
      exclude: 'node_modules/**/*'
    }
  };

  const baseOutput = {
    assetFileNames: CONFIG.assetFileNames,
    dir: distDir,
    entryFileNames: CONFIG.entryFileNames,
    sourcemap: CONFIG.sourcemap
  };

  function getBasePlugins(ecma, typescriptConfig = {}) {
    const cjsSettings = CONFIG.cjsPluginSettings;

    return [
      _buildLazyReq.nodeResolve(CONFIG),
      cjsSettings && require('@rollup/plugin-commonjs').default(cjsSettings),
      require('rollup-plugin-typescript2')({
        tsconfig,
        ...typescriptConfig
      }),
      replacePlugin({
        exclude: /node_modules[\\/]/,
        include: /src[\\/].+\.ts/,
        preventAssignment: true,
        values: {
          'process.env.ES_TARGET': JSON.stringify(ecma)
        }
      })
    ].filter(Boolean);
  }

  const BG = Symbol('Build group');
  const outConfig = [];

  if (cjs5 || esm5) {
    const es5BaseOutput = {
      ...baseOutput,
      preferConst: false
    };

    outConfig.push({
      ...baseSettings,
      [BG]: _buildGroup.ES5,
      output: [
        cjs5 && {
          ...es5BaseOutput,
          format: 'cjs'
        },
        esm5 && {
          ...es5BaseOutput,
          dir: join(distDir, '_esm5'),
          format: 'es'
        }
      ].filter(Boolean),
      plugins: getBasePlugins('es5', {
        tsconfigOverride: {
          compilerOptions: {
            target: 'es5'
          }
        }
      }),
      preserveModules: true
    });
  }

  if (cjs2015 || esm2015) {
    const es6BaseOutput = {
      ...baseOutput,
      preferConst: true
    };

    outConfig.push({
      ...baseSettings,
      [BG]: _buildGroup.ES6,
      output: [
        cjs2015 && {
          ...es6BaseOutput,
          format: 'cjs'
        },
        esm2015 && {
          ...es6BaseOutput,
          dir: join(distDir, '_esm2015'),
          format: 'es'
        }
      ].filter(Boolean),
      plugins: getBasePlugins('es2015'),
      preserveModules: true
    });
  }

  if (fcjs5 || fesm5) {
    const fesm5BaseOutput = {
      ...baseOutput,
      banner: _buildLazyReq.bannerFn,
      preferConst: false
    };

    outConfig.push({
      ...baseSettings,
      [BG]: _buildGroup.FLAT_ES5,
      output: [
        fcjs5 && {
          ...fesm5BaseOutput,
          format: 'cjs'
        },
        fesm5 && {
          ...fesm5BaseOutput,
          dir: join(distDir, '_fesm5'),
          format: 'es'
        }
      ].filter(Boolean),
      plugins: getBasePlugins('es5', {
        tsconfigOverride: {
          compilerOptions: {
            target: 'es5'
          }
        }
      }),
      preserveModules: false
    });
  }

  if (fcjs2015 || fesm2015) {
    const fesm2015BaseOutput = {
      ...baseOutput,
      banner: _buildLazyReq.bannerFn,
      preferConst: true
    };

    outConfig.push({
      ...baseSettings,
      [BG]: _buildGroup.FLAT_ES6,
      output: [
        fcjs2015 && {
          ...fesm2015BaseOutput,
          format: 'cjs'
        },
        fesm2015 && {
          ...fesm2015BaseOutput,
          dir: join(distDir, '_fesm2015'),
          format: 'es'
        }
      ].filter(Boolean),
      plugins: getBasePlugins('es2015'),
      preserveModules: false
    });
  }

  if (stdumd || minumd) {
    if (!CONFIG.umd.name[project]) {
      throw new Error(`Umd name missing for ${project}`);
    }
    const umdBaseOutput = {
      ...baseOutput,
      banner: _buildLazyReq.bannerFn,
      dir: join(distDir, '_umd'),
      format: 'umd',
      globals: CONFIG.umd.globals,
      name: CONFIG.umd.name[project],
      preferConst: false
    };

    outConfig.push({
      ...baseSettings,
      [BG]: _buildGroup.UMD,
      external: _buildUmdExternals,
      output: [
        stdumd && {
          ...umdBaseOutput,
          entryFileNames: 'index.js'
        },
        minumd && {
          ...umdBaseOutput,
          entryFileNames: 'index.min.js',
          plugins: [
            _buildLazyReq.threadedTerser({
              terserOpts: {
                compress: {
                  drop_console: true,
                  ecma: 5,
                  keep_infinity: true,
                  typeofs: false
                },
                ecma: 5,
                ie8: true,
                mangle: {
                  safari10: true
                },
                output: {
                  comments: false,
                  ie8: true,
                  safari10: true
                },
                safari10: true,
                sourceMap: false
              }
            })
          ]
        }
      ].filter(Boolean),
      plugins: getBasePlugins('es5', {
        tsconfigOverride: {
          compilerOptions: {
            target: 'es5'
          }
        }
      })
    });
  }

  outConfig.sort((a, b) => a[BG] - b[BG]);
  {
    const castArray = v => {
      if (v) {
        return Array.isArray(v) ? v : [v];
      }

      return [];
    };
    const outputsToDist = v => v.dir === distDir;
    const firstDistGroup = outConfig.find(obj => castArray(obj.output).some(outputsToDist));
    const cpPlugin = require('@alorel/rollup-plugin-copy').copyPlugin({
      copy: [
        {
          from: 'LICENSE',
          opts: {glob: {cwd: __dirname}}
        },
        {
          from: 'README.md',
          opts: {glob: {cwd: __dirname}}
        },
        {
          from: 'autoinit-wasm-import.js',
          opts: {glob: {cwd: projectDir}}
        }
      ],
      defaultOpts: {
        emitNameKind: 'fileName'
      },
      watch
    });
    watch && firstDistGroup.plugins.push(cpPlugin);

    const firstDistOutput = castArray(firstDistGroup.output).find(outputsToDist);
    (firstDistOutput.plugins || (firstDistOutput.plugins = [])).push(...[
      require('@alorel/rollup-plugin-copy-pkg-json').copyPkgJsonPlugin({
        pkgJsonPath: join(projectDir, 'package.json')
      }),
      !watch && cpPlugin,
      dts && !watch && require('@alorel/rollup-plugin-dts').dtsPlugin({
        cliArgs: ['--rootDir', `projects/${project}`]
      })
    ].filter(Boolean));
  }

  return outConfig;
}

module.exports = function (inConfig) {
  const projects = inConfig.projects ?
    inConfig.projects.split(',') :
    require('./build/rollup/_syncPkg')._buildGetProjects();
  delete inConfig.projects;

  const out = projects.flatMap(project => createConfig({...inConfig, project}));

  for (const p of ['cjs5', 'projects', 'dts', 'fcjs5', 'cjs2015', 'fcjs2015', 'esm5', 'fesm5', 'esm2015', 'fesm2015', 'stdumd', 'minumd', 'tsconfig']) {
    delete inConfig[p];
  }

  return out;
};

Object.defineProperty(module.exports, '__esModule', {value: true});
module.exports.default = module.exports;
