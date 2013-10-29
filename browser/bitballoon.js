;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Client = require("./client").Client;

exports.createClient = function(options) {
  return new Client(options);
};

exports.Client = Client;

if (typeof(window) !== 'undefined') {
  window.bitballoon = exports;
}


},{"./client":2}],2:[function(require,module,exports){
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
  Site: require("./site").Site,
  Form: require("./form").Form,
  Submission: require("./submission").Submission,
  User: require("./user").User,
  Snippet: require("./snippet").Snippet,
  Deploy: require("./deploy").Deploy
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

  sites: function(options, cb) { this.collection({model: Client.models.Site}, options, cb); },

  site: function(id, cb) { this.element({model: Client.models.Site, id: id}, cb); },
  
  createSite: function(options, cb) {    
    this.withAuthorization(cb, function() {
      if (options.dir) {
        Client.models.Site.createFromDir(this, options.dir, cb);
      } else if (options.zip) {
        Client.models.Site.createFromZip(this, options.zip, cb);
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
      var data;
      if (xhr.readyState == 4) {
        if (xhr.status >= 200 && xhr.status <= 300) {
          if (xhr.responseText) {
            if (!options.ignoreResponse) {
              data = JSON.parse(xhr.responseText);
            }
          }
          cb(null, data, client);
        } else {
          if (xhr.status == 401) {
            cb("Authentication failed", null, client);
          } else {
            cb(xhr.responseText, null, client);
          }
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
},{"./deploy":3,"./form":5,"./site":7,"./snippet":8,"./submission":9,"./user":10,"base64-js":11,"xmlhttprequest":12}],3:[function(require,module,exports){
var model = require("./model");

var Deploy = model.constructor();
Deploy.path = "/deploys";

Deploy.prototype = {
  restore: function(cb) {
    var self = this;
    this.client.request({
      url: "/sites/" + this.site_id + "/deploys/" + this.id + "/restore",
      type: "post"
    }, function(err, data, client) {
      if (err) return cb(err);
      Deploy.call(self, client, data);
      cb(null, self);
    });
  }
};

exports.Deploy = Deploy;
},{"./model":6}],4:[function(require,module,exports){
var model = require("./model");

var File = model.constructor();
File.path = "/files";

exports.File = File;
},{"./model":6}],5:[function(require,module,exports){
var model = require("./model"),
    Submission = require("./submission").Submission;;

var Form = model.constructor();
Form.path = "/forms";

Form.prototype = {
  submissions: function(cb) {
    this.client.collection({prefix: this.apiPath, model: Submission}, cb);
  }
};

exports.Form = Form;
},{"./model":6,"./submission":9}],6:[function(require,module,exports){
exports.constructor = function() {
  var obj = function(client, attributes) {
    for (var key in attributes) {
      this[key] = attributes[key]
    }

    this.client  = client;
    this.apiPath = obj.path + "/" + this.id;
  };
  return obj;
}
},{}],7:[function(require,module,exports){
var process=require("__browserify_process");var model = require("./model"),
    Form  = require("./form").Form,
    Submission = require("./submission").Submission,
    File = require("./file").File,
    Snippet = require("./snippet").Snippet,
    Deploy = require("./deploy").Deploy;

if (typeof(require) !== 'undefined') {
  var glob   = require("glob"),
      path   = require("path"),
      crypto = require("crypto"),
      fs     = require("fs");
}

var Site = model.constructor();
Site.path = "/sites";

var globFiles = function(dir, cb) {
  glob("**/*", {cwd: dir}, function(err, files) {
    if (err) return cb(err);

    var filtered = files.filter(function(file) {
      return file.match(/(\/__MACOSX|\/\.)/) ? false : true;
    }).map(function(file) { return {rel: file, abs: path.resolve(dir, file)}; });

    filterFiles(filtered, cb);
  });
};

var filterFiles = function(filesAndDirs, cb) {
  var processed = [],
      files     = [],
      cbCalled  = false;
  filesAndDirs.forEach(function(fileOrDir) {
    fs.lstat(fileOrDir.abs, function(err, stat) {
      if (cbCalled) return null;
      if (err) { cbCalled = true; return cb(err); }
      if (stat.isFile()) {
        files.push(fileOrDir);
      }
      processed.push(fileOrDir);
      if (processed.length == filesAndDirs.length) {
        cb(null, files);
      }
    });
  });
};

var calculateShas = function(files, cb) {
  var shas = {},
      cbCalled = false,
      processed = [];

  files.forEach(function(file) {
    fs.readFile(file.abs, function(err, data) {
      if (cbCalled) return null;
      if (err) { cbCalled = true; return cb(err); }

      var shasum = crypto.createHash('sha1');
      shasum.update(data);
      shas[file.rel] = shasum.digest('hex');
      processed.push(file);
      if (processed.length == files.length) {
        cb(null, shas);
      }
    });
  });
};

var createFromDir = function(client, dir, siteId, cb) {
  var fullDir = dir.match(/^\//) ? dir : process.cwd() + "/" + dir;

  globFiles(fullDir, function(err, files) {
    calculateShas(files, function(err, filesWithShas) {
      client.request({
        url: "/sites" + (siteId ? "/" + siteId : ""),
        type: siteId ? "put" : "post",
        body: JSON.stringify({
          files: filesWithShas
        })
      }, function(err, data) {
        if (err) return cb(err);
        var site = new Site(client, data);
        var shas = {};
        data.required.forEach(function(sha) { shas[sha] = true; });
        var filtered = files.filter(function(file) { return shas[filesWithShas[file.rel]]; });
        site.uploadFiles(filtered, function(err, site) {
          cb(err, site);
        });
      });
    });
  });
};

var createFromZip = function(client, zip, siteId, cb) {
  var fullPath = zip.match(/^\//) ? zip : process.cwd() + "/" + zip;
  
  fs.readFile(fullPath, function(err, zipData) {
    if (err) return cb(err);
    
    client.request({
      url: "/sites" + (siteId ? "/" + siteId : ""),
      type: siteId ? "put" : "post",
      body: zipData,
      contentType: "application/zip"
    }, function(err, data) {
      if (err) return cb(err);
      
      return cb(null, new Site(client, data));
    });
  });
};

var attributesForUpdate = function(attributes) {
  var mapping = {
        name: "name",
        customDomain: "custom_domain",
        notificationEmail: "notification_email",
        password: "password"
      },
      result = {};
  
  for (var key in attributes) {
    if (mapping[key]) result[mapping[key]] = attributes[key];
  }
  
  return result;
};

Site.createFromDir = function(client, dir, cb) {
  createFromDir(client, dir, null, cb);
};

Site.createFromZip = function(client, zip, cb) {
  createFromZip(client, zip, null, cb);
};

Site.prototype = {
  isReady: function() {
    return this.state == "current";
  },
  refresh: function(cb) {
    var self = this;
    this.client.request({
      url: "/sites/" + this.id
    }, function(err, data, client) {
      if (err) return cb(err);
      Site.call(self, client, data);
      cb(null, self);
    });
  },

  update: function(attributes, cb) {
    attributes = attributes || {};

    var self = this;
    
    if (attributes.dir) {
      createFromDir(this.client, attributes.dir, this.id, cb);
    } else if (attributes.zip) {
      createFromZip(this.client, attributes.zip, this.id, cb);
    } else {
      this.client.update({model: Site, element: this, attributes: attributesForUpdate(attributes)}, cb);
    }
  },
  
  destroy: function(cb) {
    this.client.destroy({element: this}, cb);
  },
  
  waitForReady: function(cb) {
    var self = this;

    if (this.isReady()) {
      process.nextTick(function() { cb(null, self); });
    } else {
      setTimeout(function() { self.waitForReady(cb); }, 1000);
    }
  },
  
  forms: function(options, cb) {
    this.client.collection({prefix: this.apiPath, model: Form}, options, cb);
  },
  
  submissions: function(options, cb) {
    this.client.collection({prefix: this.apiPath, model: Submission}, options, cb);
  },
  
  files: function(cb) {
    this.client.collection({prefix: this.apiPath, model: File}, cb);
  },
  
  file: function(path, cb) {
    this.client.element({prefix: this.apiPath, model: File, id: path}, cb);
  },
  
  snippets: function(cb) {
    this.client.collection({prefix: this.apiPath, model: Snippet}, cb);
  },
  
  snippet: function(id, cb) {
    this.client.element({prefix: this.apiPath, model: Snippet, id: id}, cb);
  },
  
  createSnippet: function(attributes, cb) {
    this.client.create({prefix: this.apiPath, model: Snippet, attributes: attributes}, cb);
  },
  
  deploys: function(options, cb) {
    this.client.collection({prefix: this.apiPath, model: Deploy}, options, cb);
  },
  
  deploy: function(id, cb) {
    this.client.element({prefix: this.apiPath, model: Deploy, id: id}, cb);
  },
  
  uploadFiles: function(files, cb) {
    if (this.state !== "uploading") return cb(null, this);
    if (files.length == 0) { return this.refresh(cb); }

    var self = this,
        cbCalled = false,
        uploaded = [];
    
    files.forEach(function(file) {
      fs.readFile(file.abs, function(err, data) {
        if (cbCalled) return null;
        if (err) { cbCalled = true; return cb(err); }

        self.client.request({
          url: "/sites/" + self.id + "/files/" + file.rel,
          type: "put",
          body: data,
          contentType: "application/octet-stream",
          ignoreResponse: true
        }, function(err) {
          if (cbCalled) return null;
          if (err) { cbCalled = true; return cb(err); }
          uploaded.push(file);
        
          if (uploaded.length == files.length) {
            self.refresh(cb);
          }
        });
      });
    });
  }
};

exports.Site = Site;
},{"./deploy":3,"./file":4,"./form":5,"./model":6,"./snippet":8,"./submission":9,"__browserify_process":13,"crypto":12,"fs":12,"glob":12,"path":12}],8:[function(require,module,exports){
var model = require("./model");

var Snippet = model.constructor();
Snippet.path = "/snippets";

Snippet.prototype = {
  update: function(attributes, cb) {
    this.client.update({prefix: "/sites/" + this.site_id, model: Snippet, element: this, attributes: attributes}, cb);
  },
  destroy: function(cb) {
    this.client.destroy({prefix: "/sites/" + this.site_id, model: Snippet, element: this}, cb);
  }
}

exports.Snippet = Snippet;
},{"./model":6}],9:[function(require,module,exports){
var model = require("./model");

var Submission = model.constructor();
Submission.path = "/submissions";

exports.Submission = Submission;
},{"./model":6}],10:[function(require,module,exports){
var model = require("./model");

var User = model.constructor();
User.path = "/users";

User.prototype = {
  update: function(attributes, cb) {
    this.client.update({element: this, model: User, attributes: attributes}, cb);
  },
  destroy: function(cb) {
    this.client.destroy({element: this}, cb);
  }
};

exports.User = User;
},{"./model":6}],11:[function(require,module,exports){
(function (exports) {
	'use strict';

	var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

	function b64ToByteArray(b64) {
		var i, j, l, tmp, placeHolders, arr;
	
		if (b64.length % 4 > 0) {
			throw 'Invalid string. Length must be a multiple of 4';
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		placeHolders = b64.indexOf('=');
		placeHolders = placeHolders > 0 ? b64.length - placeHolders : 0;

		// base64 is 4/3 + up to two characters of the original data
		arr = [];//new Uint8Array(b64.length * 3 / 4 - placeHolders);

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length;

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (lookup.indexOf(b64[i]) << 18) | (lookup.indexOf(b64[i + 1]) << 12) | (lookup.indexOf(b64[i + 2]) << 6) | lookup.indexOf(b64[i + 3]);
			arr.push((tmp & 0xFF0000) >> 16);
			arr.push((tmp & 0xFF00) >> 8);
			arr.push(tmp & 0xFF);
		}

		if (placeHolders === 2) {
			tmp = (lookup.indexOf(b64[i]) << 2) | (lookup.indexOf(b64[i + 1]) >> 4);
			arr.push(tmp & 0xFF);
		} else if (placeHolders === 1) {
			tmp = (lookup.indexOf(b64[i]) << 10) | (lookup.indexOf(b64[i + 1]) << 4) | (lookup.indexOf(b64[i + 2]) >> 2);
			arr.push((tmp >> 8) & 0xFF);
			arr.push(tmp & 0xFF);
		}

		return arr;
	}

	function uint8ToBase64(uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length;

		function tripletToBase64 (num) {
			return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F];
		};

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
			output += tripletToBase64(temp);
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1];
				output += lookup[temp >> 2];
				output += lookup[(temp << 4) & 0x3F];
				output += '==';
				break;
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1]);
				output += lookup[temp >> 10];
				output += lookup[(temp >> 4) & 0x3F];
				output += lookup[(temp << 2) & 0x3F];
				output += '=';
				break;
		}

		return output;
	}

	module.exports.toByteArray = b64ToByteArray;
	module.exports.fromByteArray = uint8ToBase64;
}());

},{}],12:[function(require,module,exports){

},{}],13:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}]},{},[1])
;