'use strict';

var rewire = require('rewire');

var RewiredEngine = function() {
};
RewiredEngine.prototype = rewire('../engine');


/*
 * -----------------------------------------------------
 * Custom Non-API function stubs
 * -----------------------------------------------------
 */

/* lar-quality */
RewiredEngine.prototype.isLoanAmountFiveTimesIncome = function(loanAmount, applicantIncome) {
    return true;
};

RewiredEngine.prototype.isValidLoanAmount = function(loanAmount, applicantIncome) {
    return true;
};

/* ts-quality */
RewiredEngine.prototype.checkTotalLARCount = function(totalLineEntries) {
    return true;
};

/* hmda-macro */
RewiredEngine.prototype.compareNumEntriesSingle = function(loanApplicationRegisters, rule, cond) {
    return true;
};

RewiredEngine.prototype.compareNumEntries = function(loanApplicationRegisters, ruleA, ruleB, cond) {
    return true;
};

RewiredEngine.prototype.isValidNumMultifamilyLoans = function(hmdaFile) {
    return true;
};

/*
 * -----------------------------------------------------
 * Custom API function stubs
 * -----------------------------------------------------
 */

/* ts-syntactical */

/* hmda-syntactical */
RewiredEngine.prototype.isValidControlNumber = function(hmdaFile) {
    return true;
};

/* lar-validity */
RewiredEngine.prototype.isValidMetroArea = function(metroArea) {
    return true;
};

RewiredEngine.prototype.isValidMsaMdStateAndCountyCombo = function(metroArea, fipsState, fipsCounty) {
    return true;
};

RewiredEngine.prototype.isValidStateAndCounty = function(fipsState, fipsCounty) {
    return true;
};

RewiredEngine.prototype.isValidCensusTractCombo = function(censusTract, metroArea, fipsState, fipsCounty) {
    return true;
};

/* lar-quality */

RewiredEngine.prototype.isNotIndependentMortgageCoOrMBS = function(respondentID, agencyCode) {
    return true;
};

RewiredEngine.prototype.isMetroAreaOnRespondentPanel = function(metroArea, respondentID, agencyCode) {
    return true;
};

/* ts-validity */
RewiredEngine.prototype.isRespondentMBS = function(respondentID) {
    return true;
};

/* hmda-macro */
RewiredEngine.prototype.isValidNumLoans = function(hmdaFile) {
    return true;
};

RewiredEngine.prototype.isValidNumFannieMaeLoans = function(hmdaFile) {
    return true;
};

RewiredEngine.prototype.isValidNumGinnieMaeFHALoans = function(hmdaFile) {
    return true;
};

RewiredEngine.prototype.isValidNumGinnieMaeVALoans = function(hmdaFile) {
    return true;
};

RewiredEngine.prototype.isValidNumHomePurchaseLoans = function(hmdaFile) {
    return true;
};

RewiredEngine.prototype.isValidNumRefinanceLoans = function(hmdaFile) {
    return true;
};

/* ts-quality */
RewiredEngine.prototype.isTaxIDTheSameAsLastYear = function(respondentID, agencyCode, taxID) {
    return true;
};

module.exports = new RewiredEngine();