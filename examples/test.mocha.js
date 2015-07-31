var SeSauce = require('../lib/selenium-sauce'),
    should = require('./should');

var config = require('./se-sauce.config');

// Create one parent test suite, simply so we can set the timeout value.
// You could also set this in the mocha command line arguments.
describe('Selenium:', function() {

    this.timeout(120000);

    // Initialize Selenium Sauce using the configuration file. The callback function will be invoked
    // once for each browser in the config.webdriver.desiredCapabilities array.
    new SeSauce(config, function(browser) {

        var se = this;

        // Before any tests run, initialize the browser and load the test page.
        // Then call `done()` when finished.
        before(function(done) {
            browser.init(function(err) {
                if(err) throw err;
                browser.url('http://localhost:8080/test.html', done);
            });
        });

        // Test that the browser title is correct.
        // Since this test suite is run once for each browser, we'll output the
        // browser name in the test suite description.
        describe(browser.desiredCapabilities.browserName + ': title', function() {

            it('should have the correct value', function(done) {
                browser.getTitle(function(err, title) {
                    title.should.be.exactly('This is test.html!');
                    done();
                });
            });

        });

        // After all tests are done, update the SauceLabs job with the test status,
        // and close the browser.
        after(function(done) {
            browser.passed(this.currentTest.state === 'passed', done);
        });

    });

});