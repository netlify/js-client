var browserify = require('browserify');
var b = browserify();
b.add('./lib/bitballoon.js');
b.ignore('xmlhttprequest');
b.bundle().pipe(process.stdout);