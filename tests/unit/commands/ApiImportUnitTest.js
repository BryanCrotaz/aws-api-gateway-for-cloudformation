'use strict';

var chai = require('chai');
var expect = chai.expect;
var mockery = require('mockery');
var sinon = require('sinon');

var testSubject;

describe('ApiImport Command', function () {
    var importApiStub;
    var deleteRestApiStub;
    var updateApiStub;
    var getForResponseStub;
    var getParametersStub;

    after(function () {
        mockery.deregisterAll();
        mockery.disable();
    });
    before(function() {
        mockery.enable({
            useCleanCache: true,
            warnOnUnregistered: false
        });

        importApiStub = sinon.stub();
        deleteRestApiStub = sinon.stub();
        updateApiStub = sinon.stub();
        getForResponseStub = sinon.stub();
        getParametersStub = sinon.stub();

        var apiApiImportServiceStub = {
            importApi: importApiStub,
            deleteApi: deleteRestApiStub,
            updateApi: updateApiStub
        };
        var apiRestApiServiceStub = {
            deleteApi: deleteRestApiStub,
            getForResponse: getForResponseStub
        };
        var apiRestApiEventStub = {
            getParameters: getParametersStub
        };
        mockery.registerMock('../service/ApiImport/ApiImportService', apiApiImportServiceStub);
        mockery.registerMock('../service/ApiImport/ApiImportEvent', apiRestApiEventStub);
        mockery.registerMock('../service/RestApi/RestApiService', apiRestApiServiceStub);

        testSubject = require('../../../lib/commands/ApiImport');
    });
    beforeEach(function () {
        importApiStub.reset().resetBehavior();
        importApiStub.yields(undefined, {});
        deleteRestApiStub.reset().resetBehavior();
        deleteRestApiStub.yields(undefined);
        updateApiStub.reset().resetBehavior();
        updateApiStub.yields(undefined, {});
        getForResponseStub.reset().resetBehavior();
        getForResponseStub.yields(undefined, {});
        getParametersStub.reset().resetBehavior();
        getParametersStub.returns({ params: {} });
    });

    describe('getParameters', function () {
        it('should get parameters', function (done) {
            var parameters = testSubject.getParameters();
            expect(parameters.params).to.be.an('object');
            done();
        });
        it('should get error', function (done) {
            getParametersStub.returns(new Error());
            var parameters = testSubject.getParameters();
            expect(parameters.params).to.be.an.Error;
            done();
        });
    });

    describe('createResource', function () {
        it('should create resource', function (done) {
            testSubject.createResource({}, {}, { params: {} }, function (error) {
                expect(error).to.be.undefined;
                expect(importApiStub.called).to.be.true;
                expect(getForResponseStub.called).to.be.true;
                done();
            });
        });
        it('should update resource if restApiId is given as parameter', function (done) {
            testSubject.createResource({}, {}, { params: { restApiId: '123'} }, function (error) {
                expect(error).to.be.undefined;
                expect(updateApiStub.called).to.be.true;
                expect(getForResponseStub.called).to.be.true;
                done();
            });
        });
        it('should fail create resource', function (done) {
            importApiStub.yields('createError');
            testSubject.createResource({}, {}, { params: {} }, function (error) {
                expect(error).to.equal('createError');
                expect(importApiStub.called).to.be.true;
                expect(getForResponseStub.called).to.be.false;
                done();
            });
        });
        it('should fail if get for response fails', function (done) {
            getForResponseStub.yields('getForResponseError');
            testSubject.createResource({}, {}, { params: {} }, function (error) {
                expect(error).to.equal('getForResponseError');
                expect(importApiStub.called).to.be.true;
                expect(getForResponseStub.called).to.be.true;
                done();
            });
        });
    });

    describe('deleteResource', function () {
        it('should delete the rest api', function (done) {
            testSubject.deleteResource({}, {}, { params: {} }, function (error) {
                expect(error).to.be.undefined;
                expect(deleteRestApiStub.called).to.be.true;
                done();
            });
        });
        it('should do nothing if restApiId is given in params', function (done) {
            testSubject.deleteResource({}, {}, { params: { restApiId: '123' } }, function (error) {
                expect(error).to.be.undefined;
                expect(deleteRestApiStub.called).to.be.false;
                done();
            });
        });
        it('should fail delete rest api', function (done) {
            deleteRestApiStub.yields('deleteError');
            testSubject.deleteResource({}, {}, { params: {} }, function (error) {
                expect(error).to.equal('deleteError');
                expect(deleteRestApiStub.called).to.be.true;
                done();
            });
        });
    });

    describe('updateResource', function () {
        it('should update rest api', function (done) {
            testSubject.updateResource({}, {}, { params: {}}, function (error, resource) {
                expect(error).to.be.undefined;
                expect(resource).to.be.an('object');
                expect(updateApiStub.called).to.be.true;
                expect(getForResponseStub.called).to.be.true;
                done();
            });
        });
        it('should fail update rest api if delete fails', function (done) {
            updateApiStub.yields('updateError');
            testSubject.updateResource({}, {}, { params: {} }, function (error, resource) {
                expect(error).to.equal('updateError');
                expect(resource).to.be.undefined;
                expect(updateApiStub.called).to.be.true;
                expect(getForResponseStub.called).to.be.false;
                done();
            });
        });
        it('should fail if get for response fails', function (done) {
            getForResponseStub.yields('getForResponseError');
            testSubject.updateResource({}, {}, { params: {} }, function (error, resource) {
                expect(error).to.equal('getForResponseError');
                expect(resource).to.be.undefined;
                expect(updateApiStub.called).to.be.true;
                expect(getForResponseStub.called).to.be.true;
                done();
            });
        });
        it('should fail if get for response doesnt find the rest api', function (done) {
            updateApiStub.yields('Rest API not found');
            testSubject.updateResource({}, {}, { params: {} }, function (error, resource) {
                expect(error).to.equal('Rest API not found');
                expect(resource).to.be.undefined;
                expect(updateApiStub.called).to.be.true;
                expect(getForResponseStub.called).to.be.false;
                done();
            });
        });
    });
});