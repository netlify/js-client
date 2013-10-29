var model = require("./model");

var User = model.constructor();
User.path = "/users";

User.prototype = {
  update: function(attributes, cb) {
    this.client.update({element: this, model: User, attributes: attributes}, cb);
  },
  destroy: function(cb) {
    this.client.destroy({element: this}, cb);
  }
};

exports.User = User;