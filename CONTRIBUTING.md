# CONTRIBUTING

Contributions are always welcome, no matter how large or small. Before contributing, please read the
[code of conduct](CODE_OF_CONDUCT.md).

## Setup

> Install Node.js + npm on your system: https://nodejs.org/en/download/

```sh
$ git clone https://github.com/netlify/js-client netlify-js-client
$ cd netlify-js-client
$ npm install
$ npm test
```

You can also use yarn.

## Testing

This repo uses [ava](https://github.com/avajs/ava) for testing. Any files in the `src` directory that have a `.test.js`
file extension are automatically detected and run as tests.

We also test for a few other things:

- Dependencies (used an unused)
- Linting
- Test coverage
- Must work with Windows + Unix environments.

## Architecture

We target Node.js LTS and stable environments, and aim for basic modern browser support when possible. In order to
facilitate simple contributions, we avoided any kind of build steps.

If you need to add new API routes, please add them to the [open-api](https://github.com/netlify/open-api) repo. This
client will automatically inherent the new routes from that module.

Projects that depend heavily on this client that should be taken into consideration when making changes:

- [netlify/cli](https://github.com/netlify/cli)

## Releasing

Merge the release PR

## License

By contributing to Netlify Node Client, you agree that your contributions will be licensed under its
[MIT license](LICENSE).
