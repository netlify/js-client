var Client = require("./client").Client;

exports.createClient = function(options) {
  return new Client(options);
};

exports.deploy = function(options, cb) {
  if (typeof options !== "object") {
    return cb("deploy needs an options object");
  }

  if (!options.access_token) {
    return cb("deploy needs an access_token");
  }

  if (!options.site_id) {
    return cb("deploy needs a site_id");
  }

  if (!(options.dir || options.zip)) {
    return cb("deploy needs a dir or a zip to deploy");
  }

  this.createClient({access_token: options.access_token}).site(options.site_id, function(err, site) {
    if (err) { return cb(err); }

    site.createDeploy({dir: options.dir, zip: options.zip}, function(err, deploy) {
      if (err) { return cb(err); }

      deploy.waitForReady(function(err, deploy) {
        return cb(err, deploy);
      });
    });
  });
};

exports.Client = Client;

if (typeof(window) !== 'undefined') {
  window.netlify = exports;
}
