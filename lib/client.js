var base64 = require('base64-js'),
    http   = require('http'),
    https  = require('https');

var Client = function(options) {
  options = options || {};
  this.access_token  = options.access_token;
  this.client_id     = options.client_id;
  this.client_secret = options.client_secret;
  this.redirect_uri  = options.redirect_uri;
  this.ENDPOINT      = options.endpoint || 'https://www.bitballoon.com';
  this.VERSION       = options.version  || 'v1';
  this.hostname = this.ENDPOINT.match(/^https?:\/\/([^:]+)/)[1];
  this.ssl = this.ENDPOINT.match(/^https:\/\//)
  this.port = this.ssl ? 443 : (this.ENDPOINT.match(/:(\d+)$/) || [])[1] || 80;
  this.http = options.http || (this.ssl ? https : http);
};

Client.models = {
  Site: require("./site").Site,
  Form: require("./form").Form,
  Submission: require("./submission").Submission,
  User: require("./user").User,
  Snippet: require("./snippet").Snippet,
  Deploy: require("./deploy").Deploy,
  DnsZone: require("./dns-zone").DnsZone,
  AccessToken: require("./access-token").AccessToken
};

var stringToByteArray = function(str) {
  return Array.prototype.map.call(str, function (char) { return char.charCodeAt(0); });
};

var prepareBody = function(body, headers) {
  return typeof(body) == "string" ? body : (headers['Content-Type'] == "application/json" ? JSON.stringify(body) : body);
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

  sites: function(options, cb) { this.collection({model: Client.models.Site}, options, cb); },

  site: function(id, cb) { this.element({model: Client.models.Site, id: id}, cb); },

  createSite: function(options, cb) {
    this.withAuthorization(cb, function() {
      if (options.dir) {
        Client.models.Site.createFromDir(this, options.dir, cb);
      } else if (options.zip) {
        Client.models.Site.createFromZip(this, options.zip, cb);
      } else {
        Client.models.Site.create(this, options, cb);
      }
    });
  },

  forms: function(cb) { this.collection({model: Client.models.Form}, cb); },

  form: function(id, cb) { this.element({model: Client.models.Form, id: id}, cb); },

  submissions: function(options, cb) { this.collection({model: Client.models.Submission}, options, cb); },

  submission: function(id, cb) { this.element({model: Client.models.Submission, id: id}, cb); },

  users: function(options, cb) { this.collection({model: Client.models.User}, options, cb); },

  user: function(id, cb) { this.element({model: Client.models.User, id: id}, cb); },

  createUser: function(attributes, cb) {
    this.create({model: Client.models.User, attributes: attributes}, cb);
  },

  dnsZones: function(options, cb) { this.collection({model: Client.models.DnsZone}, options, cb); },

  dnsZone: function(id, cb) { this.element({model: Client.models.DnsZone, id: id}, cb); },

  createDnsZone: function(attributes, cb) {
    this.create({model: Client.models.DnsZone, attributes: attributes}, cb);
  },

  accessToken: function(id, cb) { this.element({model: Client.models.AccessToken, id: id}, cb); },

  createAccessToken: function(attributes, cb) {
    this.create({model: Client.models.AccessToken, attributes: attributes}, cb);
  },

  collection: function(options, pagination, cb) {
    if (cb === undefined) { cb = pagination; pagination = {}}
    var params = [];
    if (pagination.page) { params.push(["page", pagination.page].join("=")) }
    if (pagination.per_page) { params.push(["per_page", pagination.per_page].join("=")) }
    this.withAuthorization(cb, function() {
      this.request({
        url: (options.prefix || "") + options.model.path + (params.length ? "?" + params.join("&") : "")
      }, function(err, collection, client) {
        if (err) return cb(err);
        cb(null, collection.map(function(data) { return new options.model(client, data); }));
      })
    });
  },

  element: function(options, cb) {
    this.withAuthorization(cb, function() {
      this.request({
        url: (options.prefix || "" ) + options.model.path + "/" + options.id
      }, function(err, data, client) {
        if (err) return cb(err);
        cb(null, new options.model(client, data));
      });
    });
  },

  create: function(options, cb) {
    this.withAuthorization(cb, function() {
      this.request({
        url: (options.prefix || "") + options.model.path,
        type: "post",
        body: options.attributes
      }, function(err, data, client) {
        if (err) return cb(err);
        cb(null, new options.model(client, data));
      });
    });
  },

  update: function(options, cb) {
    this.withAuthorization(cb, function() {
      this.request({
        url: (options.prefix || "") + options.element.apiPath,
        type: "put",
        body: options.attributes
      }, function(err, data, client) {
        if (err) return cb(err);
        options.model.call(options.element, client, data);
        cb(null, options.element);
      });
    });
  },

  destroy: function(options, cb) {
    this.withAuthorization(cb, function() {
      this.request({
        url: (options.prefix || "") + options.element.apiPath,
        type: "delete",
        ignoreResponse: true
      }, function(err) {
        return cb(err);
      });
    });
  },

  request: function(options, cb) {
    var client  = this,
        http    = this.http,
        path    = options.raw_path ? options.url : "/api/" + this.VERSION + options.url,
        headers = options.headers || {},
        retries = options.retries ? options.retries : options.retries === 0 ? 0 : 3,
        body    = null;

    headers['Content-Type'] = options.contentType || "application/json";

    if (options.body) {
      body = prepareBody(options.body, headers);
    }

    headers['Content-Length'] = body ? body.length : 0;

    if (this.access_token && !options.auth) {
      headers['Authorization'] = "Bearer " + this.access_token
    }

    var requestOptions = {
      method: (options.type || "get").toLowerCase(),
      hostname: this.hostname,
      path: path,
      port: this.port,
      headers: headers,
      auth: options.auth ? options.auth.user + ":" + options.auth.password : null,
    }

    var request = http.request(requestOptions, function(res) {
      var body = "",
          data = null;

      res.on("data", function(chunk) {
        body += chunk;
      });
      res.on("end", function() {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (body && !options.ignoreResponse) {
            data = JSON.parse(body);
          }
          cb(null, data, client);
        } else if (res.statusCode == 401 || res.statusCode == 403) {
          cb("Authentication failed", null, client);
        } else {
          if ((requestOptions.method === "get" ||
               requestOptions.method === "put" ||
               requestOptions.method === "delete") &&
              (retries > 0 && res.statusCode !== 422 && res.statusCode !== 404)) {
            options.retries = retries - 1;
            setTimeout(function() { client.request(options, cb); }, 500);
          } else {
            cb(body, null, client);
          }
        }
      });
    });

    request.on("error", function(err) {
      if ((requestOptions.method == "get" ||
           requestOptions.method == "put" ||
           requestOptions.method == "delete") &&
           retries > 0) {
        options.retries = retries - 1;
        setTimeout(function() { client.request(options, cb); }, 500);
      } else {
        cb(err, null, client);
      }
    });

    if (body) {
      request.write(body);
    }
    request.end();
  },

  withAuthorization: function(cb, fn) {
    if (!this.isAuthorized()) return cb("Not authorized: Instantiate client with access_token");
    fn.call(this);
  }
};

exports.Client = Client;
