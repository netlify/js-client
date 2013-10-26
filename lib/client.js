var base64 = require('base64-js');

var Client = function(options) {
  options = options || {};
  this.access_token  = options.access_token;
  this.client_id     = options.client_id;
  this.client_secret = options.client_secret;
  this.redirect_uri  = options.redirect_uri;
  this.XHR           = options.xhr      || Client.XMLHttpRequest;
  this.ENDPOINT      = options.endpoint || 'https://www.bitballoon.com';
  this.VERSION       = options.version  || 'v1';
};

Client.models = {
  Site: require("./site").Site
};

var stringToByteArray = function(str) {
  return Array.prototype.map.call(str, function (char) { return char.charCodeAt(0); });
};

Client.prototype = {
  isAuthorized: function() { return !(this.access_token == null); },

  authorizeFromCredentials: function(cb) {
    var client = this;

    if (!(this.client_id && this.client_secret)) {
      return cb("Instantiate the client with a client_id and client_secret to authorize from credentials");
    }
    
    this.request({
      type: "post",
      url: "/oauth/token",
      raw_path: true,
      contentType: "application/x-www-form-urlencoded",
      auth: {
        user: this.client_id,
        password: this.client_secret
      },
      body: "grant_type=client_credentials"
    }, function(err, data) {
      if (err) return cb(err);
      client.access_token = data.access_token;
      cb(null, data.access_token);
    });
  },
  
  authorizeFromCode: function(code, cb) {
    var client = this;
    
    if (!(this.client_id && this.client_secret && this.redirect_uri)) {
      return cb("Instantiate the client with a client_id, client_secret and redirect_uri to authorize from code");
    }
    
    this.request({
      type: "post",
      url: "/oath/token",
      raw_path: true,
      contentType: "application/x-www-form-urlencoded",
      auth: {
        user: this.client_id,
        password: this.client_secret
      },
      body: [
        "grant_type=authorization_code",
        "code=" + code,
        "redirect_uri=" + encodeURIComponent(this.redirect_uri)
      ].join("&")
    }, function(err, data) {
      if (err) return cb(err);
      client.access_token = data.access_token;
      cb(null, data.access_token);
    });
  },
  
  authorizeUrl: function(options) {
    if (!(this.client_id && this.redirect_uri)) {
      throw("Instantiate the client with a client_id and a redirect_uri to generate an authorizeUrl");
    }
    return this.ENDPOINT + "/oauth/authorize?" + [
      "response_type=code",
      "client_id=" + this.client_id,
      "redirect_uri=" + encodeURIComponent(this.redirect_uri)
    ].join("&");
  },

  sites: function(cb) {
    this.withAuthorization(cb, function() {
      this.request({
        url: "/sites"      
      }, function(err, collection, client) {
        if (err) return cb(err);
        cb(null, collection.map(function(data) { return new Client.models.Site(client, data); }));
      });
    });
  },

  site: function(id, cb) {
    this.withAuthorization(cb, function() {
      this.request({
        url: "/sites/" + id
      }, function(err, data, client) {
        if (err) return cb(err);
        cb(null, new Client.models.Site(client, data));
      });
    });
  },
  
  createSite: function(options, cb) {    
    this.withAuthorization(cb, function() {
      if (options.dir) {
        Client.models.Site.createFromDir(this, options.dir, cb);
      }
    });
  },

  request: function(options, cb) {
    var client = this,
        xhr    = new this.XHR,
        path   = options.raw_path ? options.url : "/api/" + this.VERSION + options.url;
        
    xhr.open(options.type || "get", this.ENDPOINT + path, true);
    if (options.headers) {
      for (var header in options.headers) {
        xhr.setRequestHeader(header, options.headers[header]);
      }
    }
    xhr.setRequestHeader("Content-Type", options.contentType || "application/json");
    if (options.auth) {
      xhr.setRequestHeader("Authorization", "Basic " + base64.fromByteArray(
        stringToByteArray(options.auth.user + ":" + options.auth.password)
      ));
    } else if (this.access_token) {
      xhr.setRequestHeader("Authorization", "Bearer " + this.access_token);
    }

    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        if (xhr.status >= 200 && xhr.status <= 300) {
          if (xhr.responseText) {
            var data = JSON.parse(xhr.responseText);
          }
          cb(null, data, client);
        } else {
          cb(xhr.responseText, null, client);
        }
      }
    }
    xhr.send(options.body);
  },
  
  withAuthorization: function(cb, fn) {
    if (!this.isAuthorized()) return cb("Not authorized: Instantiate client with access_token");
    fn.call(this);
  }
};

if (typeof(XMLHttpRequest) === 'undefined') {
  Client.XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
} else {
  Client.XMLHttpRequest = XMLHttpRequest;
}

exports.Client = Client;