var SeSauce = require('../inst/selenium-sauce'),
    should = require('./lib/should'),
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
        root: __dirname
    }
}, function(browser) {

    describe("Error tests: ", function() {

        this.timeout(120000);

        var server;

        it('Selenium web driver should fail if port is open', function(done) {

            // Start a web server on 4444 so that selenium can't start
            server = httpServer.createServer();
            server.listen(4444);

            browser.init(function(err) {
                err.should.be.exactly('Selenium Standalone: Port 4444 is already open. Exiting now.');
                done();
            });
        });

        after(function(done) {
            server.close();
            portscanner.checkPortStatus(4444, 'localhost', function (err, status) {
                status.should.be.exactly('closed');
                browser.end(done);
            });
        });

    });

});
