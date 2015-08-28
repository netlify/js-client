var model = require("./model");

if (typeof(require) !== 'undefined') {
  var fs = require("graceful-fs");
}

var Deploy = model.constructor();
Deploy.path = "/deploys";

Deploy.prototype = {
  isReady: function() {
    return this.state == "ready" || this.state == "current";
  },
  restore: function(cb) {
    var self = this;
    this.client.request({
      url: "/sites/" + this.site_id + "/deploys/" + this.id + "/restore",
      type: "post"
    }, function(err, data, client) {
      if (err) return cb(err);
      Deploy.call(self, client, data);
      cb(null, self);
    });
  },
  publish: function(cb) {
    this.restore(cb);
  },
  waitForReady: function(cb) {
    var self = this;

    if (this.isReady()) {
      process.nextTick(function() { cb(null, self); });
    } else {
      setTimeout(function() {
        self.refresh(function(err) {
          if (err) return cb(err);
          self.waitForReady(cb);
        });
      }, 1000);
    }
  },
  uploadFiles: function(files, cb) {
    if (this.state !== "uploading") return cb(null, this);
    if (files.length == 0) { return this.refresh(cb); }

    var self = this,
        cbCalled = false,
        uploaded = [];

    files.forEach(function(file) {
      fs.readFile(file.abs, function(err, data) {
        if (cbCalled) return null;
        if (err) { cbCalled = true; return cb(err); }
        var filePath = file.rel.split("/").map(function(segment) {
          return encodeURIComponent(segment);
        }).join("/");

        self.client.request({
          url: "/deploys/" + self.id + "/files/" + filePath,
          type: "put",
          body: data,
          contentType: "application/octet-stream",
          ignoreResponse: true
        }, function(err) {
          if (cbCalled) return null;
          if (err) { cbCalled = true; return cb(err); }
          uploaded.push(file);

          if (uploaded.length == files.length) {
            self.refresh(cb);
          }
        });
      });
    });
  }
};

exports.Deploy = Deploy;
