var path       = require("path"),
    when       = require("when"),
    glob       = require("glob"),
    crypto     = require("crypto"),
    fs         = require("graceful-fs");
    nodefn     = require("when/node"),
    model      = require("./model"),
    Form       = require("./form").Form,
    Submission = require("./submission").Submission,
    File       = require("./file").File,
    Snippet    = require("./snippet").Snippet,
    Deploy     = require("./deploy").Deploy;

var Site = model.constructor();
Site.path = "/sites";

function globFiles(dir) {
  return nodefn.call(glob, "**/*", {cwd: dir}).then(function(files) {
    var filtered = files.filter(function(file) {
      return file.match(/(\/__MACOSX|\/\.)/) ? false : true;
    }).map(function(file) { return {rel: file, abs: path.resolve(dir, file)}; });

    return filterFiles(filtered);
  })
};

function filterFiles(filesAndDirs) {
  var lstats = filesAndDirs.map(function(fileOrDir) {
    return nodefn.call(fs.lstat, fileOrDir.abs)
  });

  return when.all(lstats).then(function(fileData) {
    var result = [];
    for (var i=0,len=fileData.length; i<len; i++) {
      var file = filesAndDirs[i],
          data = fileData[i];

      if (data.isFile()) {
        result.push(file);
      }
    }
    return result;
  });
};

function calculateShas(files) {
  var shas = files.map(function(file) {
    return nodefn.call(fs.readFile, file.abs).then(function(data) {
      var shasum = crypto.createHash('sha1');
      shasum.update(data);
      file.sha = shasum.digest('hex');
      return true;
    });
  });

  return when.all(shas).then(function() {
    var result = {};
    files.forEach(function(file) {
      result[file.rel] = file.sha;
    });
    return {files: files, shas: result};
  });
};

function deployFromDir(site, dir, draft) {
  var fullDir = path.resolve(dir);

  return nodefn.call(fs.stat, fullDir).then(function(stat) {
    if (stat.isFile()) {
      throw("No such dir " + dir + " (" + fullDir + ")");
    }

    return globFiles(fullDir).then(calculateShas).then(function(filesWithShas) {
      return nodefn.call(site.client.request.bind(site.client), {
        url: site.apiPath + "/deploys",
        type: "post",
        body: JSON.stringify({
          files: filesWithShas.shas,
          draft: draft
        })
      }).then(function(data) {
        var deploy = new Deploy(site.client, data[0]);
        var shas = {};
        data[0].required.forEach(function(sha) { shas[sha] = true; });
        var filtered = filesWithShas.files.filter(function(file) { return shas[file.sha]; });
        return nodefn.call(deploy.uploadFiles.bind(deploy), filtered);
      });
    });
  }).catch(function(err) {
    return when.reject(err);
  });
};

function deployFromZip(site, zip, draft, cb) {
  var fullPath = zip.match(/^\//) ? zip : process.cwd() + "/" + zip;

  return nodefn.call(fs.readFile, fullPath).then(function(zipData) {
    var path = site.apiPath + "/deploys";

    if (draft) { path += "?draft=true"; }

    return nodefn.call(site.client.request.bind(site.client), {
      url: path,
      type: "post",
      body: zipData,
      contentType: "application/zip"
    }).then(function(data) {
      return new Deploy(site.client, data[0]);
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
      deployFromDir(this, attributes.dir, attributes.draft || false).then(function(deploy) {
        cb(null, deploy)
      }).catch(function(err) {
        cb(err);
      });
    } else if (attributes.zip) {
      deployFromZip(this, attributes.zip, attributes.draft || false).then(function(deploy) {
        cb(null, deploy);
      }).catch(function(err) {
        cb(err);
      });
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
