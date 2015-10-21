'use strict';

var express = require('express');
var app = express();
var expressLess = require('express-less');
var config = require('../config').getConfig();
var cookieParser = require('cookie-parser');
var session = require('express-session');
var NedbStore = require('connect-nedb-session')(session);
var passport = require('passport');
var log = require('../logger')('nodecg/lib/auth');

/**
 * Passport setup
 */
passport.serializeUser(function(user, done) {
    done(null, user);
});
passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

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

app.get('/auth/logout', function(req, res){
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
