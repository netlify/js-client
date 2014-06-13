exports.constructor = function() {
  var obj = function(client, attributes) {
    for (var key in attributes) {
      this[key] = attributes[key]
    }

    this.client  = client;
    this.apiPath = obj.path + "/" + this.id;
  };
  return obj;
}
