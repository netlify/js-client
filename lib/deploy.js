var model = require("./model");

var Deploy = model.constructor();
Deploy.path = "/deploys";

Deploy.prototype = {
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
  }
};

exports.Deploy = Deploy;