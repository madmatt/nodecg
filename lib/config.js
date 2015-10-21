'use strict';

var fs = require('fs');
var extend = require('extend');
var path = require('path');

var defaultConfig = {
    host: 'localhost',
    port: 9090,
    developer: false,
    auth: {
        enabled: false,
        sessionSecret: 'secretsecret'
    },
    logging: {
        replicants: false,
        console: {
            enabled: true,
            level: 'info'
        },
        file: {
            enabled: true,
            path: 'logs/server.log',
            level: 'info'
        }
    },
    ssl: {
        enabled: false,
        allowHTTP: false,
        // Path to private key & certificate
        keyPath: '',
        certificatePath: ''
    }
};

var config = null;
var filteredConfig = null;
var defaultConfigCopy = extend(true, {}, defaultConfig);

// Create the cfg dir if it does not exist
if (!process.env.browser) {
    var cfgDirPath = path.resolve(__dirname, '..', 'cfg');
    if (!fs.existsSync(cfgDirPath)) {
        fs.mkdirSync(cfgDirPath);
    }
}

// Load user config if it exists, and merge it
try {
    // This is done in two steps to make it play nicely with BRFS
    var rawConfig = fs.readFileSync('cfg/nodecg.json', 'utf8');
    var userConfig = JSON.parse(rawConfig);
    config = extend(true, defaultConfig, userConfig);

    if (!config.listen) {
        config.listen = config.port;
    }

    if (!config.baseURL) {
        config.baseURL = config.host + ':' + config.port;
    }

    if (config.developer) {
        console.warn('[nodecg] Developer mode is active! Be sure to disable this in production.');
    }
} catch (e) {
    console.info('[nodecg] No config found or config failed to load, using defaults');
    config = defaultConfigCopy;
    config.listen = config.port;
    config.baseURL = config.host + ':' + config.port;
}

// Create the filtered config
filteredConfig = {
    host: config.host,
    port: config.port,
    developer: config.developer,
    baseURL: config.baseURL,
    auth: {
        enabled: config.auth.enabled
    },
    logging: {
        replicants: config.logging.replicants,
        console: config.logging.console,
        file: {
            enabled: config.logging.file.enabled,
            level: config.logging.file.level
        }
    },
    ssl: {
        enabled: config.ssl.enabled
    }
};

exports.getConfig = function() {
    return extend(true, {}, config);
};

exports.getFilteredConfig = function() {
    return extend(true, {}, filteredConfig);
};

module.exports = exports;
