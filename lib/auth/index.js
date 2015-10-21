'use strict';

var express = require('express');
var app = express();
var expressLess = require('express-less');
var config = require('../config').getConfig();
var cookieParser = require('cookie-parser');
var session = require('express-session');
var NedbStore = require('connect-nedb-session')(session);
var passport = require('passport');
var SteamStrategy = require('passport-steam').Strategy;
var TwitchStrategy = require('passport-twitch').Strategy;
var log = require('../logger')('nodecg/lib/auth');

/**
 * Passport setup
 * Serializing full user profile, setting up SteamStrategy
 */
passport.serializeUser(function(user, done) {
    done(null, user);
});
passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

if (config.auth.steam.enabled) {
    passport.use(new SteamStrategy({
            returnURL: 'http://'+ config.baseURL +'/auth/login/auth/steam',
            realm: 'http://'+ config.baseURL +'/auth/login/auth/steam',
            apiKey: config.auth.steam.apiKey
        },
        function(identifier, profile, done) {
            process.nextTick(function() {
                profile.allowed = (config.auth.steam.allowedIds.indexOf(profile.id) > -1);

                if (profile.allowed) {
                    log.info('Granting %s (%s) access', profile.id, profile.displayName);
                } else {
                    log.info('Denying %s (%s) access', profile.id, profile.displayName);
                }

                return done(null, profile);
            });
        }
    ));
}

if (config.auth.twitch.enabled) {
    passport.use(new TwitchStrategy({
            clientID: config.auth.twitch.clientID,
            clientSecret: config.auth.twitch.clientSecret,
            callbackURL: (config.ssl.enabled ? 'https://' : 'http://')+ config.baseURL +'/auth/login/auth/twitch',
            scope: config.auth.twitch.scope
        },
        function(accessToken, refreshToken, profile, done) {
            process.nextTick(function() {
                profile.allowed = (config.auth.twitch.allowedUsernames.indexOf(profile.username) > -1);

                if (profile.allowed) {
                    log.info('Granting %s access', profile.username);
                    profile.accessToken = accessToken;
                    // Twitch oauth does not use refreshToken
                } else {
                    log.info('Denying %s access', profile.username);
                }

                return done(null, profile);
            });
        }
    ));
}

app.use(cookieParser());
app.use(session({
    secret: config.auth.sessionSecret,
    resave: true,
    saveUninitialized: true,
    store: new NedbStore({ filename: __dirname + '/../../db/sessions.db' })
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/auth', express.static(__dirname + '/public', {maxAge: 60*60*24*7*1000}));
app.use('/auth', expressLess(__dirname + '/public', { compress: true }));
app.set('views', __dirname);

app.get('/auth/login', function(req, res) {
    res.render('public/login.jade', {user: req.user, config: config});
});

app.get('/auth/error', function(req, res) {
    res.render('public/error.jade', {
        message: req.query.message,
        code: req.query.code,
        viewUrl: req.query.viewUrl
    });
});

app.get('/auth/login/steam',
    passport.authenticate('steam'),
    function() {
        // Passport will redirect to Steam to login
    }
);

app.get('/auth/login/auth/steam',
    passport.authenticate('steam', { failureRedirect: '/auth/login' }),
    redirectPostLogin
);

app.get('/auth/login/twitch',
    passport.authenticate('twitch'),
    function() {
        // Passport will redirect to Twitch to login
    }
);

app.get('/auth/login/auth/twitch',
    passport.authenticate('twitch', { failureRedirect: '/auth/login' }),
    redirectPostLogin
);

app.get('/logout', function(req, res){
    app.emit('logout', req.session);
    req.logout();
    res.redirect('/');
});

function redirectPostLogin(req, res) {
    var url = req.session.returnTo || '/dashboard';
    res.redirect(url);
    app.emit('login', req.session);
}

module.exports = app;
