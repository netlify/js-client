var model = require("./model");

var Snippet = model.constructor();
Snippet.path = "/snippets";

Snippet.prototype = {
  update: function(attributes, cb) {
    this.client.update({prefix: "/sites/" + this.site_id, model: Snippet, element: this, attributes: attributes}, cb);
  },
  destroy: function(cb) {
    this.client.destroy({prefix: "/sites/" + this.site_id, model: Snippet, element: this}, cb);
  }
}

exports.Snippet = Snippet;