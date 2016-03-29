'use strict';

var getWrappedService = require('../util/api-gateway-retry-wrapper');
var awsApiGateway = getWrappedService({ apiVersion: '2015-07-09' });
var async = require('async');
var ApiMethodEvent = require('./ApiMethodEvent');
var Constants = require('../Constants');
var logger = require('../util/logger');

var pub = {};

/*
    Due to unexpected issues during method creation a slight delay between operations was introduced.
    The issue at hand is that Amazon responds with ConcurrentModificationsException.
    After discussions with the AWS support it was deemed best to add a slight delay to ensure that each call
    was completed on the server side before executing the next request.
 */
var PUT_METHOD_STEP_DELAY_MILLIS = 100;

pub.getForResponse = function getForResponse(restApiId, resourceId, httpMethod, callback) {
    var params = {
        restApiId: restApiId,
        resourceId: resourceId,
        httpMethod: httpMethod
    };
    awsApiGateway.getMethod(params, function (error, apiMethod) {
        if (error) {
            logger.log('Error ApiMethodService::getForResponse', { error: error, params: params });
        }
        return callback(error, apiMethod);
    });
};

/* eslint max-nested-callbacks: 0 */
pub.createMethod = function createMethod(parameters, callback) {
    var validParameters = ApiMethodEvent.validateParameters(parameters.params);

    pub.getCorsOrigin(validParameters, function (getError, corsOrigin) {
        if (getError) {
            return callback(getError);
        }

        if (corsOrigin) {
            validParameters = appendCorsProperties(validParameters, corsOrigin);
        }

        putMethod(validParameters, function (putError, apiMethod) {
            if (putError) {
                return callback(putError);
            }
            createIntegration(validParameters, function (integrationError) {
                if (integrationError) {
                    return callback(integrationError);
                }
                createResponses(validParameters, function (responseError) {
                    if (responseError) {
                        return callback(responseError);
                    }
                    createIntegrationResponses(validParameters, function (integrationResponseError) {
                        if (integrationResponseError) {
                            return callback(integrationResponseError);
                        }
                        return callback(undefined, apiMethod);
                    });
                });
            });
        });
    });
};

pub.getMethod = function getMethod(restApiId, resourceId, httpMethod, callback) {
    var params = {
        restApiId: restApiId,
        resourceId: resourceId,
        httpMethod: httpMethod
    };
    awsApiGateway.getMethod(params, function (error, method) {
        if (error && error.code !== 'NotFoundException') {
            logger.log('Error ApiMethodService::getMethod', { error: error, params: params });
            return callback(error);
        }
        callback(undefined, method);
    });
};

pub.getCorsOrigin = function getCorsOrigin(parameters, callback) {
    // If we are creating an OPTIONS method we don't need to get the origin
    if (parameters.method.httpMethod === Constants.CORS_OPTIONS_METHOD) {
        return callback();
    }

    pub.getMethod(parameters.restApiId, parameters.resourceId, Constants.CORS_OPTIONS_METHOD, function (error, method) {
        if (error) {
            return callback(error);
        }

        var origin;
        if (method && method.methodIntegration && method.methodIntegration.integrationResponses) {
            /* eslint max-len: 0 */
            var allowedMethods = method.methodIntegration.integrationResponses[Constants.CORS_STATUS_CODE].responseParameters['method.response.header.' + Constants.AWS_HEADER_PATHS.ALLOW_METHODS];
            if (allowedMethods.indexOf(parameters.method.httpMethod) > -1) {
                /* eslint max-len: 0 */
                origin = method.methodIntegration.integrationResponses[Constants.CORS_STATUS_CODE].responseParameters['method.response.header.' + Constants.AWS_HEADER_PATHS.ALLOW_ORIGIN];
            }
        }
        callback(error, origin);
    });
};

pub.deleteMethod = function deleteMethod(restApiId, resourceId, httpMethod, callback) {
    var params = {
        restApiId: restApiId,
        resourceId: resourceId,
        httpMethod: httpMethod
    };
    awsApiGateway.deleteMethod(params, function (error) {
        if (error && error.code !== 'NotFoundException') {
            logger.log('Error ApiMethodService::deleteMethod', { error: error, params: params });
            return callback(error);
        }
        return callback();
    });
};

module.exports = pub;

function putMethod(parameters, callback) {
    var params = {
        restApiId: parameters.restApiId,
        resourceId: parameters.resourceId,
        httpMethod: parameters.method.httpMethod,
        authorizationType: parameters.method.authorizationType,
        apiKeyRequired: parameters.method.apiKeyRequired,
        requestModels: parameters.method.requestModels
    };

    if (parameters.method.authorizationType === 'CUSTOM') {
        params.authorizerId = parameters.method.authorizerId;
    }

    if (parameters.method.parameters) {
        params.requestParameters = {};
        for (var i = 0; i < parameters.method.parameters.length; i++) {
            params.requestParameters['method.request.' + parameters.method.parameters[i]] = true;
        }
    }
    awsApiGateway.putMethod(params, function (error, apiMethod) {
        if (error) {
            logger.log('Error ApiMethodService::putMethod', { error: error, params: params });
        }
        setTimeout(function () {
            return callback(error, apiMethod);
        }, PUT_METHOD_STEP_DELAY_MILLIS);
    });
}

function createIntegration(parameters, callback) {
    var params = {
        restApiId: parameters.restApiId,
        resourceId: parameters.resourceId,
        httpMethod: parameters.method.httpMethod,
        type: parameters.integration.type,
        credentials: parameters.integration.credentials,
        integrationHttpMethod: parameters.integration.httpMethod,
        requestParameters: parameters.integration.requestParameters,
        requestTemplates: parameters.integration.requestTemplates,
        uri: parameters.integration.uri
    };
    if (parameters.integration.cacheKeyParameters) {
        params.cacheKeyParameters = parameters.integration.cacheKeyParameters;
        params.cacheNamespace = parameters.integration.cacheNamespace;
    }
    awsApiGateway.putIntegration(params, function (error) {
        if (error) {
            logger.log('Error ApiMethodService::createIntegration', { error: error, params: params });
        }
        setTimeout(function () {
            return callback(error);
        }, PUT_METHOD_STEP_DELAY_MILLIS);
    });
}

function createResponses(parameters, callback) {
    async.mapSeries(parameters.responses, function (response, asyncCallback) {
        var params = {
            restApiId: parameters.restApiId,
            resourceId: parameters.resourceId,
            httpMethod: parameters.method.httpMethod,
            statusCode: response.statusCode,
            responseModels: response.responseModels
        };

        if (response.headers) {
            var headers = Object.getOwnPropertyNames(response.headers);
            params.responseParameters = {};
            for (var i = 0; i < headers.length; i++) {
                params.responseParameters['method.response.header.' + headers[i]] = true;
            }
        }

        awsApiGateway.putMethodResponse(params, function (error) {
            if (error) {
                logger.log('Error ApiMethodService::createResponses', { error: error, params: params });
            }
            asyncCallback(error);
        });
    }, function (error) {
        setTimeout(function () {
            return callback(error);
        }, PUT_METHOD_STEP_DELAY_MILLIS);
    });
}

function createIntegrationResponses(parameters, callback) {
    async.mapSeries(parameters.responses, function (response, asyncCallback) {
        var params = {
            restApiId: parameters.restApiId,
            resourceId: parameters.resourceId,
            httpMethod: parameters.method.httpMethod,
            statusCode: response.statusCode,
            selectionPattern: response.selectionPattern,
            responseTemplates: response.responseTemplates
        };
        if (response.headers) {
            var headers = Object.getOwnPropertyNames(response.headers);
            params.responseParameters = {};
            for (var i = 0; i < headers.length; i++) {
                params.responseParameters['method.response.header.' + headers[i]] = response.headers[headers[i]];
            }
        }
        awsApiGateway.putIntegrationResponse(params, function (error, data) {
            if (error) {
                logger.log('Error ApiMethodService::createIntegrationResponses', { error: error, params: params });
            }
            asyncCallback(error, data);
        });
    }, function (error) {
        setTimeout(function () {
            return callback(error);
        }, PUT_METHOD_STEP_DELAY_MILLIS);
    });
}

function appendCorsProperties(parameters, corsOrigin) {
    if (parameters.responses) {
        for (var i = 0; i < parameters.responses.length; i++) {
            if (!parameters.responses[i].headers) {
                parameters.responses[i].headers = {};
            }
            parameters.responses[i].headers[Constants.AWS_HEADER_PATHS.ALLOW_ORIGIN] = corsOrigin;
        }
    }
    return parameters;
}
