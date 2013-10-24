var Client = require("./client").Client;

exports.createClient = function(options) {
  return new Client(options);
};

exports.Client = Client;

if (typeof(window) !== 'undefined') {
  window.bitballoon = exports;
}

