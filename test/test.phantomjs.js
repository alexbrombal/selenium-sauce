var SeSauce = require('../inst/selenium-sauce'),
    portscanner = require('portscanner'),
    should = require('./lib/should');

describe('Empty config', function() {
    this.timeout(120000);

    it('should not invoke callback', function () {

        var called = false;
        new SeSauce(null, function (browser) {
            called = true;
        });

        called.should.be.false;
    });
});



new SeSauce({
    sauceUsername: '',
    sauceAccessKey: '',
    webdriver: {
        local: {
            desiredCapabilities: [ { browserName: 'chrome' }, { browserName: 'phantomjs' } ]
        }
    },
    httpServer: {
        root: __dirname
    }
}, function(browser) {

    // Since this test suite is run once for each browser, we'll output the
    // browser name in the test suite description.
    describe(browser.desiredCapabilities.browserName + ': title', function() {

        this.timeout(120000);

        // Before any tests run, initialize the browser and load the test page.
        // Then call `done()` when finished.
        before(function(done) {
            browser.init(function(err) {
                if(err) throw err;
                browser.url('http://localhost:8080/test.html', done);
            });
        });

        // Test that the browser title is correct.
        it('should have the correct value', function(done) {
            browser.getTitle(function(err, title) {
                title.should.be.exactly('This is test.html!');
                done();
            });
        });

        // After all tests are done, update the SauceLabs job with the test status,
        // and close the browser.
        after(function(done) {
            browser.passed(this.currentTest.state === 'passed', done);
        });

    });

});


new SeSauce({
    sauceUsername: '',
    sauceAccessKey: '',
    webdriver: {
        local: {
            desiredCapabilities: { browserName: 'phantomjs' }
        }
    },
    httpServer: {
        disable: true,
        port: 8123,
        root: __dirname
    }
}, function(browser) {

    // Since this test suite is run once for each browser, we'll output the
    // browser name in the test suite description.
    describe('Disabled HttpServer', function() {

        this.timeout(120000);

        // Before any tests run, initialize the browser and load the test page.
        // Then call `done()` when finished.
        before(function(done) {
            browser.init(function(err) {
                if(err) throw err;
                done();
            });
        });

        // Test that the browser title is correct.
        it('should not create port conflict (server has not launched)', function(done) {
            portscanner.checkPortStatus(8123, 'localhost', function (err, status) {
                status.should.be.exactly('closed');
                done();
            });
        });

        // After all tests are done, update the SauceLabs job with the test status,
        // and close the browser.
        after(function(done) {
            browser.end(done);
        });

    });

});
