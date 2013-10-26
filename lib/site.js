if (typeof(require) !== 'undefined') {
  var glob   = require("glob"),
      path   = require("path"),
      crypto = require("crypto"),
      fs     = require("fs");
}

var Site = function(client, attributes) {
  for (var key in attributes) {
    this[key] = attributes[key]
  }

  this.client = client;
};

var withFiles = function(dir, cb) {
    glob("**/*", {cwd: dir}, function(err, files) {
    if (err) return cb(err);

    cb(null, files.filter(function(file) {
      return file.match(/(\/__MACOSX|\/\.)/) ? false : true;
    }).map(function(file) { return {rel: file, abs: path.resolve(dir, file)}; }));
  });
};

var withShas = function(files, cb) {
  var shas = {};
  files.forEach(function(file) {
    fs.readFile(file.abs, function(err, data) {
      if (err) return cb(err);
      var shasum = crypto.createHash('sha1');
      shasum.update(data);
      shas[file.rel] = shasum.digest('hex');
      if (Object.keys(shas).length == files.length) {
        cb(null, shas);
      }
    });
  });
};

Site.createFromDir = function(client, dir, cb) {
  var self = this,
      fullDir = dir.match(/^\//) ? dir : process.cwd() + "/" + dir;

  withFiles(fullDir, function(err, files) {
    withShas(files, function(err, filesWithShas) {
      client.request({
        url: "/sites",
        type: "post",
        body: JSON.stringify({
          files: filesWithShas
        })
      }, function(err, data) {
        var site = new Site(client, data);
        site.uploadDir(fullDir, function(err, site) {
          cb(err, site);
        });
      });
    });
  });
};

Site.prototype = {
  isReady: function() {
    return this.state == "current";
  },
  refresh: function(cb) {
    var self = this;
    this.client.request({
      url: "/sites/" + this.id
    }, function(err, data, client) {
      if (err) return cb(err);
      Site.call(self, client, data);
      cb(null, self);
    });
  },
  uploadDir: function(dir, cb) {
    if (this.state !== "uploading") return cb(null, this);

    var self = this;

    withFiles(dir, function(err, files) {
      var uploaded = [];
      files.forEach(function(file) {
        fs.readFile(file.abs, function(err, data) {
          if (err) return cb(err);
        
          self.client.request({
            url: "/sites/" + self.id + "/files/" + file.rel,
            type: "put",
            body: data
          }, function(err, response) {
            if (err) return cb(err);
            uploaded.push(file);
          
            if (uploaded.length == files.length) {
              self.refresh(cb);
            }
          });
        });
      });
    });
  }
};

exports.Site = Site;