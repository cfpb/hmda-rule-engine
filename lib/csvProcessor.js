'use strict';

var csv = require('csv'),
    utils = require('./utils'),
    hmdaRuleSpec = require('hmda-rule-spec'),
    _ = require('underscore');

/**
 * Construct a new CSVProcessor and return its csv transformer and stringifier
 * @param {string} year         The year for the errors being exported
 * @param {object} writeStream  Handle to a {@link https://nodejs.org/api/stream.html#stream_class_stream_writable_1|stream.Writable} instance
 * @param {string} type         Processor type. Valid values: 'type', 'individual'
 * @return {object}             The {@link http://csv.adaltas.com/transform/|csv.transform} instance of the processor to write to
 * @constructs CSVProcessor
 * @example
 * var writeStream = fs.createWriteStream('example.csv');
 * var processor = new CSVProcessor('2013', writeStream, 'all');
 * processor.write(engine.getErrors().syntactical);
 * //Edit ID,Line Number,Loan Number
 * //S270,2,ABCDEFG
 * //...
 * processor.end();     //Close the write stream, any further calls to the processor will result in an error
 */
var CSVProcessor = function(year, type) {
    this.fileSpec = {'hmdaFile': hmdaRuleSpec.getFileSpec(year)};
    this.stringifier = csv.stringify();

    this[type]();

    this.transformer.on('finish', function() {
        this.stringifier.end();
    }.bind(this));

    this.write = function(input) {
        this.transformer.write(input);
    };
};

CSVProcessor.prototype.type = function() {
    this.transformer = csv.transform(function(errors) {
        _.each(_.keys(errors), function(id) {
            var firstError = errors[id].errors[0];
            var header = ['Edit ID'];
            if (firstError.lineNumber) {
                header.push('Line Number');
            }
            if (firstError.loanNumber || firstError.properties.loanNumber) {
                header.push('Loan/Application Number');
            }

            this.stringifier.write(header);

            _.each(errors[id].errors, function(error) {
                var line = [id];
                if (error.lineNumber) {
                    line.push(error.lineNumber);
                }
                if (error.loanNumber || error.properties.loanNumber) {
                    line.push(error.loanNumber || error.properties.loanNumber);
                }
                this.stringifier.write(line);
            }.bind(this));

            this.stringifier.write([]);

        }.bind(this));
    }.bind(this));
};

CSVProcessor.prototype.individual = function() {
    this.transformer = csv.transform(function(errors) {
        _.each(_.keys(errors), function(id) {
            var firstError = errors[id].errors[0];
            var errorProps = _.keys(firstError.properties);
            var header = ['Edit ID'];

            if (firstError.lineNumber) {
                header.push('Line Number');
            }
            if (firstError.loanNumber) {
                header.push('Loan/Application Number');
            }

            _.each(errorProps, function(property) {
                var contextList = [];
                if (errors[id].scope === 'ts') {
                    contextList.push(this.fileSpec.hmdaFile.transmittalSheet);
                }
                if (errors[id].scope === 'lar') {
                    contextList.push(this.fileSpec.hmdaFile.loanApplicationRegister);
                }
                contextList.push(this.fileSpec);
                if (errors[id].scope === 'hmda') {
                    contextList.push(this.fileSpec.hmdaFile.transmittalSheet);
                    contextList.push(this.fileSpec.hmdaFile.loanApplicationRegister);
                }
                try {
                    var specBody = utils.resolveArg(property, contextList);
                    header.push(specBody.label);
                } catch (err) {
                    header.push(property);
                }
            }.bind(this));

            this.stringifier.write(header);

            _.each(errors[id].errors, function(error) {
                var line = [id];
                if (error.lineNumber) {
                    line.push(error.lineNumber);
                }
                if (error.loanNumber) {
                    line.push(error.loanNumber);
                }

                _.each(errorProps, function(property) {
                    line.push(error.properties[property]);
                });

                this.stringifier.write(line);
            }.bind(this));

            this.stringifier.write([]);

        }.bind(this));
    }.bind(this));
};

module.exports = CSVProcessor;