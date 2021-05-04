console.log('foo');

import('./fixture-output')
  .then(v => {
    console.debug('Got our module:', v);
  });

console.log('bar');
