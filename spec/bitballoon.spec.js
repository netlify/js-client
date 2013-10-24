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
      this.status = XHR.status || 200;
      this.onreadystatechange();
    }
  }
}

describe("bitballoon", function() {
  beforeEach(function() {
    XHR.expectations = null;
    XHR.readyState = null;
    XHR.responseText = null;
    XHR.status = null;
  });

  it("should create a client", function() {
    var client = bitballoon.createClient({access_token: "1234"});
    expect(client.access_token).toEqual("1234");
    expect(client.isAuthorized()).toEqual(true);
  });

  it("should authenticate from credentials", function() {
    var client = bitballoon.createClient({client_id: "client_id", client_secret: "client_secret", xhr: XHR});
    var access_token = null;    

    XHR.expectations = function(xhr) {
      expect(xhr.headers['Content-Type']).toEqual("application/x-www-form-urlencoded");
      expect(xhr.headers['Authorization']).toEqual("Basic Y2xpZW50X2lkOmNsaWVudF9zZWNyZXQ=");
      expect(xhr.method).toEqual("post");
    }

    XHR.responseText = JSON.stringify({access_token: "1234"});

    runs(function() {
      client.authorizeFromCredentials(function(err, token) {
        access_token = token;
      });
    });
    waitsFor(function() {
      return access_token;
    }, 100);

    runs(function() {
      expect(access_token).toEqual("1234");
      expect(client.isAuthorized()).toEqual(true);
    });    
  });

  it("should generate an authorize url", function() {
    var client = bitballoon.createClient({
      client_id: "client_id", 
      client_secret: "client_secret",
      redirect_uri: "http://www.example.com/callback"
    });
    var url = client.authorizeUrl();

    expect(url).toEqual("https://www.bitballoon.com/oauth/authorize?response_type=code&client_id=client_id&redirect_uri=http%3A%2F%2Fwww.example.com%2Fcallback")
  });

  it("should authorize from authorization code", function() {
    var client = bitballoon.createClient({
      client_id: "client_id", 
      client_secret: "client_secret",
      redirect_uri: "http://www.example.com/callback",
      xhr: XHR
    });
    var access_token = null;

    XHR.expectations = function(xhr) {
      expect(xhr.headers['Content-Type']).toEqual("application/x-www-form-urlencoded");
      expect(xhr.headers['Authorization']).toEqual("Basic Y2xpZW50X2lkOmNsaWVudF9zZWNyZXQ=");
      expect(xhr.method).toEqual("post");
    }

    XHR.responseText = JSON.stringify({access_token: "1234"});

    runs(function() {
      client.authorizeFromCode("my-code", function(err, token) {
        access_token = token;
      });
    });

    waitsFor(function() {
      return access_token;
    }, 100);

    runs(function() {
      expect(access_token).toEqual("1234");
      expect(client.isAuthorized()).toEqual(true);
    });    
  });

  it("should give a list of sites", function() {
    var client = bitballoon.createClient({access_token: "1234", xhr: XHR}),
        sites  = [];

    XHR.expectations = function(xhr) {
      expect(xhr.headers['Authorization']).toEqual("Bearer 1234");
      expect(xhr.method).toEqual("get");
      expect(xhr.url).toEqual("https://www.bitballoon.com/api/v1/sites");
    }

    XHR.responseText = JSON.stringify([{id: 1}, {id: 2}, {id: 3}, {id: 4}]);

    runs(function() {
      client.sites(function(err, data) {
        expect(err).toEqual(null);
        sites = data;
      });
    });

    waitsFor(function() {
      return sites.length;
    }, 100);

    runs(function() {
      expect(sites.map(function(s) { return s.id; })).toEqual([1,2,3,4]);
    });
  });
});