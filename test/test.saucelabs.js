var SeSauce = require('../inst/selenium-sauce'),
    should = require('./lib/should');

if(!process.env.SAUCE_USERNAME || !process.env.SAUCE_ACCESS_KEY)
    return;

new SeSauce({
    quiet: false,
    webdriver: {
        host: 'ondemand.saucelabs.com',
        port: 80,
        user: process.env.SAUCE_USERNAME,
        key: process.env.SAUCE_ACCESS_KEY,
        logLevel: 'silent',
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
    },
    httpServer: {
        disable: false,
        port: 8081,
        root: __dirname
    },
    sauceLabs: {
        username: process.env.SAUCE_USERNAME,
        password: process.env.SAUCE_ACCESS_KEY
    },
    sauceConnect: {
        disable: false,
        username: process.env.SAUCE_USERNAME,
        accessKey: process.env.SAUCE_ACCESS_KEY
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
                browser.url('http://localhost:8081/test.html', done);
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
            // This is a roundabout way of doing it, but allows us to test both browser.updateJob and browser.passed.
            browser.updateJob({
                build: process.env.CI_BUILD_NUMBER
            }, function() {
                browser.passed(this.currentTest.state === 'passed', done);
            });
        });

    });

});
