
module.exports = {
    quiet: false,           // Silences the console output
    webdriver: {            // Options for selenium webdriver (webdriverio)
        sauce: {
            desiredCapabilities: [{
                browserName: 'chrome',
                version: '27',
                platform: 'XP',
                tags: ['examples'],
                name: 'This is an example test'
            }, {
                browserName: 'firefox',
                version: '33',
                platform: 'XP',
                tags: ['examples'],
                name: 'This is an example test'
            }]
        },
        local: {
            desiredCapabilities: [
                { browserName: 'chrome' },
                { browserName: 'firefox' }
            ]
        }
    },
    httpServer: {           // Options for local http server (npmjs.org/package/http-server)
        disable: false,         // Non-standard option; used to skip launching the http server
        port: 8080              // Non-standard option; it is passed into the httpServer.listen() method
    },
    sauceLabs: {            // Options for SauceLabs API wrapper (npmjs.org/package/saucelabs)
    },
    sauceConnect: {         // Options for SauceLabs Connect (npmjs.org/package/sauce-connect-launcher)
        disable: false,         // Non-standard option; used to disable sauce connect
    },
    selenium: {             // Options for Selenium Server (npmjs.org/package/selenium-standalone). Only used if you need Selenium running locally.
        args: []                // options to pass to `java -jar selenium-server-standalone-X.XX.X.jar`
    }
};
