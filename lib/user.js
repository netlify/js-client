var model = require("./model"),
    Site  = require("./site").Site;

var User = model.constructor();
User.path = "/users";

User.prototype = {
  update: function(attributes, cb) {
    this.client.update({element: this, model: User, attributes: attributes}, cb);
  },
  destroy: function(cb) {
    this.client.destroy({element: this}, cb);
  },
  sites: function(options, cb) {
    this.client.collection({prefix: this.apiPath, model: Site}, options, cb);
  }
};

exports.User = User;