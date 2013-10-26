var browserify = require('browserify');
var b = browserify();
b.add('./lib/bitballoon.js');
['xmlhttprequest', 'glob', 'crypto', 'path', 'fs'].forEach(function(lib) {
  b.ignore(lib);
})
b.bundle().pipe(process.stdout);