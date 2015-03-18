# HMDA Rule Engine

## This project is a work in progress
Nothing presented in the issues or in this repo is a final product unless it is marked as such.

**Description**:  The HMDA Rule Engine processes the [HMDA Edits](http://www.ffiec.gov/hmda/edits.htm) as defined by the FFIEC. It requires as input a valid [HMDA data file](http://www.ffiec.gov/hmda/fileformats.htm). The engine understands edit rules written in the [brij-spec](https://github.com/linuxbozo/brij-spec) standard, currently defined in [hmda-rule-spec](https://github.com/cfpb/hmda-rule-spec).

[![Build Status](https://travis-ci.org/cfpb/hmda-rule-engine.svg)](https://travis-ci.org/cfpb/hmda-rule-engine)
[![Coverage Status](https://coveralls.io/repos/cfpb/hmda-rule-engine/badge.svg)](https://coveralls.io/r/cfpb/hmda-rule-engine)

## Requirements

The project requires [NodeJS](http://nodejs.org) (npm) to build and manage dependencies.

It also depends on [hmda-edit-check-api](https://github.com/cfpb/hmda-edit-check-api) for data lookup.

## How to get this running or how to use it

### Installation Steps

Make sure you have [NodeJS](https://nodejs.org) installed (version 0.10.x), and you can use the `npm` command:

```shell
npm version
```

Install [Grunt](http://gruntjs.com) globally:

```shell
npm install -g grunt-cli
```

Then install dependencies from the project root directory:

```shell
npm install
```

Make sure you have a running instance of the [API](https://github.com/cfpb/hmda-edit-check-api)

### Basic usage

This is a simple example of how to use the engine in your project. More detailed information about how to use the engine can be obtained in the [interface documentation](#interface-documentation) below.

Install the engine:
```shell
npm install --save cfpb/hmda-rule-engine#master
```

Include the engine in your code:

```javascript
// Require the engine
var engine = require('hmda-rule-engine'),
// Require fs to produce a Stream from your data file
    fs = require('fs'),
// Set the year you are using for the edits
    year = '2013';

// Set the URL used to access your instance of the API
engine.setAPIURL('http://localhost:8000');

// Create a stream for your input HMDA DAT file
var fileStream = fs.createReadStream('/path/to/file.dat');

// Handle the error if something went wrong
fileStream.on('error', function(err) {
    console.error('File does not exist');
    process.exit(1);
});

// Convert the stream to a JSON object for the year
engine.fileToJson(fileStream, year, function(fileErr) {
    // Handle the error if something went wrong in parsing
    if (fileErr) {
        console.log(fileErr);
    } else {
        // Run a particular type of edit for the selected year
        engine.runSyntactical(year)
        .then(function() {
            // When it's done, do something with the result
            var errors = engine.getErrors();
            console.log(JSON.stringify(errors, null, 2));
        });
    }
});
```

## Testing

### Unit Tests

To run the unit tests, use the grunt task:
```shell
grunt test
```

When complete, you will see the results of the tests (pass/fail) as well as a text summary of the code coverage if there are no failures:
```
  255 passing (775ms)

...

=============================== Coverage summary ===============================
Statements   : 95.77% ( 883/922 )
Branches     : 89.6% ( 379/423 )
Functions    : 96.02% ( 217/226 )
Lines        : 95.77% ( 883/922 )
================================================================================
```

You can view the full details of this coverage in a drill-down enabled report by opening `coverage/lcov-report/index.html` in your browser.

If you are on a Mac, you can use a grunt task to run the tests and automatically open the coverage report in your browser:
```shell
grunt coverage
```


## Interface Documentation

Documentation of this project is maintained inline with the source code using [JSDoc](http://usejsdoc.org/) style code comments.

To generate the documentation, run the grunt task:
```shell
grunt generate-docs
```

You can now open `./docs/index.html` in your browser to view the documentation.

If you are on a Mac, you can use a grunt task to generate the documentation and automatically open them in your browser:
```shell
grunt view-docs
```

## Getting involved

For details on how to get involved, please first read our [CONTRIBUTING](CONTRIBUTING.md) guidelines.
This project follows an adapted pull request [workflow](https://github.com/cfpb/hmda-pilot/wiki/GitHub-workflow) on top of GitHub, please consult the details before adding features to the project.


----

## Open source licensing info
1. [TERMS](TERMS.md)
2. [LICENSE](LICENSE)
3. [CFPB Source Code Policy](https://github.com/cfpb/source-code-policy/)
