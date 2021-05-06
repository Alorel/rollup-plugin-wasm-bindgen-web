function createGetter(initResponse) {
  const getter = {};
  Object.defineProperty(getter, '__getWasm', {
    value: function __getWasm() {
      return initResponse;
    }
  });

  return getter;
}

/**
 * @param {Promise<any>} imp - The dynamic import
 * @param {string} url - The wasm file's URL
 * @param {boolean} exposeWasm - Whether to expose the init function's response or not
 */
export default async function autoinitWasmImport(imp, url, exposeWasm) {
  const [wasmModule, fetchResponse] = await Promise.all([imp, fetch(url)]);
  const initResponse = await wasmModule.default(fetchResponse);

  return exposeWasm ?
    Object.assign(createGetter(initResponse), wasmModule) :
    wasmModule;
}
