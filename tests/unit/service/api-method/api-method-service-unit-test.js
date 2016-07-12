'use strict';

var expect = require('chai').expect;
var mockery = require('mockery');
var sinon = require('sinon');
var apiMethodEvent = require('../../../../lib/service/api-method/api-method-event');
var _ = require('lodash');
var testSubject;

describe('ApiMethodService', function () {
    var getMethodStub;
    var deleteMethodStub;
    var putMethodStub;
    var putIntegrationStub;
    var putMethodResponseStub;
    var putIntegrationResponseStub;

    after(function () {
        mockery.deregisterAll();
        mockery.disable();
    });
    before(function() {
        mockery.enable({
            useCleanCache: true,
            warnOnUnregistered: false
        });

        getMethodStub = sinon.stub();
        deleteMethodStub = sinon.stub();
        putMethodStub = sinon.stub();
        putIntegrationStub = sinon.stub();
        putMethodResponseStub = sinon.stub();
        putIntegrationResponseStub = sinon.stub();

        var awsSdkStub = {
            APIGateway: function () {
                this.getMethod = getMethodStub;
                this.deleteMethod = deleteMethodStub;
                this.putMethod = putMethodStub;
                this.putIntegration = putIntegrationStub;
                this.putMethodResponse = putMethodResponseStub;
                this.putIntegrationResponse = putIntegrationResponseStub;
            }
        };

        mockery.registerMock('aws-sdk', awsSdkStub);
        testSubject = require('../../../../lib/service/api-method/api-method-service');
        testSubject.PUT_METHOD_STEP_DELAY_MILLIS = 1;
    });
    beforeEach(function () {
        getMethodStub.reset().resetBehavior();
        getMethodStub.yields(undefined, {
            methodResponses: {
                '200': {
                    statusCode: "200"
                }
            },
            requestModels: {
                model: {
                }
            },
            methodIntegration: {
                integrationResponses: {
                    '200': {
                        responseParameters: {
                            'method.response.header.Access-Control-Allow-Methods': 'GET',
                            'method.response.header.Access-Control-Allow-Origin': '*'
                        }
                    }
                },
                requestTemplates: {
                    'application/json': {}
                }
            }
        });
        deleteMethodStub.reset().resetBehavior();
        deleteMethodStub.yields();
        putMethodStub.reset().resetBehavior();
        putMethodStub.yields(undefined, {});
        putIntegrationStub.reset().resetBehavior();
        putIntegrationStub.yields(undefined, {});
        putMethodResponseStub.reset().resetBehavior();
        putMethodResponseStub.yields(undefined, {});
        putIntegrationResponseStub.reset().resetBehavior();
        putIntegrationResponseStub.yields(undefined, {});
    });

    describe('getForResponse', function () {
        it('should get an api method', function (done) {
            testSubject.getForResponse('RestApiId', 'ResourceId', 'HttpMethod', function (error, apiMethod) {
                expect(error).to.equal(undefined);
                expect(apiMethod).to.be.an('object');
                expect(apiMethod.methodResponses).to.equal(undefined);
                expect(apiMethod.requestModels).to.equal(undefined);
                expect(apiMethod.methodIntegration.integrationResponses).to.equal(undefined);
                expect(apiMethod.methodIntegration.requestTemplates).to.equal(undefined);
                done();
            });
        });
        it('should return an error when getting api method', function (done) {
            getMethodStub.yields({});
            testSubject.getForResponse('RestApiId', 'ResourceId', 'HttpMethod', function (error, apiMethod) {
                expect(error).to.be.an('object');
                expect(apiMethod).to.equal(undefined);
                done();
            });
        });
    });

    describe('createMethod', function () {
        var event = require('./util').event;
        var params;
        beforeEach(function () {
            params = apiMethodEvent.getParameters(_.cloneDeep(event));
        });
        it('should create an api method', function (done) {
            testSubject.createMethod(params, function (error, apiMethod) {
                expect(error).to.equal(undefined);
                expect(putMethodResponseStub.calledThrice).to.equal(true);
                expect(putIntegrationResponseStub.calledThrice).to.equal(true);
                expect(apiMethod).to.be.an('object');
                done();
            });
        });
        it('should create an api method without parameters', function (done) {
            delete params.params.method.parameters;
            testSubject.createMethod(params, function (error, apiMethod) {
                expect(error).to.equal(undefined);
                expect(apiMethod).to.be.an('object');
                done();
            });
        });
        it('should create an api method with cors origin', function (done) {
            params.params.method.httpMethod = 'GET';
            testSubject.createMethod(params, function (error, apiMethod) {
                expect(error).to.equal(undefined);
                expect(apiMethod).to.be.an('object');
                done();
            });
        });
        it('should create an api method with no cors origin and no responses', function (done) {
            getMethodStub.yields();
            params.params.method.httpMethod = 'GET';
            delete params.params.responses;
            testSubject.createMethod(params, function (error, apiMethod) {
                expect(error).to.equal(undefined);
                expect(apiMethod).to.be.an('object');
                done();
            });
        });
        it('should create an api method with cors origin with responses and headers', function (done) {
            params.params.method.httpMethod = 'GET';
            params.params.responses.default.headers = { test: 'xyz' };
            testSubject.createMethod(params, function (error, apiMethod) {
                expect(error).to.equal(undefined);
                expect(apiMethod).to.be.an('object');
                done();
            });
        });
        it('should not require cache settings', function (done) {
            delete params.params.integration.cacheKeyParameters;
            testSubject.createMethod(params, function (error, apiMethod) {
                expect(error).to.equal(undefined);
                expect(apiMethod).to.be.an('object');
                done();
            });
        });
        it('should create method with authorizationType CUSTOM', function (done) {
            params.params.method.authorizationType = 'CUSTOM';
            params.params.method.authorizerId = 'AuthorizerId';
            testSubject.createMethod(params, function (error, apiMethod) {
                expect(error).to.equal(undefined);
                expect(apiMethod).to.be.an('object');
                done();
            });
        });

        it('should yield an error if getMethod for CorsOrigin fails', function (done) {
            params.params.method.httpMethod = 'GET';
            getMethodStub.yields('getMethodError');
            testSubject.createMethod(params, function (error, apiMethod) {
                expect(error).to.equal('getMethodError');
                expect(apiMethod).to.equal(undefined);
                done();
            });
        });
        it('should yield an error if putMethod fails', function (done) {
            putMethodStub.yields('putMethodError');
            testSubject.createMethod(params, function (error, apiMethod) {
                expect(error).to.equal('putMethodError');
                expect(apiMethod).to.equal(undefined);
                done();
            });
        });
        it('should yield an error if putIntegration fails', function (done) {
            putIntegrationStub.yields('putIntegrationError');
            testSubject.createMethod(params, function (error, apiMethod) {
                expect(error).to.equal('putIntegrationError');
                expect(apiMethod).to.an('object');
                done();
            });
        });
        it('should yield an error if putMethodResponse fails', function (done) {
            putMethodResponseStub.yields('putMethodResponseError');
            testSubject.createMethod(params, function (error, apiMethod) {
                expect(error).to.equal('putMethodResponseError');
                expect(apiMethod).to.an('object');
                done();
            });
        });
        it('should yield an error if putIntegration fails', function (done) {
            putIntegrationResponseStub.yields('putIntegrationResponseError');
            testSubject.createMethod(params, function (error, apiMethod) {
                expect(error).to.equal('putIntegrationResponseError');
                expect(apiMethod).to.an('object');
                done();
            });
        });
    });

    describe('deleteMethod', function () {
        it('should delete an api method', function (done) {
            testSubject.deleteMethod('ResourceId', 'RestApiId', 'HttpMethod', function (error) {
                expect(error).to.equal(undefined);
                done();
            });
        });
        it('should return an error when delete fails', function (done) {
            deleteMethodStub.yields('deleteError');
            testSubject.deleteMethod('ResourceId','RestApiId', 'HttpMethod', function (error) {
                expect(error).to.equal('deleteError');
                done();
            });
        });
        it('should return nothing if method does not exist', function (done) {
            deleteMethodStub.yields({ code: 'NotFoundException' });
            testSubject.deleteMethod('ResourceId','RestApiId', 'HttpMethod', function (error) {
                expect(error).to.equal(undefined);
                done();
            });
        });
    });

    describe('getCorsOrigin', function () {
        var params;
        beforeEach(function () {
            params = {
                restApiId: 'RestApiId',
                resourceId: 'ResourceId',
                method: {
                    httpMethod: 'GET'
                }
            };
        });
        it('should receive a CORS origin', function (done) {
            testSubject.getCorsOrigin(params, function (error, origin) {
                expect(error).to.equal(undefined);
                expect(origin).to.equal('*');
                done();
            });
        });
        it('should not receive a CORS origin for non-CORS enabled method', function (done) {
            params.method.httpMethod = 'POST';
            testSubject.getCorsOrigin(params, function (error, origin) {
                expect(error).to.equal(undefined);
                expect(origin).to.equal(undefined);
                done();
            });
        });
        it('should not receive a CORS origin for OPTIONS method', function (done) {
            params.method.httpMethod = 'OPTIONS';
            testSubject.getCorsOrigin(params, function (error, origin) {
                expect(error).to.equal(undefined);
                expect(origin).to.equal(undefined);
                done();
            });
        });
        it('should not receive a CORS origin if there is none set', function (done) {
            getMethodStub.yields(undefined, { methodIntegration: {} });
            testSubject.getCorsOrigin(params, function (error, origin) {
                expect(error).to.equal(undefined);
                expect(origin).to.equal(undefined);
                done();
            });
        });
        it('should yield error if getMethod fails', function (done) {
            getMethodStub.yields('getMethod');
            testSubject.getCorsOrigin(params, function (error, origin) {
                expect(error).to.equal('getMethod');
                expect(origin).to.equal(undefined);
                done();
            });
        });
    });
});
