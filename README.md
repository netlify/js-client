Netlify Node Client
======================

Netlify is a hosting service for the programmable web. It understands your documents, processes forms and lets you do deploys, manage forms submissions, inject javascript snippets into sites and do intelligent updates of HTML documents through it's API.

Installation
============

Install by running

    npm install netlify


Authenticating
==============

Register a new application at https://app.netlify.com/applications to get your Oauth2 secret and key.

Once you have your credentials you can instantiate a Netlify client.

```js
var netlify = require("netlify"),
    client     = netlify.createClient(options);
```

Typically you'll have an `access_token` stored that you want to instantiate the client with:

```
var client = netlify.createClient({access_token: "my-access-token"});
```

A client need an access token before it can make requests to the Netlify API. Oauth2 gives you two ways to get an access token:

1. **Authorize from credentials**: Authenticate directly with your API credentials.
2. **Authorize from a URL**: send a user to a URL, where she can grant your access API access on her behalf.

The first method is the simplest, and works when you don't need to authenticate on behalf of some other user:

```js
var client = netlify.createClient({client_id: CLIENT_ID, client_secret: CLIENT_SECRET});

client.authorizeFromCredentials(function(err, access_token) {
  if (err) return console.log(err);
  // Client is now ready to do requests
  // You can store the access_token to avoid authorizing in the future
});

```
To authorize on behalf of a user, you first need to send the user to a Netlify url where she'll be asked to grant your application permission. Once the user has visited that URL, she'll be redirected back to a redirect URI you specify (this must match the redirect URI on file for your Application). When the user returns to your app, you'll be able to access a `code` query parameter, that you can use to obtain the final `access_token`

```js
var client = netlify.createClient({
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET,
  redirect_uri: "http://www.example.com/callback"
});

var url = client.authorizeUrl();

// Send the client to the url, they will be redirected back to the redirect_uri
// Once they are back at your url, grab the code query param and use it to authorize

client.authorizeFromCode(params.code, function(err, access_token) {
  if (err) return console.log(err);
  // Client is now ready to do requests
  // You can store the access_token to avoid authorizing in the future  
});
```

Deploy a new version of a site
==============================

If you're just going to deploy a new version of a site from a script, the module exports a simple deploy method that will handle this:

```js
var netlify = require("netlify");

netlify.deploy({access_token: "some-token", site_id: "some-site", dir: "/path/to/site"}, function(err, deploy) {
  if (err) { return console.log(err); }
  console.log("New deploy is live");
});
```

Sites
=====

Getting a list of all sites you have access to:

```js
client.sites(function(err, sites) {
  // do work
});
```

Getting a specific site by id:

```js
client.site(id, function(err, site) {
  // do work
})
```

Creating a new empty site:

```js
client.createSite({name: "my-unique-site-name", domain: "example.com", password: "secret"}, function(err, site) {
  console.log(site);
})

To deploy a site from a dir and wait for the processing of the site to finish:

```js
client.createSite({}, function(err, site) {
  site.createDeploy({dir: "/tmp/my-site"}, function(err, deploy) {
    deploy.waitForReady(function(deploy) {
      console.log("Deploy is done: ", deploy);
    });
  });
});
```

Creating a new deploy for a site from a zip file:

```ruby
client.site(id, function(err, site) {
  if (err) return console.log("Error finding site %o", err);
  site.createDeploy({zip: "/tmp/my-site.zip"}, function(err, deploy) {
    if (err) return console.log("Error updating site %o", err);
    deploy.waitForReady(function(err, deploy) {
      if (err) return console.log("Error updating site %o", err);
      console.log("Site redeployed");
    });
  });
})
```

Update the name of the site (its subdomain), the custom domain and the notification email for form submissions:

```js
site.update({name: "my-site", customDomain: "www.example.com", notificationEmail: "me@example.com", password: "secret"}, function(err, site) {
  if (err) return console.log("Error updating site %o", err);
  console.log("Updated site");
});
```

Deleting a site:

```js
site.destroy(function(err) {
  if (err) return console.log("Error deleting site");
  console.log("Site deleted");
});
```

Forms
=====

Access all forms you have access to:

```js
client.forms(function(err, forms) {
  // do work
})
```

Access forms for a specific site:

```js
client.site(id, function(err, site) {
  if (err) return console.log("Error getting site %o", err);
  site.forms(function(err, forms) {
    // do work
  });
});
```

Access a specific form:

```js
client.form(id, function(err, form) {
  if (err) return console.log("Error getting form %o", err);
  // do work
});
```

Access a list of all form submissions you have access to:

```js
client.submissions(function(err, submissions) {
  if (err) return console.log("Error getting submissions %o", err);
  // do work
});
```

Access submissions from a specific site

```js
client.site(id, function(err, site) {
  if (err) return console.log("Error getting site %o", err);
  site.submissions(function(err, submissions) {
    if (err) return console.log("Error getting submissions %o", err);
    // do work
  })
});
```

Access submissions from a specific form

```js
client.form(id, function(err, form) {
  if (err) return console.log("Error getting form %o", err);
  form.submissions(function(err, submissions) {
    if (err) return console.log("Error getting submissions %o", err);
    // do work
  });
});
```

Get a specific submission

```js
client.submission(id, function(err, submission) {
  if (err) return console.log("Error getting submission %o", err);
  // do work
})
```

Files
=====

Access all files in a site:

```js
client.site(id, function(err, site) {
  if (err) return console.log("Error getting site %o", err);
  site.files(function(err, files) {
    if (err) return console.log("Error getting files %o", err);
    // do work
  });
});
```

Get a specific file:

```js
client.site(id, function(err, site) {
  if (err) return console.log("Error getting site %o", err);
  site.file(path, function(err, file) {
    if (err) return console.log("Error getting file %o", err);

    file.readFile(function(err, data) {
      if (err) return console.log("Error reading file %o", err);
      console.log("Got data %o", data);
    });

    file.writeFile("Hello, World!", function(err, file) {
      if (err) return console.log("Error writing to file %o", err);
      console.log("Wrote to file - site will now be processing");
    });
  });
});
```

Deploys
=======

Access all deploys for a site

```js
site.deploys(function(err, deploys) {
  // do work
});
```

Access a specific deploy

```js
site.deploy(id, function(err, deploy) {
  // do work
});
```

Create a new deploy:

```js
site.createDeploy({dir: "/path/to/folder"}, function(err, deploy) {
  console.log(deploy)
})
```

Create a draft deploy (wont get published after processing):

```js
site.createDeploy({dir: "/path/to/folder", draft: true}, function(err, deploy) {
  console.log(deploy);
})
```

Publish a deploy (makes it the current live version of the site)

```js
site.deploy(id, function(err, deploy) {
  if (err) return console.log(err);
  deploy.publish(function(err, deploy) {
    // restored
  });
});
```


Snippets
========

Snippets are small code snippets injected into all HTML pages of a site right before the closing head or body tag. To get all snippets for a site:

```js
client.site(id, function(err, site) {
  if (err) return console.log("Error getting site %o", err);
  site.snippets(function(err, snippets) {
    if (err) return console.log("Error getting snippets %o", err);
    // do work
  });
});
```

Get a specific snippet

```js
client.site(id, function(err, site) {
  if (err) return console.log("Error getting site %o", err);
  site.snippet(snippetId, function(err, snippet) {
    if (err) return console.log("Error getting snippet %o", err);
    // do work
  });
});
```

Add a snippet to a site

You can specify a `general` snippet that will be inserted into all pages, and a `goal` snippet that will be injected into a page following a successful form submission. Each snippet must have a title. You can optionally set the position of both the general and the goal snippet to `head` or `footer` to determine if it gets injected into the head tag or at the end of the page.

```js
client.site(id, function(err, site) {
  if (err) return console.log("Error getting site %o", err);
  site.createSnippet({
    general: "<script>alert('Hello')</script>",
    general_position: "head",
    goal: "<script>alert('Success')</script>",
    goal_position: "footer",
    title: "Alerts"
  }, function(err, snippet) {
    if (err) return console.log("Error creating snippet %o", err);
    console.log(snippet);
  });
});
```

Update a snippet

```js
snippet.update({
  general: "<script>alert('Hello')</script>",
  general_position: "head",
  goal: "<script>alert('Success')</script>",
  goal_position: "footer",
  title: "Alerts"
}, function(err, snippet) {
  if (err) return console.log("Error creating snippet %o", err);
  console.log(snippet);
});
```

Delete a snippet

```js
snippet.destroy(function(err) {
  if (err) return console.log("Error deleting snippet");
  console.log("Snippet deleted");
});
```

Users
=====

The user methods are mainly useful for resellers. Creating, deleting and updating users are limited to resellers.

Getting a list of users

```js
client.users(function(err, users) {
  // do work
});
```

Getting a specific user

```js
client.user(id, function(err, user) {
  // do work
});
```

Creating a new user (`email` is required, `uid` is optional. Both must be unique)

```js
client.createUser({email: "user@example.com", uid: "12345"}, function(err, user) {
  if (err) return console("Error creating user");
  console.log(user);
});
```

Updating a user

```js
client.user(id, function(err, user) {
  if (err) return console.log("Error getting user");
  user.update({email: "user@example.com", uid: "12345"}, function(err, user) {
    if (err) return console("Error updating user");
    console.log(user);
  });
});
```

Deleting a user

```js
client.user(id, function(err, user) {
  if (err) return console.log("Error getting user");
  user.destroy(function(err) {
    if (err) return console("Error deleting");
  });
});
```

Getting sites belonging to a user

```js
client.user(id, function(err, user) {
  if (err) return console.log("Error getting user");
  user.sites(function(err, sites) {
    if (err) return console("Error getting sites");
    console.log(sites);
  });
});
```

DNS
===

Resellers can create and manage DNS Zones through the Netlify API.

Getting a list of DNS Zones:

```js
client.dnsZones(function(err, zones) {
  console.log(zones);
});
```

Getting a specific DNS zone:

```js
client.dnsZone(id, function(err, zone) {
  console.log(zone);
});
```

Creating a new zone

```js
client.createDnsZone({name: "example.com"}, function(err, zone) {
  console.log(zone);
});
```

Deleting a zone

```js
client.dnsZone(id, function(err, zone) {
  if (err) return console.log(err);
  zone.destroy(function(err) {
    // Deleted
  });
});
```

Getting records for a zone

```js
zone.records(function(err, records) {
  console.log(records);
});
```

Getting a specific record

```js
zone.record(id, function(err, record) {
  console.log(record);
});
```

Adding a new record (supported types: A, CNAME, TXT, MX)

```js
zone.createRecord({
  hostname: "www",
  type: "CNAME",
  value: "netlify.com",
  ttl: 3600
}, function(err, record) {
  console.log(record);
});
```

Deleting a record

```js
record.destroy(function(err) {
  // deleted
});
```

Access Tokens
=============

Resellers can use the node client to create and revoke access tokens on behalf of their users. To use any of these methods your OAuth access token must belong to a reseller admin user.

Creating an access token:

```js
client.createAccessToken({user: {email: "test@example.com", uid: "1234"}}, function(err, accessToken) {
  // accessToken.access_token
});
```

The user must have either an email or a uid (or both) as a unique identifier. If the user doesn't exist, a new user will be created on the fly.

Deleting an access token:

```js
client.accessToken("token-string", function(err, accessToken) {
  accessToken.destroy(function(err) {
    console.log("Access token revoked");
  });
});
```
