'use strict';
const Generator = require('yeoman-generator');
const yaml = require('js-yaml');
const keytar = require('keytar');

const SEMANTIC_RELEASE_BADGE = '[![semantic-release]' +
    '(https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)]' +
    '(https://github.com/semantic-release/semantic-release)';

const KEYTAR_SERVICE = 'jwalton-semantic-release';
const KEYTAR_ACCOUNT = 'all';

module.exports = class extends Generator {
    constructor(args, opts) {
        super(args, opts);

        this.option('githubToken', {
            desc: "Github token for pushing releases.",
            type: String
        });

        this.option('npmToken', {
            desc: "NPM token for publishing releases.",
            type: String
        });
    }

    async prompting() {
        this.props = {};
        let credentials = {};
        credentials.githubToken = this.options.githubToken;
        credentials.npmToken = this.options.npmToken;

        if(!credentials.githubToken || !credentials.npmToken) {
            let loadedFrom;
            const rawKeys = await keytar.getPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);
            let keys;
            if(rawKeys) {
                try {
                    keys = JSON.parse(rawKeys);
                } catch(err) {
                    // Ingore
                }
            }


            try {
                if(keys) {
                    const {keyset} = await this.prompt({
                        type: 'list',
                        name: 'keyset',
                        message: 'Choose keyset',
                        choices: ['Other...'].concat(Object.keys(keys))
                    });

                    if(keyset !== 'Other...') {
                        credentials = keys[keyset];
                        loadedFrom = keyset;
                    }
                }
            } catch(err) {
                // Ignore
            }

            if(!credentials.githubToken || !credentials.npmToken) {
                if(!credentials.githubToken) {
                    Object.assign(credentials, await this.prompt({
                        name: 'githubToken',
                        message: 'Your github token (for semantic-release)',
                        default: credentials && credentials.githubToken
                    }));
                }

                if(!credentials.npmToken) {
                    Object.assign(credentials, await this.prompt({
                        name: 'npmToken',
                        message: 'Your NPM token (for semantic-release)',
                        default: credentials && credentials.npmToken
                    }));
                }

                const origReleaseConfig = credentials.releaseConfig;
                Object.assign(credentials, await this.prompt({
                    name: 'releaseConfig',
                    message: 'Name of shareable semantic-release config package (optional)',
                    default: credentials.releaseConfig
                }));


                if(!loadedFrom || credentials.releaseConfig !== origReleaseConfig) {
                    const {keyName} = await this.prompt({
                        name: 'keyName',
                        message: 'Enter a name to save these options with keytar (optional)'
                    });

                    if(keyName) {
                        keys = keys || {};
                        keys[keyName] = credentials;
                        await keytar.setPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT, JSON.stringify(keys));
                    }
                }
            }
        }

        Object.assign(this.props, credentials);

        Object.assign(this.props, await this.prompt({
            type: 'confirm',
            name: 'usesPrivate',
            message: 'Does this project depend on private packages?',
            default: false
        }));


    }

    async writing() {

        // Update package.json.
        const pkgJson = {
            version: "0.0.0-semantic-release",
            scripts: {
                "semantic-release": "semantic-release"
            }
        };
        this.fs.extendJSON(
            this.destinationPath('package.json'),
            pkgJson
        );

        // Add semantic-release badge
        let readme = '';
        try {
            readme = this.fs.read(this.destinationPath('README.md'));
        } catch(err) {
            // Ignore
        }
        if(!readme.includes(SEMANTIC_RELEASE_BADGE)) {
            readme = SEMANTIC_RELEASE_BADGE + '\n' + readme;
            this.fs.write(this.destinationPath('README.md'), readme);
        }

        // Add deploy step to .travis.yml
        const travisYml = this.destinationPath('.travis.yml');
        const travisConfig = yaml.safeLoad(this.fs.read(travisYml));
        travisConfig.jobs = travisConfig.jobs || {};
        travisConfig.jobs.include = travisConfig.jobs.include || [];

        // Make sure we cache ~/.npm to speed up builds.
        if(!travisConfig.cache) {
            travisConfig.cache = {
                directories: ['~/.npm']
            };
        }

        // If there's no 'test' stage, add an empty one, otherwise travis
        // will skip it in certain cases.
        // See https://github.com/travis-ci/beta-features/issues/28#issuecomment-390314313.
        const oldTestStage = travisConfig.jobs.include.find(job => job.stage === 'test');
        if(!oldTestStage) {
            travisConfig.jobs.include.unshift({stage: 'test'});
        }

        // Remove existing release stage
        travisConfig.jobs.include = travisConfig.jobs.include.filter(job => job.stage !== 'release');

        // Add new release stage
        const beforeInstall = ['npm install -g npm'];
        if(this.props.usesPrivate) {
            beforeInstall.push('echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc');
        }
        travisConfig.jobs.include.push({
            stage: 'release',
            node_js: 'lts/*',
            before_install: beforeInstall,
            install: [
                'travis_retry npm install'
            ],
            before_script: 'skip',
            script: 'npm run semantic-release',
            after_success: 'skip',
            after_failure: 'skip',
            after_script: 'skip'
        });
        this.fs.write(travisYml, yaml.safeDump(travisConfig));

        if(this.props.releaseConfig) {
            this.fs.write(this.destinationPath('.releaserc.yml'), `extends: '${this.props.releaseConfig}'`);
        }
    }

    install() {
        const packages = ['semantic-release'];
        if(this.props.releaseConfig) {
            packages.push(this.props.releaseConfig);
        }

        this.npmInstall(packages, { "save-dev": true });
    }

    end() {
        this.log('Run the following commands to enable semantic-release on travis:');
        this.log('');
        this.log(`    travis enable`);
        this.log(`    travis env set GH_TOKEN ${this.props.githubToken}`);
        this.log(`    travis env set NPM_TOKEN ${this.props.npmToken}`);
        this.log('');

        // const cwd = this.destinationPath();
        // this.spawnCommandSync('travis', ['enable'], {cwd});
        // this.spawnCommandSync('travis', ['env', 'set', 'GH_TOKEN', this.props.githubToken], {cwd});
        // this.spawnCommandSync('travis', ['env', 'set', 'NPM_TOKEN', this.props.npmToken], {cwd});
    }
};
