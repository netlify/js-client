BitBalloon Node Client
======================

BitBalloon is a hosting service for the programmable web. It understands your documents, processes forms and lets you do deploys, manage forms submissions, inject javascript snippets into sites and do intelligent updates of HTML documents through it's API.

Installation
============

Install by running

    npm install bitballoon


Authenticating
==============

You'll need an application client id and a client secret before you can access the BitBalloon API. Please contact us at team@bitballoon.com for your credentials.

Once you have your credentials you can instantiate a BitBalloon client.

```js
var bitballoon = require("bitballoon"),
    client     = bitballoon.createClient(options);
```

Typically you'll have an `access_token` stored that you want to instantiate the client with:

```
var client = bitballoon.createClient({access_token: "my-access-token"});
```

A client need an access token before it can make requests to the BitBalloon API. Oauth2 gives you two ways to get an access token:

1. **Authorize from credentials**: Authenticate directly with your API credentials.
2. **Authorize from a URL**: send a user to a URL, where she can grant your access API access on her behalf.

The first method is the simplest, and works when you don't need to authenticate on behalf of some other user:

```js
var client = bitballoon.createClient({client_id: CLIENT_ID, client_secret: CLIENT_SECRET});

client.authorizeFromCredentials(function(err, access_token) {
  if (err) return console.log(err); 
  // Client is now ready to do requests
  // You can store the access_token to avoid authorizing in the future
});

```
To authorize on behalf of a user, you first need to send the user to a BitBalloon url where she'll be asked to grant your application permission. Once the user has visited that URL, she'll be redirected back to a redirect URI you specify (this must match the redirect URI on file for your Application). When the user returns to your app, you'll be able to access a `code` query parameter, that you can use to obtain the final `access_token`

```js
var client = bitballoon.createClient({
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

Creating a site from a directory (requires node):

```js
client.createSite({dir: "/tmp/my-site"}, function(err, site) {
  // do work
});
```

Creating a site from a zip file (requires node):

```js
client.createSite({zip: "/tmp/my-site.zip"}, function(err, site) {
  // do work
});
```

Both methods will create the site and upload the files. The site will then be processing.

```js
client.createSite({zip: "/tmp-my-site.zip"}, function(err, site) {
  site.state == "processing"
});
```

Refresh a site to update the state:

```js
site.refresh(function(err, site) {
  console.log(site.state);
});
```

Use `waitForReady` to wait until a site has finished processing.

```js
client.createSite({zip: "/tmp-my-site.zip"}, function(err, site) {
  site.waitForReady(function(err, site) {
    if (err) return console.log("Error deploying site %o", err);
    console.log("Site deployed");
  });
});
```

Redeploy a site from a dir:

```js
client.site(id, function(err, site) {
  if (err) return console.log("Error finding site %o", err);
  site.update({dir: "/tmp/my-site"}, function(err, site) {
    if (err) return console.log("Error updating site %o", err);
    site.waitForReady(function(err, site) {
      if (err) return console.log("Error updating site %o", err);
      console.log("Site redeployed");
    });
  });
})
```

Redeploy a site from a zip file:

```ruby
client.site(id, function(err, site) {
  if (err) return console.log("Error finding site %o", err);
  site.update({zip: "/tmp/my-site.zip"}, function(err, site) {
    if (err) return console.log("Error updating site %o", err);
    site.waitForReady(function(err, site) {
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

Restore a deploy (makes it the current live version of the site)

```js
site.deploy(id, function(err, deploy) {
  if (err) return console.log(err);
  deploy.restore(function(err, deploy) {
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