[![NPM version][npm-image]][npm-url]
[![Dependency Status][daviddm-image]][daviddm-url]

# generator-semantic-release

Adds semantic-release to an existing project.

This is very similar to [semantic-release-cli](https://github.com/semantic-release/cli), except:

* It can be used as part of another generator via composition.
* It asks explictily for your github and npm keys, so you can generate them however you want.
* It asks explicitly if you want to save your keys.  If you do, they are saved securely using
  [keytar](https://github.com/atom/node-keytar).  You can also save multiple sets of keys -
  handy if you have some personal projects, and some "official" projects, and you want to use
  different credentials for the two.
* Uses build stages.

To run this, you need to already have a package.json, and a .travis.yml file.

## Installation

First, install [Yeoman](http://yeoman.io) and generator-semantic-release using [npm](https://www.npmjs.com/) (we assume you have pre-installed [node.js](https://nodejs.org/)).

```bash
npm install -g yo
npm install -g generator-semantic-release
```

Then run in an existing project:

```bash
yo semantic-release
```

## Development

To test changes, run:

```sh
npm pack .
npm install -g ./generator-semantic-release-*.tgz
```

And then you can run `yo semantic-release` in another project.

## License

MIT © [Jason Walton](https://www.thedreaming.org/)

[npm-image]: https://badge.fury.io/js/generator-semantic-release.svg
[npm-url]: https://npmjs.org/package/generator-semantic-release
[daviddm-image]: https://david-dm.org/jwalton/generator-semantic-release.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/jwalton/generator-semantic-release
