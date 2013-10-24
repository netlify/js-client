if (typeof(require) !== 'undefined') {
  var bitballoon  = require("../lib/bitballoon.js");
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
  var testApiCall = function(options) {
    XHR.expectations = options.xhr.expectations;

    XHR.responseText = JSON.stringify(options.xhr.response);

    runs(options.apiCall);
    waitsFor(options.waitsFor, 100);
    runs(options.expectations);
  };
  
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
    
    testApiCall({
      xhr: {
        expectations: function(xhr) {
          expect(xhr.headers['Content-Type']).toEqual("application/x-www-form-urlencoded");
          expect(xhr.headers['Authorization']).toEqual("Basic Y2xpZW50X2lkOmNsaWVudF9zZWNyZXQ=");
          expect(xhr.method).toEqual("post");          
        },
        response: {access_token: "1234"}
      },
      apiCall: function() {
        client.authorizeFromCredentials(function(err, token) {
          access_token = token;
        });
      },
      waitsFor: function() { return access_token; },
      expectations: function() {
        expect(access_token).toEqual("1234");
        expect(client.isAuthorized()).toEqual(true);
      }
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
    
    testApiCall({
      xhr: {
        expectations: function(xhr) {
          expect(xhr.headers['Content-Type']).toEqual("application/x-www-form-urlencoded");
          expect(xhr.headers['Authorization']).toEqual("Basic Y2xpZW50X2lkOmNsaWVudF9zZWNyZXQ=");
          expect(xhr.method).toEqual("post");
        },
        response: {access_token: "1234"}
      },
      apiCall: function() {
        client.authorizeFromCode("my-code", function(err, token) {
          access_token = token;
        });
      },
      waitsFor: function() { return access_token },
      expectations: function() {
        expect(access_token).toEqual("1234");
        expect(client.isAuthorized()).toEqual(true);
      }
    });
  });

  it("should give a list of sites", function() {
    var client = bitballoon.createClient({access_token: "1234", xhr: XHR}),
        sites  = [];
    
    testApiCall({
      xhr: {
        expectations: function(xhr) {
          expect(xhr.headers['Authorization']).toEqual("Bearer 1234");
          expect(xhr.method).toEqual("get");
          expect(xhr.url).toEqual("https://www.bitballoon.com/api/v1/sites");
        },
        response: [{id: 1}, {id: 2}, {id: 3}, {id: 4}]
      },
      apiCall: function() { client.sites(function(err, data) { sites = data; }); },
      waitsFor: function() { return sites.length; },
      expectations: function() {
        expect(sites.map(function(s) { return s.id; })).toEqual([1,2,3,4]);
      }
    });
  });
  
  it("should get a simple site", function() {
    var client = bitballoon.createClient({access_token: "1234", xhr: XHR}),
        site   = null;

    testApiCall({
      xhr: {
        expectations: function(xhr) {
          expect(xhr.headers['Authorization']).toEqual("Bearer 1234");
          expect(xhr.method).toEqual("get");
          expect(xhr.url).toEqual("https://www.bitballoon.com/api/v1/sites/123");          
        },
        response: {id: 123}
      },
      apiCall: function() { client.site(123, function(err, data) { site = data; }); },
      waitsFor: function() { return site; },
      expectations: function() {
        expect(site.id).toEqual(123);
      }
    });
  });
  
  it("should refresh the state of a site", function() {
    var client = bitballoon.createClient({access_token: "1234", xhr: XHR}),
        site   = new bitballoon.Client.models.Site(client, {id: "123", state: "processing"});
    
    testApiCall({
      xhr: {
        expectations: function(xhr) {
          expect(xhr.headers['Authorization']).toEqual("Bearer 1234");
          expect(xhr.method).toEqual("get");
          expect(xhr.url).toEqual("https://www.bitballoon.com/api/v1/sites/123");          
        },
        response: {id: 123, state: "current"}
      },
      apiCall: function() { site.refresh(function(err, site) { }); },
      waitsFor: function() { return site.isReady(); },
      expectations: function() {
        expect(site.state).toEqual("current");
      }
    });
  });
});