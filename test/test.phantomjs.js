
var SeSauce;
try { SeSauce = require('../inst/selenium-sauce'); }
catch (e) { SeSauce = require('../lib/selenium-sauce'); }

var portscanner = require('portscanner'),
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
        root: __dirname,
        port: 52985
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
                if (err) return done(err);
                browser.url('http://localhost:52985/test.html').then(function() { done(); }, done);
            });
        });

        // Test that the browser title is correct.
        it('should have the correct value', function(done) {
            browser.getTitle().then(function(title) {
                title.should.be.exactly('This is test.html!');
                done();
            }, function(err) {
                done(err.message);
            });
        });

        // After all tests are done, update the SauceLabs job with the test status,
        // and close the browser.
        after(function(done) {
            var tests = this.test.parent.tests;
            for(var i = 0, limit = tests.length; i < limit; i++)
            {
                if (tests[i].state === "failed")
                {
                    browser.passed(false, done);
                    return;
                }
            }
            browser.passed(true, done);
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
            browser.init(done);
        });

        // Test that the browser title is correct.
        it('should not create port conflict (server has not launched)', function(done) {
            portscanner.checkPortStatus(8123, 'localhost', function (err, status) {
                status.should.be.exactly('closed');
                done(err);
            });
        });

        // After all tests are done, update the SauceLabs job with the test status,
        // and close the browser.
        after(function(done) {
            browser.end(done);
        });

    });

});
