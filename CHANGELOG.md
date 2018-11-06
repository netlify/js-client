# netlify Change Log
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

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
