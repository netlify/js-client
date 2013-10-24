if (typeof(require) !== 'undefined') {
  var bitballoon = require("../lib/bitballoon.js");
}

// Mock object for xhr requests
var XHR = function() {
  this.headers = {};
};

XHR.prototype = {
  open: function(method, url, async) {
    this.method = method;
    this.url = url;
    this.async = async;
  },
  
  setRequestHeader: function(header, value) {
    this.headers[header] = value;
  },
  
  send: function(data) {
    if (XHR.expectations) {
      XHR.expectations(this);
    }
    if (this.onreadystatechange) {
      this.readyState = XHR.readyState || 4;
      this.responseText = XHR.responseText || "";
      this.onreadystatechange();
    }
  }
}

  
describe("bitballoon", function() {
  beforeEach(function() {
    XHR.expectations = null;
    XHR.readyState = null;
    XHR.responseText = null;
  });
  
  it("should create a client", function() {
    var client = bitballoon.createClient({access_token: "1234"});
    expect(client.access_token).toEqual("1234");
  });
  
  it("should authenticate from credentials", function() {
    var access_token = null;

    XHR.expectations = function(xhr) {
      expect(xhr.headers['Content-Type']).toEqual("application/x-www-form-urlencoded");
      expect(xhr.headers['Authorization']).toEqual("Basic Y2xpZW50X2lkOmNsaWVudF9zZXJjcmV0");
      expect(xhr.method).toEqual("post");
    }
    
    XHR.readyState = 4;
    XHR.responseText = JSON.stringify({access_token: "1234"});

    runs(function() {
      bitballoon.tokenFromCrendentials({client_id: "client_id", client_secret: "client_sercret", xhr: XHR}, function(err, token) {
        access_token = token;
      });      
    });
    waitsFor(function() {
      return access_token;
    }, 100);
    
    runs(function() {
      expect(access_token).toEqual("1234");
    });    
  });
});