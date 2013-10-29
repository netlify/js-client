var model = require("./model");

var Deploy = model.constructor();
Deploy.path = "/deploys";

exports.Deploy = Deploy;