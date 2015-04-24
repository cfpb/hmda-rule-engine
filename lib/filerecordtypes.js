'use strict';

/**
 * An Array of the possible types for use in [HMDAProcessor.parseLine()]{@link HMDAProcessor#parseLine}
 * @constructs FileRecordTypes
 */
var FileRecordTypes = function() {
    this.types = ['transmittalSheet', 'loanApplicationRegister'];
    return this;
};
module.exports = new FileRecordTypes();
