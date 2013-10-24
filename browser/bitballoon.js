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
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
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
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
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
    if (!this.isAuthorized()) return cb("Not authorized");

    this.request({
      url: "/sites"      
    }, function(err, collection, client) {
      if (err) return cb(err);
      cb(null, collection.map(function(data) { return new Client.models.Site(client, data); }));
    });
  },

  site: function(id, cb) {
    if (!this.isAuthorized()) return cb("Not authorized");
    
    this.request({
      url: "/sites/" + id
    }, function(err, data, client) {
      if (err) return cb(err);
      cb(null, new Client.models.Site(client, data));
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
    if (options.auth) {
      xhr.setRequestHeader("Authorization", "Basic " + base64.fromByteArray(
        stringToByteArray(options.auth.user + ":" + options.auth.password)
      ));
    } else if (this.access_token) {
      xhr.setRequestHeader("Authorization", "Bearer " + this.access_token);
    }

    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        if (xhr.status == 200) {
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
  }
};

if (typeof(XMLHttpRequest) === 'undefined') {
  Client.XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
} else {
  Client.XMLHttpRequest = XMLHttpRequest;
}

exports.Client = Client;
},{"./site":3,"base64-js":4,"xmlhttprequest":5}],3:[function(require,module,exports){
var Site = function(client, attributes) {
  for (var key in attributes) {
    this[key] = attributes[key]
  }

  this.client = client;
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
  }
};

exports.Site = Site;
},{}],4:[function(require,module,exports){
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

},{}],5:[function(require,module,exports){

},{}]},{},[1])
;