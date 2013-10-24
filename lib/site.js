var Site = function(client, attributes) {
  for (var key in attributes) {
    this[key] = attributes[key]
  }

  this.client = client;
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
  }
};

exports.Site = Site;