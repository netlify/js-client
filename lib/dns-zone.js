var model = require("./model"),
    DnsRecord = require("./dns-record").DnsRecord;

var DnsZone = model.constructor();
DnsZone.path = "/dns_zones";

DnsZone.prototype = {
  destroy: function(cb) {
    this.client.destroy({element: this}, cb);
  },
  records: function(options, cb) {
    this.client.collection({prefix: this.apiPath, model: DnsRecord}, options, cb);
  },
  record: function(id, cb) {
    this.client.element({prefix: this.apiPath, model: DnsRecord, id: id}, cb);
  },
  createRecord: function(attributes, cb) {
    this.client.create({prefix: this.apiPath, model: DnsRecord, attributes: attributes}, cb);
  }  
};

exports.DnsZone = DnsZone;