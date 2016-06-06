
var SeSauce;
try { SeSauce = require('../inst/selenium-sauce'); }
catch (e) { SeSauce = require('../lib/selenium-sauce'); }

var should = require('./lib/should');

if(!process.env.SAUCE_USERNAME || !process.env.SAUCE_ACCESS_KEY)
    return;

new SeSauce({
    quiet: false,
    webdriver: {
        sauce: {
            desiredCapabilities: [{
                browserName: 'chrome',
                version: '27',
                platform: 'XP',
                tags: ['selenium sauce'],
                name: 'Selenium Sauce unit test'
            }, {
                browserName: 'firefox',
                version: '33',
                platform: 'XP',
                tags: ['selenium sauce'],
                name: 'Selenium Sauce unit test'
            }]
        }
    },
    httpServer: {
        disable: false,
        port: 8081,
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
                browser.url('http://localhost:8081/test.html').then(function() { done(); }, done);
            });
        });

        // Test that the browser title is correct.
        it('should have the correct value', function(done) {
            browser.getTitle().then(function(title) {
                title.should.be.exactly('This is test.html!');
                done();
            }, done);
        });

        // After all tests are done, update the SauceLabs job with the test status,
        // and close the browser.
        after(function(done) {
            var tests = this.test.parent.tests;
            // This is a roundabout way of doing it, but allows us to test both browser.updateJob and browser.passed.
            browser.updateJob({
                build: process.env.CI_BUILD_NUMBER
            }, function() {
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

});
