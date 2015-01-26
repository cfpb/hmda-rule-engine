'use strict';

var rewire = require('rewire');

var RewiredEngine = function() {
    var engine = {};
    wireFunctions(engine);
    return engine;
};

var wireFunctions = function(engine) {
    var rewiredEngine = rewire('../engine'),
        keys = Object.keys(rewiredEngine);

    engine.__get__ = rewiredEngine.__get__;
    engine.__set__ = rewiredEngine.__set__;

    for (var i = 0; i < keys.length; i++) {
        engine[keys[i]] = (RewiredEngine[keys[i]] ? RewiredEngine[keys[i]] : rewiredEngine[keys[i]]);
    }
};

/*
 * -----------------------------------------------------
 * Custom Non-API function stubs
 * -----------------------------------------------------
 */

/* lar-quality */
RewiredEngine.isLoanAmountFiveTimesIncome = function(loanAmount, applicantIncome) {
    return true;
};

RewiredEngine.isValidLoanAmount = function(loanAmount, applicantIncome) {
    return true;
};

/* ts-quality */
RewiredEngine.checkTotalLARCount = function(totalLineEntries) {
    return true;
};

/* hmda-macro */
RewiredEngine.compareNumEntriesSingle = function(loanApplicationRegisters, rule, cond) {
    return true;
};

RewiredEngine.compareNumEntries = function(loanApplicationRegisters, ruleA, ruleB, cond) {
    return true;
};

RewiredEngine.isValidNumMultifamilyLoans = function(hmdaFile) {
    return true;
};

/*
 * -----------------------------------------------------
 * Custom API function stubs
 * -----------------------------------------------------
 */

/* ts-syntactical */
RewiredEngine.isTimestampLaterThanDatabase = function(timestamp) {
    return true;
};

/* hmda-syntactical */
RewiredEngine.isValidControlNumber = function(hmdaFile) {
    return true;
};

/* lar-validity */
RewiredEngine.isValidMetroArea = function(metroArea) {
    return true;
};

RewiredEngine.isValidMsaMdStateAndCountyCombo = function(metroArea, fipsState, fipsCounty) {
    return true;
};

RewiredEngine.isValidStateAndCounty = function(fipsState, fipsCounty) {
    return true;
};

RewiredEngine.isValidCensusTractCombo = function(censusTract, metroArea, fipsState, fipsCounty) {
    return true;
};

/* lar-quality */
RewiredEngine.isValidStateCountyCensusTractCombo = function(fipsState, fipsCounty, censusTract, metroArea) {
    return true;
};

RewiredEngine.isNotIndependentMortgageCoOrMBS = function(respondentID) {
    return true;
};

RewiredEngine.isMetroAreaOnRespondentPanel = function(metroArea, respondentID) {
    return true;
};

/* ts-validity */
RewiredEngine.isRespondentMBS = function(respondentID) {
    return true;
};

/* hmda-macro */
RewiredEngine.isValidNumLoans = function(hmdaFile) {
    return true;
};

RewiredEngine.isValidNumFannieMaeLoans = function(hmdaFile) {
    return true;
};

RewiredEngine.isValidNumGinnieMaeFHALoans = function(hmdaFile) {
    return true;
};

RewiredEngine.isValidNumGinnieMaeVALoans = function(hmdaFile) {
    return true;
};

RewiredEngine.isValidNumHomePurchaseLoans = function(hmdaFile) {
    return true;
};

RewiredEngine.isValidNumRefinanceLoans = function(hmdaFile) {
    return true;
};

RewiredEngine.isValidMsaMdCountyCensusForNonDepository = function(hmdaFile) {
    return true;
};

/* ts-quality */
RewiredEngine.isChildFI = function(respondentID) {
    return true;
};

RewiredEngine.isTaxIDTheSameAsLastYear = function(respondentID, taxID) {
    return true;
};

module.exports = new RewiredEngine();