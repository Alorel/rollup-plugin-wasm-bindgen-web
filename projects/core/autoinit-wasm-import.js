export default function autoinitWasmImport(imp, url) {
  return Promise
    .all([
      imp,
      fetch(url)
    ])
    .then(function wasmImportInitialiser([wasmModule, response]) {
      return wasmModule.default(response)
        .then(() => wasmModule);
    });
}
