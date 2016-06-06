
var SeSauce;
try { SeSauce = require('../inst/selenium-sauce'); }
catch (e) { SeSauce = require('../lib/selenium-sauce'); }

var should = require('./lib/should'),
    httpServer = require('http-server'),
    portscanner = require('portscanner');

new SeSauce({
    quiet: false,
    sauceUsername: '',
    sauceAccesskey: '',
    webdriver: {
        local: {
            desiredCapabilities: { browserName: 'phantomjs' }
        }
    },
    httpServer: {
        root: __dirname,
        port: 52985
    }
}, function(browser) {

    describe("Error tests: ", function() {

        this.timeout(120000);

        var server;

        it('Selenium web driver should fail if port is open', function(done) {

            // Start a web server on 4444 so that selenium can't start
            server = httpServer.createServer();
            server.listen(52985);

            browser.init(function(err) {
                err.should.not.be.undefined;
                done();
            });

        });

        after(function(done) {
            server.server.close(function() {
                portscanner.checkPortStatus(52985, 'localhost', function (err, status) {
                    status.should.be.exactly('closed');
                    browser.end(done);
                });
            });
        });

    });

});
