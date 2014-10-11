exports.constructor = function() {
  var obj = function(client, attributes) {
    for (var key in attributes) {
      this[key] = attributes[key]
    }

    this.client  = client;
    this.apiPath = obj.path + "/" + this.id;
    this.refresh = function(cb) {
      var self = this;
      this.client.request({
        url: this.apiPath
      }, function(err, data, client) {
        if (err) return cb(err);
        obj.call(self, client, data);
        cb(null, self);
      });
    }
  };
  return obj;
}
