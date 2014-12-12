'use strict';

var validator = require('../../lib/filespecvalidator');
var OK_FILE_SPEC = require('../testdata/2013_file_spec');

describe('lib/filespecvalidator', function() {

    describe('validate', function() {
        it('should return null when no errors', function(done) {
            var result = validator.validate(OK_FILE_SPEC);
            expect(result).to.be.null();
            done();
        });

        it('should return error when missing transmittalSheet property', function(done) {
            var tmpFileSpec = {metadata: {}, loanApplicationRegister: {}};
            var result = validator.validate(tmpFileSpec);
            expect(result).to.be('Missing required definition for transmittalSheet in file specification');
            done();
        });

        it('should return error when missing loanApplicationRegister property', function(done) {
            var tmpFileSpec = {metadata: {}, transmittalSheet: {}};
            var result = validator.validate(tmpFileSpec);
            expect(result).to.be('Missing required definition for loanApplicationRegister in file specification');
            done();
        });

        it('should return error when missing start property for transmittalSheet field', function(done) {
            var tmpFileSpec = {
                metadata: {},
                transmittalSheet: {
                    foo: {
                        end: 1,
                        dataType: 'N'
                    }
                },
                loanApplicationRegister: {
                    bar: {
                        start: 1,
                        end: 1,
                        dataType: 'N'
                    }
                }
            };
            var result = validator.validate(tmpFileSpec);
            expect(result).to.be('Field "foo" in transmittalSheet missing required "start" property');
            done();
        });

        it('should return error when missing end property for transmittalSheet field', function(done) {
            var tmpFileSpec = {
                metadata: {},
                transmittalSheet: {
                    foo: {
                        start: 1,
                        dataType: 'N'
                    }
                },
                loanApplicationRegister: {
                    bar: {
                        start: 1,
                        end: 1,
                        dataType: 'N'
                    }
                }
            };
            var result = validator.validate(tmpFileSpec);
            expect(result).to.be('Field "foo" in transmittalSheet missing required "end" property');
            done();
        });

        it('should return error when missing start property for loanApplicationRegister field', function(done) {
            var tmpFileSpec = {
                metadata: {},
                transmittalSheet: {
                    foo: {
                        start: 1,
                        end: 1,
                        dataType: 'N'
                    }
                },
                loanApplicationRegister: {
                    bar: {
                        end: 1,
                        dataType: 'N'
                    }
                }
            };
            var result = validator.validate(tmpFileSpec);
            expect(result).to.be('Field "bar" in loanApplicationRegister missing required "start" property');
            done();
        });

        it('should return error when missing end property for loanApplicationRegister field', function(done) {
            var tmpFileSpec = {
                metadata: {},
                transmittalSheet: {
                    foo: {
                        start: 1,
                        end: 1,
                        dataType: 'N'
                    }
                },
                loanApplicationRegister: {
                    bar: {
                        start: 1,
                        dataType: 'N'
                    }
                }
            };
            var result = validator.validate(tmpFileSpec);
            expect(result).to.be('Field "bar" in loanApplicationRegister missing required "end" property');
            done();
        });

        it('should return error when missing dataType property for transmittalSheet field', function(done) {
            var tmpFileSpec = {
                metadata: {},
                transmittalSheet: {
                    foo: {
                        start: 1,
                        end: 1
                    }
                },
                loanApplicationRegister: {
                    bar: {
                        start: 1,
                        end: 1,
                        dataType: 'N'
                    }
                }
            };
            var result = validator.validate(tmpFileSpec);
            expect(result).to.be('Field "foo" in transmittalSheet missing required "dataType" property');
            done();
        });

        it('should return error when missing dataType property for loanApplicationRegister field', function(done) {
            var tmpFileSpec = {
                metadata: {},
                transmittalSheet: {
                    foo: {
                        start: 1,
                        end: 1,
                        dataType: 'N'
                    }
                },
                loanApplicationRegister: {
                    bar: {
                        start: 1,
                        end: 1
                    }
                }
            };
            var result = validator.validate(tmpFileSpec);
            expect(result).to.be('Field "bar" in loanApplicationRegister missing required "dataType" property');
            done();
        });
    });

});
