Selenium Sauce
==============

[ ![Codeship Status for alexbrombal/selenium-sauce](https://codeship.com/projects/f911c670-503c-0132-33dc-66df49ff6485/status)](https://codeship.com/projects/47985)

[![Coverage Status](https://img.shields.io/coveralls/alexbrombal/selenium-sauce.svg)](https://coveralls.io/r/alexbrombal/selenium-sauce?branch=master)
[![Codeship](http://img.shields.io/codeship/f911c670-503c-0132-33dc-66df49ff6485.svg)](https://codeship.com/projects/47985)
[![Dependencies](http://img.shields.io/david/alexbrombal/selenium-sauce.svg)](https://david-dm.org/alexbrombal/selenium-sauce)
[![Dev Dependencies](http://img.shields.io/david/dev/alexbrombal/selenium-sauce.svg)](https://david-dm.org/alexbrombal/selenium-sauce#info=devDependencies&view=table)

Easily run your Selenium tests on SauceLabs using Node.js.

http://npmjs.org/package/selenium-sauce

## Quick Start

Install & add environment variables:

```bash
$ npm install selenium-sauce
$ export SAUCE_USERNAME=******
$ export SAUCE_ACCESS_KEY=******
```

Create a test:

`test.js`:

```javascript

var SeSauce = require('selenium-sauce');

// Loads the config file and invokes the callback once for each browser
new SeSauce(
    {   // Configuration options
        webdriver: {            // Options for Selenium WebDriver (WebdriverIO)
            sauce: {
                desiredCapabilities: [{
                    browserName: 'chrome',
                    version: '27',
                    platform: 'XP',
                    tags: ['examples'],
                    name: 'This is an example test'
                }]
            },
            local: {
                desiredCapabilities: [{
                    browserName: 'phantomjs'
                }]
            }
        },
        httpServer: {           // Options for local http server (npmjs.org/package/http-server)
            port: 8080
        }
    },
    function(browser) {
        // Initialize the browser
        browser.init(function(err) {
            if(err) throw err;

            // Load a url into the browser
            browser.url('http://localhost:8080/test.html', function() {

                // Tell SauceLabs that the test was successful
                browser.passed(true, myCompletionCallback);
            });
        });
    }
);

```

Run:

```bash
$ node test.js
```


## About

This Node.js utility is a wrapper API around a set of technologies that run Selenium tests on SauceLabs. In addition, the tests will run locally if SauceLabs info is not provided.

Running Selenium tests on SauceLabs is not incredibly difficult, but there are a lot of moving parts:

- SauceLabs has an API for managing jobs and running browsers
- SauceLabs' instances function as Selenium servers with their own set of APIs
- Browsers on SauceLabs need access to load webpages from the same machine running the tests, which is done using Sauce Connect to establish a private network tunnel. 

On top of that, developing and testing locally requires a local Selenium server, and the SauceLabs features listed above need to be bypassed for that.

**Selenium Sauce** provides a simple API that encapsulates all of these features, by reusing existing tools and orchestrating their functionality.
Each of these utilities are transparently exposed through the Selenium Sauce interface and you can work directly with them.
The configuration file values are passed directly into each respective utility (with the exceptions clearly marked here in the documentation and example files).
See the list of [Components](#Components) below for more information on the tools that Selenium Sauce comprises.


---

### What Selenium Sauce is *not*

Selenium Sauce is not a unit test runner or framework. It *is* meant to be used in conjunction with one, however. Selenium Sauce simply provides an easy way for your tests to connect to Sauce Labs and perform actions&mdash;it is up to you to determine whether the actions were successful, and pass or fail your tests accordingly.

See the [examples](https://github.com/alexbrombal/selenium-sauce/tree/master/examples) for a sample of how to use this with a unit test utility.




## Usage

As mentioned in the quick start, you need to install this package with npm. This is not a command-line utility, but rather a programmatic interface that you use in your unit test or other Node.js files.

```bash
$ npm install selenium-sauce
```

`require()`ing this module in your JavaScript file will return a constructor that you can use to initialize Selenium Sauce instances.

```javascript
var SeSauce = require('selenium-sauce');
```

The constructor accepts two parameters: a configuration object, and a callback method that is invoked once for each browser.

The configuration object is mostly just a collection of other configuration objects used to initialize the various components that Selenium Sauce comprises. All of the objects are passed as-is to their respective components, with the [exceptions noted below](#Configuration).

The second parameter is the callback method which is executed once for each browser that you configure in the `webdriver.desiredCapabilities` configuration object. If you are creating unit tests, for example, you would define your test fixtures within this callback so that they run once in each browser.

```javascript
new SeSauce(
	{
	    /* ... configuration object ... */
    },
	function(browser) {
		// function executes once for each browser
	}
);
```

The `browser` object that is passed into the callback is the return value of [WebdriverIO](#WebdriverIO)'s `webdriverio.remote()` method. It provides all the Selenium API calls that are documented on the [WebdriverIO website](http://webdriver.io), with some slight modifications:

- The `browser.init()` method is slightly modified to allow Selenium Sauce to initialize the first time it is called. You don't need to change anything about how you call it, but you **must** call this method to begin making Selenium API calls.
- The `browser.end()` method is also slightly modified to allow Selenium Sauce to shut down properly when all browsers have been ended. Again, you don't need to do anything differently, but you **must** call this method when you are finished with the browser in order to properly shut down the various services that are running.
- A new method `browser.updateJob(data, onComplete)` has been added to the browser object. It is simply a wrapper for [SauceLabs](#SauceLabs) updateJob method. It reports data to SauceLabs about the current job, but only if SauceLabs is configured. `data` is an object as described [on SauceLabs API documentation](#https://docs.saucelabs.com/reference/test-configuration/#job-annotation). `onComplete` is executed when the call is finished.
- A new method `browser.passed(passed, onComplete)` has been added to the browser object. It is another wrapper around SauceLabs updateJob method, simply allowing you to report the pass/fail result of the test to SauceLabs. `passed` is a boolean indicating pass (true) or fail (false), and the `onComplete` callback is executed when the reporting process is complete. **`browser.passed` automatically calls `end()` when it finishes, so you must not call both `passed()` and `end()`.**

Within the browser callback method, `this` refers to the Selenium Sauce instance. Through this instance, you can access the following properties:

- `this.webdriver` - The wrapper around the Selenium WebDriver protocol. You probably won't need to use this object directly, but instead use the browser object that is passed to the "each browser" callback.
- `this.sauceLabs` - The wrapper around the Sauce Labs REST API.
- `this.httpServer` - The instance of [http-server](#HttpServer) that is started by SauceLabs in order for Sauce Connect to load pages on your local machine.
- `this.sauceConnect` - The Sauce Connect [child process object](http://nodejs.org/api/process.html).
- `this.selenium` - This is the Selenium Standalone [child process object](http://nodejs.org/api/process.html).


### Configuration

The first parameter to the `SeSauce` constructor is the configuration object. Each property of this configuration object is passed as-is to its respective component (with the exceptions noted here). For details about each component's configuration sub-object, see the provided link to the documentation.

`{`

- `quiet:` - If true, tells Selenium Sauce to silence its console output.

- `sauceUsername` - The username for SauceLabs. Defaults to `process.env.SAUCE_USERNAME`. This value is used to populate `webdriver.sauce.user`, `sauceLabs.username`, and `sauceConnect.username`; however, you may override those values individually if desired.

- `sauceAccessKey` - The access key for SauceLabs. Defaults to `process.env.SAUCE_ACCESS_KEY`. This value is used to populate `webdriver.sauce.key`, `sauceLabs.password`, and `sauceConnect.accessKey`; however, you may override those values individually if desired.

- `webdriver:` - Options for [WebdriverIO](#webdriverio). This object has two properties, `sauce` and `local`, which are used to connect to SauceLabs or a local Selenium instance, respectively.

  - `sauce:` - This object is passed directly to WebdriverIO *only if* the `user` and `key` properties are valid.

    - `user:` - The username for SauceLabs. Defaults to the value of `sauceUsername` (i.e. you do not have to specify this if you already specified `sauceUsername`).

    - `key:` - The access key for SauceLabs. Defaults to the value of `sauceAccessKey` (i.e. you do not have to specify this if you already specified `sauceAccessKey`).

    - `desiredCapabilities:` - *Non-standard option:* an array of desired browser capabilities. This differs from the standard option in that it is an array of browser capabilities rather than a single instance.

  - `local:` - These options are passed directly to WebdriverIO if the user/key information above is empty.

    - `desiredCapabilities:` - Same as above. Allows you to specify different browser capabilities when running Selenium locally.

- `httpServer:` - Options for [HttpServer](#httpserver). These options are passed directly into `httpserver.createServer()`.   

  - `port` - *Non-standard option:* passed into HttpServer's `listen` function as the port on which to listen.

- `sauceLabs:` - Options for [SauceLabs](#saucelabs). These options are passed directly into the `SauceLabs()` constructor.

- `sauceConnect:` - Options for [Sauce Connect Launcher](#sauce-connect-launcher). These options are passed directly into the `SauceConnectLauncher()` constructor.

- `selenium:` - Options for [Selenium Standalone](#selenium-standalone).

  - `args:` - Array of strings. Passed as the second argument to the `selenium()` constructor (which are subsequently passed as the command-line arguments to `java -jar selenium-server-standalone-X.XX.X.jar`)

`}`




## Components

Selenium Sauce comprises a set of tools that are made transparently available through properties of the Selenium Sauce object. You may use these objects just as you would use the original tools, so take a look at each component's original documentation for details.

- #### WebdriverIO 
  
  http://webdriver.io/

  `this.webdriver`

  This is the API wrapper around the Selenium WebDriver protocol. You probably don't want to use this object directly, but instead use the `browser` object that is passed to the `doEachBrowser` callback.

- #### SauceLabs

  https://github.com/holidayextras/node-saucelabs

  `this.sauceLabs`

  SauceLabs has their own set of APIs (independent of Selenium) that allow you to query for job IDs or update jobs. Selenium Sauce does not actually use these APIs, but provides it to you for convenience&mdash;for example, to set the current job's pass/fail status. You're welcome!

- #### HttpServer
 
  https://github.com/nodeapps/http-server

  `this.httpServer`

  It's possible the tests you want to run are in HTML files that only exist on your machine, and not on a publicly-accessible web server. HttpServer is a simple, minimal configuration web server that runs on your local machine to provide browsers access to these test web pages.

- #### Sauce Connect Launcher

  https://github.com/bermi/sauce-connect-launcher

  `this.sauceConnect`

  SauceLabs provides a secure tunnel (called Sauce Connect) between itself and your machine so that SauceLabs' browsers can load webpages that reside on your local machine. This is a Node.js wrapper around the Sauce Connect client.

- #### Selenium Standalone

  https://github.com/vvo/selenium-standalone

  `this.selenium`

  Runs a Selenium Server on your local machine. This is useful for development and is only used if SauceLabs is disabled.



## Examples

Selenium Sauce is not a unit test runner and has no dependencies on a specific unit test framework, but functions best in conjunction with one. Check out the examples using real test frameworks in the [/examples](https://github.com/alexbrombal/selenium-sauce/tree/master/examples) directory (see the README file there for information on how to run the tests).
