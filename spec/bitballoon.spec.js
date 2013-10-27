if (typeof(require) !== 'undefined') {
  var bitballoon  = require("../lib/bitballoon.js"),
      crypto      = require("crypto"),
      fs          = require("fs");
}

// Mock object for xhr requests
var XHR = function() {
  this.headers = {};
};

var firstIfArray = function(obj) {
  return Array.isArray(obj) ? obj.shift() : obj;
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
      var fn = firstIfArray(XHR.expectations);
      fn(this);
    }
    if (this.onreadystatechange) {
      this.readyState = firstIfArray(XHR.readyState) || 4;
      this.responseText = firstIfArray(XHR.responseText) || "";
      this.status = firstIfArray(XHR.status) || 200;
      this.onreadystatechange();
    }
  }
}

describe("bitballoon", function() {
  var testApiCall = function(options) {
    var xhr = Array.isArray(options.xhr) ? options.xhr : [options.xhr];
    
    xhr.forEach(function(xhr) {
      XHR.expectations = XHR.expectations || [];
      XHR.expectations.push(xhr.expectations);
      XHR.status = XHR.status || [];
      XHR.status.push(xhr.status);
      XHR.responseText = XHR.responseText || [];
      XHR.responseText.push(JSON.stringify(xhr.response));
    });

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
  
  it("should get a single site", function() {
    var client = bitballoon.createClient({access_token: "1234", xhr: XHR}),
        site   = null;

    testApiCall({
      xhr: {
        expectations: function(xhr) {
          expect(xhr.headers['Authorization']).toEqual("Bearer 1234");
          expect(xhr.method).toEqual("get");
          expect(xhr.url).toEqual("https://www.bitballoon.com/api/v1/sites/123");          
        },
        response: {id: "123"}
      },
      apiCall: function() { client.site("123", function(err, data) { site = data; }); },
      waitsFor: function() { return site; },
      expectations: function() {
        expect(site.id).toEqual("123");
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
  
  it("should update a site", function() {
    var client = bitballoon.createClient({access_token: "1234", xhr: XHR}),
        site   = new bitballoon.Client.models.Site(client, {id: "123", name: "test"});

    testApiCall({
      xhr: {
        expectations: function(xhr) {
          expect(xhr.headers['Authorization']).toEqual("Bearer 1234");
          expect(xhr.method).toEqual("put");
          expect(xhr.url).toEqual("https://www.bitballoon.com/api/v1/sites/123");
        },
        response: {id: 123, name: "changed"}
      },
      apiCall: function() { site.update({name: "changed"}, function(err, s) {
        site = s;
      })},
      waitsFor: function() { return site.name == "changed" },
      expectations: function() {
        expect(site.name).toEqual("changed");
      }
    });
  });
  
  it("should destroy a site", function() {
    var client = bitballoon.createClient({access_token: "1234", xhr: XHR}),
        site   = new bitballoon.Client.models.Site(client, {id: "123", name: "test"}),
        done   = false;

    testApiCall({
      xhr: {
        expectations: function(xhr) {
          expect(xhr.headers['Authorization']).toEqual("Bearer 1234");
          expect(xhr.method).toEqual("delete");
          expect(xhr.url).toEqual("https://www.bitballoon.com/api/v1/sites/123");
        },
        response: ""
      },
      apiCall: function() { site.destroy(function(err, s) {
        if (err) return;
        done = true;
      })},
      waitsFor: function() { return done },
      expectations: function() {
        expect(done).toEqual(true);
      }
    });
  });
  
  it("should list all forms", function() {
    var client = bitballoon.createClient({access_token: "1234", xhr: XHR}),
        forms = null;
    
    testApiCall({
      xhr: {
        expectations: function(xhr) {
          expect(xhr.method).toEqual("get");
          expect(xhr.url).toEqual("https://www.bitballoon.com/api/v1/forms");
        },
        response: [{id: 1, name: "Form 1"}, {id: 2, name: "Form 2"}]
      },
      apiCall: function() { client.forms(function(err, result) { forms = result; }); },
      waitsFor: function() { return forms; },
      expectations: function() {
        expect(forms.map(function(f) { return f.name; })).toEqual(["Form 1", "Form 2"]);
      }
    });
  });
  
  it("should list forms for a site", function() {
    var client = bitballoon.createClient({access_token: "1234", xhr: XHR}),
        site   = new bitballoon.Client.models.Site(client, {id: "123", name: "test"}),
        forms  = null;
    
    testApiCall({
      xhr: {
        expectations: function(xhr) {
          expect(xhr.method).toEqual("get");
          expect(xhr.url).toEqual("https://www.bitballoon.com/api/v1/sites/123/forms");
        },
        response: [{id: 1, name: "Form 1"}, {id: 2, name: "Form 2"}]
      },
      apiCall: function() { site.forms(function(err, result) { forms = result; })},
      waitsFor: function() { return forms; },
      expectations: function() {
        expect(forms.map(function(f) { return f.name })).toEqual(["Form 1", "Form 2"]);
      }
    });
  })
  
  
  // Node specific methods
  if (typeof(window) === "undefined") {
    var crypto = require('crypto'),
        fs     = require('fs');
    
    it("should upload a site from a dir", function() {
      var client = bitballoon.createClient({access_token: "1234", xhr: XHR}),
          site   = null,
          shasum = crypto.createHash('sha1');
          
      shasum.update(fs.readFileSync(__dirname + '/files/site-dir/index.html'));

      var index_sha = shasum.digest('hex');

      testApiCall({
        xhr: [
          {
            expectations: function(xhr) {
              expect(xhr.headers['Authorization']).toEqual("Bearer 1234");
              expect(xhr.method).toEqual("post");
              expect(xhr.url).toEqual("https://www.bitballoon.com/api/v1/sites"); 
            },
            status: 201,
            response: {id: 123, state: "uploading", required: [index_sha]}
          },
          {
            expectations: function(xhr) {
              expect(xhr.headers['Authorization']).toEqual("Bearer 1234");
              expect(xhr.method).toEqual("put");
              expect(xhr.url).toEqual("https://www.bitballoon.com/api/v1/sites/123/files/index.html");
            },
            status: 201,
            response: "Hello, World"
          },
          {
            expectations: function(xhr) {
              expect(xhr.headers['Authorization']).toEqual("Bearer 1234");
              expect(xhr.method).toEqual("get");
              expect(xhr.url).toEqual("https://www.bitballoon.com/api/v1/sites/123");                      
            },
            response: {id: 123, state: "processing"}
          }
        ],
        apiCall: function() { client.createSite({dir: "spec/files/site-dir"}, function(err, s) {
          site = s;
        })},
        waitsFor: function() { return site; },
        expectations: function() {
          expect(site.state).toEqual("processing");
        }
      });
    });
    
    it("should upload a site from a zip", function() {
      var client = bitballoon.createClient({access_token: "1234", xhr: XHR}),
          site   = null;
      
      testApiCall({
        xhr: {
          expectations: function(xhr) {
            expect(xhr.headers['Authorization']).toEqual("Bearer 1234");
            expect(xhr.method).toEqual("post");
            expect(xhr.url).toEqual("https://www.bitballoon.com/api/v1/sites");
          },
          status: 201,
          response: {id: 123, state: "processing", required: []}
        },
        apiCall: function() { client.createSite({zip: "spec/files/site-dir.zip"}, function(err, s) {
          site = s;
        })},
        waitsFor: function() { return site; },
        expectations: function() {
          expect(site.state).toEqual("processing");
        }
      })
    });
  }
});