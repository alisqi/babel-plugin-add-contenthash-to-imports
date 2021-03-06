# Add content hash to imports Babel Plugin

This Babel plugin adds hashes to static and dynamic import module names for cache busting.

For example:
```javascript
import foo from './js/foo.js';

import('./bar.js').then(bar => bar());
```
is transformed into
```javascript
import foo from './js/foo.js?v=abcd1234';

import('./bar.js?v=1234abcd').then(bar => bar());
```

This is intended for use in multipage web applications (more on that later), so it only works with _relative_ module
names (e.g., `./foo.js` or `../bar/baz.js`) _with_ `.js` extension. Feel free to adjust to your needs, obviously.

The content hash is simply the first 8 characters of the file's md5.

## Why?
Now that browsers support `import` natively, web developers can use it _without_ transpilers or bundlers (like webpack).

This not only makes deploying code easier because less tooling is required. For multipage apps (MPAs), configuring
dozens (or even hundreds) of [entry points](https://webpack.js.org/concepts/entry-points/#multi-page-application)
with `splitChunks` is a nightmare.

There is one major downside of using imports natively however, namely caching.

### Mapping module name to URLs
Since module names for static imports must be, well, static, we can't change the URL that will be fetched.

In principe, we could improve dynamic imports with something like:
```javascript
const VERSION = '1.2.3-abc';     // global constant
function cacheBustImport (mod) {
    return import(`${mod}?v=${VERSION}`);   // e.g. foo.js?v=1.2.3-abc
}

cacheBustImport('./foo.js')
    .then(mod => console.log(mod));
```
But this is nasty. Also, since this breaks static code analysis, IDEs and build tools won't be able to analyze the imports.

### Caching
Since we can't add the build version or content hash to enable `Cache-Control: immutable`, we need to fall back to
`must-revalidate`.

If we author code with deep dependency trees, this will cause a huge number of _sequential_ requests. HTTP/2 helps
performance significantly, especially when combined with [modulepreload](https://developer.mozilla.org/en-US/docs/Web/HTML/Link_types/modulepreload).

Unfortunately, [browser support](https://caniuse.com/#search=modulepreload) for `modulepreload` is (currently) awful,
plus it does still require quite a bit of effort to make it work. 

## Solution: content hash in URL
The ideal solution is to add a content hash for each imported file. This is a very old trick, so I was very surprised
when I couldn't find any solution for `import`s (other than bundlers).

Luckily, writing plugins for Babel is a breeze (I myself have _no experience_ with compilers and wrote this in a few
hours!). 
