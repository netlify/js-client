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
      }).then(function(response) {
        obj.call(self, response.client, response.data);
        cb(null, self);
      }).catch(function(response) {
        cb(response.data);
      });
    }
  };
  return obj;
}
