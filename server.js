/*global console*/
'use strict';

var path = require('path');
var express = require('express');
var helmet = require('helmet');
var Moonboots = require('moonboots');
var config = require('getconfig');
var semiStatic = require('semi-static');
var stylizer = require('stylizer');
var templatizer = require('templatizer');
var app = express();

// a little helper for fixing paths for various enviroments
var fixPath = function (pathString) {
    return path.resolve(path.normalize(pathString));
};

// -----------------
// Configure express
// -----------------
app.use(express.compress());
app.use(express.static(fixPath('public')));

// we only want to expose tests in dev
if (config.isDev) {
    app.use(express.static(fixPath('clienttests/assets')));
    app.use(express.static(fixPath('clienttests/spacemonkey')));
}
app.use(express.bodyParser());
app.use(express.cookieParser());
// in order to test this with spacemonkey we need frames
if (!config.isDev) {
    app.use(helmet.xframe());
}
app.use(helmet.iexss());
app.use(helmet.contentTypeOptions());
app.set('view engine', 'jade');


// ---------------------------------------------------
// Configure Moonboots to serve our client application
// ---------------------------------------------------
var clientApp = new Moonboots({
    jsFileName: 'transApp',
    cssFileName: 'transApp',
    main: fixPath('clientapp/app.js'),
    developmentMode: config.isDev,
    libraries: [
        fixPath('clientapp/libraries/jquery.min.js'),
        fixPath('clientapp/libraries/bootstrap.js')
    ],
    stylesheets: [
        fixPath('public/css/bootstrap.css'),
        fixPath('public/css/bootstrap-theme.css'),
        fixPath('public/css/app.css')
    ],
    browserify: {
        debug: false
    },
    server: app,
    beforeBuildJS: function () {
        // This re-builds our template files from jade each time the app's main
        // js file is requested. Which means you can seamlessly change jade and
        // refresh in your browser to get new templates.
        if (config.isDev) {
            templatizer(fixPath('clienttemplates'), fixPath('clientapp/templates.js'));
        }
    },
    beforeBuildCSS: function (done) {
        // This re-builds css from stylus each time the app's main
        // css file is requested. Which means you can seamlessly change stylus files
        // and see new styles on refresh.
        if (config.isDev) {
            stylizer({
                infile: fixPath('public/css/app.styl'),
                outfile: fixPath('public/css/app.css'),
                development: true
            }, done);
        }
    }
});

var realApi = require('./API/translator_api');
app.get('/api/translate/:text/:lang1/:lang2', realApi.translate);

// Enable the functional test site in development
if (config.isDev) {
    app.get('/test*', semiStatic({
        folderPath: fixPath('clienttests'),
        root: '/test'
    }));
}

// use a cookie to send config items to client
var clientSettingsMiddleware = function (req, res, next) {
    res.cookie('config', JSON.stringify(config.client));
    next();
};

// configure our main route that will serve our moonboots app
app.get('*', clientSettingsMiddleware, clientApp.html());

// listen for incoming http requests on the port as specified in our config
var port = process.env.PORT || config.http.port || 5000;
app.listen(port);
console.log('Translate And Backbone is running at: http://localhost:' + port + ' Yep. That\'s pretty awesome.');
