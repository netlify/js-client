# netlify Change Log
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

## 2.4.1 - 2019-03-04
* Update zip-it-and-ship-it to ^0.2.3

## 2.4.0 - 2019-02-20
* Update @netlify/open-api to 0.9.0

## 2.3.1 - 2019-02-19
* Update deps
* Update zip-it-and-ship-it to a working version

## 2.3.0 - 2019-02-06
* Improve function deployments with [@netlify/zip-it-and-ship-it](https://github.com/netlify/zip-it-and-ship-it) ([#34](https://github.com/netlify/js-client/pull/34))
  * Functions can now have their own `node_modules` folder, separate from your top-level sites.

## 2.2.5 - 2019-01-31
* Fix rare bug when importing `netlify` with webpack.  This fixes library compatibility with `netlify-lambda`. ([#35](https://github.com/netlify/js-client/pull/35))

## 2.2.4 - 2019-01-22
* Fix additional file upload failure modes

## 2.2.3 - 2019-01-18
* Fix a time parsing bug in the rate limit backoff code.
* Support stream ctor functions in the request body.

## 2.2.2 - 2019-01-18
* Handle rate limiting errors and retry at requested time.

## 2.2.1 - 2018-11-06
* Handle timeout errors when uploading files and retry upload.

## 2.2.0 - 2018-10-12
* Bump [@netlifyopen-api@0.5.0](https://github.com/netlify/open-api/releases/tag/v0.5.0)
  * Add `.getAccount` method

## 2.1.0 - 2018-10-11
* Add a UMD build and unpkg support. Thank you @leonardodino!

## 2.0.1 - 2018-09-25
* A whole new Netlify Node.js API client! 🎉
* Client code was extracted from our forthcoming [2.0.0 CLI](https://www.netlify.com/blog/2018/09/10/netlify-cli-2.0-now-in-beta-/) release.
* A completely new API.  Treat the 2.x.x and forward as a completely separate codebase and API.
* API calls are now derived from the [open-api](https://github.com/netlify/open-api) specification.  See the [swagger-ui](https://open-api.netlify.com/#/default) and know that there is a matching API method for every operationID (the name on the right).  See the README for full API docs.
* Includes a method for creating content based deploys.
