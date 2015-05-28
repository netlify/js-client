var path = require("path"),
    model = require("./model"),
    Form  = require("./form").Form,
    Submission = require("./submission").Submission,
    File = require("./file").File,
    Snippet = require("./snippet").Snippet,
    Deploy = require("./deploy").Deploy;

if (typeof(require) !== 'undefined') {
  var glob   = require("glob"),
      path   = require("path"),
      crypto = require("crypto"),
      fs     = require("graceful-fs");
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

var deployFromDir = function(site, dir, draft, cb) {
  var fullDir = path.resolve(dir);

  fs.stat(fullDir, function(err, stat) {
    if (err || stat.isFile()) return cb("No such dir " + dir + " (" + fullDir + ")");

    globFiles(fullDir, function(err, files) {
      calculateShas(files, function(err, filesWithShas) {
        site.client.request({
          url: site.apiPath + "/deploys",
          type: "post",
          body: JSON.stringify({
            files: filesWithShas,
            draft: draft
          })
        }, function(err, data) {
          if (err) return cb(err);
          var deploy = new Deploy(site.client, data);
          var shas = {};
          data.required.forEach(function(sha) { shas[sha] = true; });
          var filtered = files.filter(function(file) { return shas[filesWithShas[file.rel]]; });
          deploy.uploadFiles(filtered, function(err, deploy) {
            cb(err, deploy);
          });
        });
      });
    });
  });
};

var deployFromZip = function(site, zip, draft, cb) {
  var fullPath = zip.match(/^\//) ? zip : process.cwd() + "/" + zip;

  fs.readFile(fullPath, function(err, zipData) {
    if (err) return cb(err);

    var path = site.apiPath + "/deploys";

    if (draft) { path += "?draft=true"; }

    site.client.request({
      url: path,
      type: "post",
      body: zipData,
      contentType: "application/zip"
    }, function(err, data) {
      if (err) return cb(err);

      return cb(null, new Deploy(site.client, data));
    });
  });
};

var attributesForUpdate = function(attributes) {
  var mapping = {
        name: "name",
        customDomain: "custom_domain",
        notificationEmail: "notification_email",
        password: "password",
        github: "github",
        repo: "repo"
      },
      result = {};

  for (var key in attributes) {
    if (mapping[key]) result[mapping[key]] = attributes[key];
  }

  return result;
};

Site.createFromDir = function(client, dir, cb) {
  Site.create(client, {}, function(err, site) {
    site.createDeploy({dir: dir}, function(err, deploy) {
      site.deploy_id = deploy.id;
      cb(null, site);
    })
  });
};

Site.createFromZip = function(client, zip, cb) {
  Site.create(client, {}, function(err, site) {
    site.createDeploy({zip: zip}, function(err, deploy) {
      site.deploy_id = deploy.id;
      cb(null, site);
    })
  });
};

Site.create = function(client, attributes, cb) {
  client.create({model: Site, attributes: attributesForUpdate(attributes)}, cb);
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

  createDeploy: function(attributes, cb) {
    if (attributes.dir) {
      deployFromDir(this, attributes.dir, attributes.draft || false, cb);
    } else if (attributes.zip) {
      deployFromZip(this, attributes.zip, attributes.draft || false, cb);
    } else {
      cb("You must specify a 'dir' or a 'zip' to deploy");
    }
  },

  createDraftDeploy: function(attributes, cb) {
    attributes.draft = true;
    this.createDeploy(attributes, cb);
  },

  waitForReady: function(cb) {
    var self = this;

    if (this.isReady()) {
      process.nextTick(function() { cb(null, self); });
    } else {
      setTimeout(function() {
        self.refresh(function(err) {
          if (err) return cb(err);
          self.waitForReady(cb);
        });
      }, 1000);
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
  }
};

exports.Site = Site;
