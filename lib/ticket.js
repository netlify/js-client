var model = require("./model");

var Ticket = model.constructor();
Ticket.path = "/oauth/tickets";

Ticket.prototype = {
  exchange: function(cb) {
    this.client.request({
      url: this.apiPath + "/exchange",
      type: "post"
    }, function(err, data, client) {
      if (err) { return cb(err) }
      client.access_token = data.access_token
      cb(null, data);
    });
  }
}

exports.Ticket = Ticket;
