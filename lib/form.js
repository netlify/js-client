var model = require("./model"),
    Submission = require("./submission").Submission;;

var Form = model.constructor();
Form.path = "/forms";

Form.prototype = {
  submissions: function(cb) {
    this.client.collection(this.apiPath, Submission, cb);
  }
};

exports.Form = Form;