'use strict';

var expect = require('chai').expect;
var mockery = require('mockery');
var sinon = require('sinon');

var testSubject;

describe('RestApiCommand', function () {
    var createRestApiStub;
    var deleteRestApiStub;
    var patchRestApiStub;
    var getForResponseStub;
    var getParametersStub;
    var updateCorsConfigurationStub;
    var isValidResourceIdStub;

    after(function () {
        mockery.deregisterAll();
        mockery.disable();
    });
    before(function() {
        mockery.enable({
            useCleanCache: true,
            warnOnUnregistered: false
        });
        mockery.registerAllowable('../../../lib/commands/rest-api');

        createRestApiStub = sinon.stub();
        deleteRestApiStub = sinon.stub();
        patchRestApiStub = sinon.stub();
        getForResponseStub = sinon.stub();
        getParametersStub = sinon.stub();
        updateCorsConfigurationStub = sinon.stub();
        isValidResourceIdStub = sinon.stub();

        var apiRestApiServiceStub = {
            createApi: createRestApiStub,
            deleteApi: deleteRestApiStub,
            patchApi: patchRestApiStub,
            getForResponse: getForResponseStub
        };
        var apiRestApiEventStub = {
            getParameters: getParametersStub,
            isValidResourceId: isValidResourceIdStub
        };
        var corsServiceStub = {
            updateCorsConfiguration: updateCorsConfigurationStub
        };

        mockery.registerMock('../service/rest-api/rest-api-service', apiRestApiServiceStub);
        mockery.registerMock('../service/rest-api/rest-api-event', apiRestApiEventStub);
        mockery.registerMock('../service/cors/cors-service', corsServiceStub);
        testSubject = require('../../../lib/commands/rest-api');
    });
    beforeEach(function () {
        createRestApiStub.reset().resetBehavior();
        createRestApiStub.yields(undefined, {});
        deleteRestApiStub.reset().resetBehavior();
        deleteRestApiStub.yields(undefined);
        patchRestApiStub.reset().resetBehavior();
        patchRestApiStub.yields(undefined, {});
        getForResponseStub.reset().resetBehavior();
        getForResponseStub.yields(undefined, {});
        getParametersStub.reset().resetBehavior();
        getParametersStub.returns({ params: {} });
        updateCorsConfigurationStub.reset().resetBehavior();
        updateCorsConfigurationStub.yields(undefined, {});
        isValidResourceIdStub.reset().resetBehavior();
        isValidResourceIdStub.returns(true);
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
            expect(parameters).to.be.an('Error');
            done();
        });
    });

    describe('createResource', function () {
        it('should create resource', function (done) {
            testSubject.createResource({}, {}, { params: {} }, function (error) {
                expect(error).to.equal(undefined);
                expect(createRestApiStub.called).to.equal(true);
                expect(getForResponseStub.called).to.equal(true);
                done();
            });
        });
        it('should fail create resource', function (done) {
            createRestApiStub.yields('createError');
            testSubject.createResource({}, {}, { params: {} }, function (error) {
                expect(error).to.equal('createError');
                expect(createRestApiStub.called).to.equal(true);
                expect(getForResponseStub.called).to.equal(false);
                done();
            });
        });
        it('should fail if get for response fails', function (done) {
            getForResponseStub.yields('getForResponseError');
            testSubject.createResource({}, {}, { params: {} }, function (error) {
                expect(error).to.equal('getForResponseError');
                expect(createRestApiStub.called).to.equal(true);
                expect(getForResponseStub.called).to.equal(true);
                done();
            });
        });
    });

    describe('deleteResource', function () {
        it('should delete the rest api', function (done) {
            testSubject.deleteResource({}, {}, { params: {} }, function (error) {
                expect(error).to.equal(undefined);
                expect(deleteRestApiStub.called).to.equal(true);
                done();
            });
        });
        it('should fail delete rest api', function (done) {
            deleteRestApiStub.yields('deleteError');
            testSubject.deleteResource({}, {}, { params: {} }, function (error) {
                expect(error).to.equal('deleteError');
                expect(deleteRestApiStub.called).to.equal(true);
                done();
            });
        });
        it('should do nothing if physical resource id is invalid', function (done) {
            isValidResourceIdStub.returns(false);
            testSubject.deleteResource({}, {}, { params: {} }, function (error) {
                expect(error).to.equal(undefined);
                expect(deleteRestApiStub.called).to.equal(false);
                done();
            });
        });
    });

    describe('updateResource', function () {
        it('should update rest api', function (done) {
            testSubject.updateResource({}, {}, { params: {}}, function (error, resource) {
                expect(error).to.equal(undefined);
                expect(resource).to.be.an('object');
                expect(patchRestApiStub.called).to.equal(true);
                expect(updateCorsConfigurationStub.called).to.equal(true);
                expect(getForResponseStub.called).to.equal(true);
                done();
            });
        });
        it('should fail update rest api if delete fails', function (done) {
            patchRestApiStub.yields('updateError');
            testSubject.updateResource({}, {}, { params: {} }, function (error, resource) {
                expect(error).to.equal('updateError');
                expect(resource).to.equal(undefined);
                expect(patchRestApiStub.called).to.equal(true);
                expect(updateCorsConfigurationStub.called).to.equal(false);
                expect(getForResponseStub.called).to.equal(false);
                done();
            });
        });
        it('should fail if get for response fails', function (done) {
            getForResponseStub.yields('getForResponseError');
            testSubject.updateResource({}, {}, { params: {} }, function (error, resource) {
                expect(error).to.equal('getForResponseError');
                expect(resource).to.equal(undefined);
                expect(patchRestApiStub.called).to.equal(true);
                expect(getForResponseStub.called).to.equal(true);
                expect(updateCorsConfigurationStub.called).to.equal(false);
                done();
            });
        });
        it('should fail if get for response doesnt find the rest api', function (done) {
            getForResponseStub.yields('Rest API not found');
            testSubject.updateResource({}, {}, { params: {} }, function (error, resource) {
                expect(error).to.equal('Rest API not found');
                expect(resource).to.equal(undefined);
                expect(patchRestApiStub.called).to.equal(true);
                expect(getForResponseStub.called).to.equal(true);
                expect(updateCorsConfigurationStub.called).to.equal(false);
                done();
            });
        });
        it('should fail if cors service fails', function (done) {
            updateCorsConfigurationStub.yields('corsError');
            testSubject.updateResource({}, {}, { params: {} }, function (error) {
                expect(error).to.equal('corsError');
                expect(patchRestApiStub.called).to.equal(true);
                expect(getForResponseStub.called).to.equal(true);
                expect(updateCorsConfigurationStub.called).to.equal(true);
                done();
            });
        });
    });
});
