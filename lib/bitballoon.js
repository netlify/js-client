var Client = require("./client").Client;

exports.createClient = function(options) {
  return new Client(options);
};

if (typeof(window) !== 'undefined') {
  window.bitballoon = exports;
}

