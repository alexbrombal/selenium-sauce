
var webdriverio = require('webdriverio'),
    httpserver = require('http-server'),
    selenium = require('selenium-standalone'),
    sauceConnectLauncher = require('sauce-connect-launcher'),
    extend = require('extend'),
    colors = require('colors'),
    async = require('async'),
    portscanner = require('portscanner'),
    SauceLabs = require('saucelabs');

/**
 * Initializes Selenium Sauce using the specified options.
 * 'doEachBrowser' is called once for each browser in options.webdriver.desiredCapabilities, passing in the webdriverio instance.
 */
var SeSauce = function(options, doEachBrowser) {

    options = options || {};

    // Backwards compatibility
    options.webdriver = options.webdriver || {};
    if (!options.webdriver.sauce && !options.webdriver.local)
    {
        var sauce = extend({}, options.webdriver);
        var local = extend({}, options.webdriver);
        local.host = 'localhost';
        local.port = 4444;
        options.webdriver = { local: local, sauce: sauce };
    }

    this.browsers = [];
    this._browserActions = [];
    this._initialized = false;
    this._stopped = false;

    this.options = extend(true, {
            quiet: false,           // Silences the console output
            sauceUsername: process.env.SAUCE_USERNAME,
            sauceAccessKey: process.env.SAUCE_ACCESS_KEY,
            webdriver: {            // Array of options objects for selenium webdriver (webdriverio) to try
                sauce: {
                    host: 'ondemand.saucelabs.com',
                    port: 80,
                    logLevel: 'silent',
                    desiredCapabilities: [] // Non-standard option; An array of desired capabilities instead of a single object
                },
                local: {
                    host: 'localhost',
                    port: 4444,
                    logLevel: 'silent',
                    desiredCapabilities: []
                }
            },
            httpServer: {           // Options for local http server (npmjs.org/package/http-server)
                disable: false,         // Non-standard option; used to skip launching the http server
                port: 8080,             // Non-standard option; it is passed into the httpServer.listen() method
                portConflict: 'exit'    // Non-standard option; determines how to handle port conflicts:
                                        //   'random': use a different random port
                                        //   'disable': disable the web server if port is in use
                                        //   'exit': terminate process if port is in use
            },
            sauceLabs: {            // Options for SauceLabs API wrapper (npmjs.org/package/saucelabs)
            },
            sauceConnect: {         // Options for SauceLabs Connect (npmjs.org/package/sauce-connect-launcher)
                disable: false          // Non-standard option; used to disable sauce connect
            },
            selenium: {             // Options for Selenium Server (npmjs.org/package/selenium-standalone). Only used if you need Selenium running locally.
                args: [],               // options to pass to `java -jar selenium-server-standalone-X.XX.X.jar`
                portConflict: 'exit'    // Non-standard option; determines how to handle port conflicts:
                                        //   'disable': disable the web server if port is in use
                                        //   'exit': terminate process if port is in use
            }
        },
        options
    );

    this.options.webdriver.sauce.user = this.options.webdriver.sauce.user || this.options.sauceUsername;
    this.options.webdriver.sauce.key = this.options.webdriver.sauce.key || this.options.sauceAccessKey;

    if(!this.options.webdriver.sauce.user || !this.options.webdriver.sauce.key)
        this.options.webdriver = this.options.webdriver.local;
    else
        this.options.webdriver = this.options.webdriver.sauce;

    var webdriver = this.options.webdriver;

    if (webdriver.desiredCapabilities && webdriver.desiredCapabilities.constructor === Object)
        webdriver.desiredCapabilities = [webdriver.desiredCapabilities];

    var self = this;

    var allDesiredCapabilities = webdriver.desiredCapabilities;
    for (var i = 0, len = allDesiredCapabilities.length; i < len; i++)
    {
        webdriver.desiredCapabilities = allDesiredCapabilities[i];
        var browser = webdriverio.remote(webdriver);
        this.browsers.push(browser);

        browser._oldInit = browser.init;
        browser.init = function (complete) {
            self._initOnce(function (err) {
                try {
                    if (err)
                        return complete(err);
                    this._oldInit().then(function() { complete(); }, complete);
                } catch(e) {
                    self._doError(e);
                }
            }.bind(this));
        }.bind(browser);

        browser._oldEnd = browser.end;
        browser.end = function (complete) {
            this._oldEnd().then(function() {
                self.browsers.splice(self.browsers.indexOf(this), 1);
                if (self.browsers.length == 0)
                    self._stop(complete);
                else
                    complete();
            }.bind(this), complete);
        }.bind(browser);

        browser.passed = function(success, complete) {
            this.updateJob({ passed: success }, function() {
                this.end(complete);
            }.bind(this));
        }.bind(browser);

        browser.updateJob = function(data, complete) {
            if (self.sauceLabs)
                self.sauceLabs.updateJob(this.requestHandler.sessionID, data, complete);
            else
                complete();
        }.bind(browser);

        doEachBrowser.call(this, browser);
    }
};

extend(SeSauce.prototype, {

    /**
     * Performs one-time initialization. Calls 'complete' when done, passing in an error message if necessary.
     * @private
     */
    _initOnce: function (complete) {
        if (this._initialized)
            return complete();

        var self = this;
        this._initialized = true;

        this.webdriver = webdriverio;

        async.series(
            [
                function (cb) {
                    if (self.options.httpServer.disable)
                        cb();
                    else
                    {
                        function tryLaunchWithPort(port, cb)
                        {
                            self._log("Launching local web server (http://localhost:" + port + "/)...");

                            portscanner.checkPortStatus(port, 'localhost', function (err, status) {
                                if (status === 'open')
                                {
                                    var msg = "Port " + port + " is already open. ";
                                    switch(self.options.httpServer.portConflict)
                                    {
                                        case 'disable':
                                            self._log(msg + 'Skipping web server launch.');
                                            cb();
                                            break;

                                        case 'random':
                                            var min = 49152;
                                            var max = 65535;
                                            self.options.httpServer.port = Math.random() * (max - min) + min;
                                            self._log(msg + 'Trying port ' + self.options.httpServer.port + ' instead.');
                                            tryLaunchWithPort(self.options.httpServer.port, cb);
                                            break;

                                        case 'exit':
                                        default:
                                            self._doError(msg + 'Exiting now.', cb);
                                            break;
                                    }
                                }
                                else {
                                    self.httpServer = httpserver.createServer(self.options.httpServer);
                                    self.httpServer.listen(port, function () {
                                        self._log("Web server ready on port " + port + ".");
                                        cb();
                                    });
                                }
                            });
                        }

                        tryLaunchWithPort(self.options.httpServer.port, cb);
                    }
                },
                function (cb) {

                    // Initialize SauceLabs
                    self.options.sauceLabs.username = self.options.sauceLabs.username || self.options.sauceUsername;
                    self.options.sauceLabs.password = self.options.sauceLabs.password || self.options.sauceAccessKey;

                    if (self.options.sauceLabs.username && self.options.sauceLabs.password) {
                        self._log("Initializing SauceLabs API.");
                        self.sauceLabs = new SauceLabs({
                            username: self.options.sauceLabs.username,
                            password: self.options.sauceLabs.password
                        });
                    }

                    self.options.sauceConnect.username = self.options.sauceConnect.username || self.options.sauceUsername;
                    self.options.sauceConnect.accessKey = self.options.sauceConnect.accessKey || self.options.sauceAccessKey;

                    if (self.options.sauceConnect.username && self.options.sauceConnect.accessKey) {
                        if (self.options.sauceConnect.disable) {
                            self._log("Sauce Connect disabled.");
                            cb();
                        }
                        else {
                            self._log("Launching Sauce Connect...");
                            self._log("Username: " + self.options.sauceConnect.username);
                            self._log("Access Key: " + self.options.sauceConnect.accessKey.replace(/.(?=.{4,})/g, '*'));
                            delete self.options.sauceConnect.disable;
                            sauceConnectLauncher(self.options.sauceConnect, function (errmsg, process) {
                                if (errmsg) {
                                    if (process) process.close();
                                    return self._doError('Error launching Sauce Connect:\n' + errmsg, cb);
                                }
                                self.sauceConnect = process;
                                self._log("Sauce Connect ready.");
                                cb();
                            });
                        }
                    }
                    else {
                        self._log("Selenium Standalone: No SauceLabs username/accessKey. Launching locally...");

                        portscanner.checkPortStatus(self.options.webdriver.port, 'localhost', function (err, status) {
                            if (status === 'open') {
                                var msg = "Selenium Standalone: Port " + self.options.webdriver.port + " is already open. ";
                                switch(self.options.selenium.portConflict)
                                {
                                    case 'disable':
                                        self._log(msg + 'Skipping launch.');
                                        cb();
                                        break;

                                    case 'exit':
                                    default:
                                        self._doError(msg + 'Exiting now.', cb);
                                        break;
                                }
                            }
                            else {
                                selenium.install({
                                    logger: function(message) {
                                    }
                                }, function(err) {
                                    if(err)
                                        return self._doError("Selenium Standalone: installation error: " + err, cb);

                                    selenium.start({ seleniumArgs: self.options.selenium.args }, function(err, child) {
                                        self.selenium = child;
                                        if(err)
                                            self._doError("Selenium Standalone: startup error: " + typeof(err) + err, cb);
                                        else
                                        {
                                            self._log("Selenium Standalone: launched.");
                                            cb();
                                        }
                                    });
                                });
                            }
                        });
                    }
                }
            ],
            complete
        );
    },
    /**
     * Logs an error message, stops all services, and then calls the 'complete' callback, passing in the error message.
     * @private
     */
    _doError: function (msg, complete) {
        this._err(msg);
        this._stop(function () {
            if (complete)
                complete(msg);
        });
    },


    /**
     * @private
     */
    _stop: function (complete) {
        if (this._stopped)
            return complete && complete();

        this._stopped = true;
        var self = this;

        if (this.httpServer) {
            this.httpServer.close();
            this._log("Web server stopped.");
        }

        async.parallel([
            function(cb) {
                if (self.selenium) {
                    self.selenium.on('close', function() {
                        self._log("Local Selenium server stopped.");
                        cb();
                    });
                    self.selenium.kill();
                }
                else cb();
            },
            function(cb) {
                if (self.sauceConnect) {
                    self._log("Closing Sauce Connect...");
                    self.sauceConnect.close(function () {
                        self._log("Sauce Connect closed.");
                        cb();
                    });
                }
                else cb();
            }
        ], complete);
    },

    _log: function(str) {
        if(!this.options.quiet)
            console.log('Se-Sauce: '.blue + str);
    },

    _err: function(str) {
        console.error('Se-Sauce: '.bgRed + str);
    }
});

module.exports = SeSauce;
