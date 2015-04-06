'use strict';

var csv = require('csv'),
    utils = require('./utils'),
    hmdaRuleSpec = require('hmda-rule-spec'),
    _ = require('underscore');

var errorsTransformerIndividual = function() {
    var transformer = csv.transform(function(errors) {
        _.each(_.keys(errors), function(id) {
            var firstError = errors[id].errors[0];
            var errorProps = _.keys(firstError.properties);
            var header = ['Edit ID', 'Line Number'];

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
                var specBody = utils.resolveArg(property, contextList);
                header.push(specBody.label);
            }.bind(this));

            this.stringifier.write(header);

            _.each(errors[id].errors, function(error) {
                var line = [id, error.lineNumber];
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

    return transformer;
};

var errorsTransformerAll = function() {
    var transformer = csv.transform(function(errors) {
        _.each(_.keys(errors), function(id) {
            var firstError = errors[id].errors[0];
            var header = ['Edit ID', 'Line Number'];
            if (firstError.loanNumber || firstError.properties.loanNumber) {
                header.push('Loan/Application Number');
            }
            this.stringifier.write(header);

            _.each(errors[id].errors, function(error) {
                var line = [id, error.lineNumber];
                if (error.loanNumber || error.properties.loanNumber) {
                    line.push(error.loanNumber || error.properties.loanNumber);
                }
                this.stringifier.write(line);
            }.bind(this));
            this.stringifier.write([]);
        }.bind(this));
    }.bind(this));

    return transformer;
};

var CSVProcessor = function(year, writeStream, type) {
    this.fileSpec = {'hmdaFile': hmdaRuleSpec.getFileSpec(year)};

    this.stringifier = csv.stringify();
    this.stringifier.pipe(writeStream);

    if (type === 'all') {
        this.transformer = errorsTransformerAll.apply(this);
    }
    if (type === 'individual') {
        this.transformer = errorsTransformerIndividual.apply(this);
    }

    this.transformer.on('finish', function() {
        this.stringifier.end();
    }.bind(this));

    return this.transformer;
};

module.exports = CSVProcessor;