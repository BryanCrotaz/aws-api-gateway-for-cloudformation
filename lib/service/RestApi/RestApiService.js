'use strict';

var getWrappedService = require('../util/api-gateway-retry-wrapper');
var awsApiGateway = getWrappedService({ apiVersion: '2015-07-09' });
var ApiResourceService = require('../ApiResource/ApiResourceService');
var RestApiEvent = require('./RestApiEvent');
var CorsService = require('../Cors/CorsService');
var Constants = require('../Constants');
var logger = require('../util/logger');

var pub = {};

pub.getForResponse = function getForResponse(restApiId, callback) {
    var params = {
        restApiId: restApiId
    };
    awsApiGateway.getRestApi(params, function (getApiError, restApi) {
        if (getApiError) {
            logger.log('Error RestApiService::getForResponse', { error: getApiError, params: params });
            return callback(getApiError);
        }
        ApiResourceService.getApiParentResource(restApiId, function (getParentResourceError, apiResource) {
            if (getParentResourceError) {
                return callback(getParentResourceError);
            }
            restApi.parentResourceId = apiResource.id;
            callback(undefined, restApi);
        });
    });
};

pub.findApiByName = function findApiByName(restApiName, position, callback) {
    var params = {
        limit: Constants.GET_APIS_LIMIT,
        position: position || undefined
    };
    awsApiGateway.getRestApis(params, function (error, apiGatewayResponse) {
        if (error && error.code !== 'NotFoundException') {
            logger.log('Error RestApiService::findApiByName', { error: error, params: params });
            return callback(error);
        }

        if (apiGatewayResponse && apiGatewayResponse.items) {
            var resource;
            var numberOfItems = apiGatewayResponse.items.length;
            for (var i = 0; i < numberOfItems; i++) {
                if (apiGatewayResponse.items[i].name === restApiName) {
                    resource = apiGatewayResponse.items[i];
                    break;
                }
            }

            if (resource) {
                return callback(undefined, resource);
            } else if (apiGatewayResponse.position) {
                return pub.findApiByName(restApiName, apiGatewayResponse.position, callback);
            }
        }
        return callback();
    });
};

/* eslint max-nested-callbacks: 0 */
pub.createApi = function createApi(inputParams, callback) {
    var params = {
        name: inputParams.name,
        description: inputParams.description
    };
    awsApiGateway.createRestApi(params, function (error, restApi) {
        if (error) {
            logger.log('Error RestApiService::createApi', { error: error, params: params });
            return callback(error);
        }
        ApiResourceService.getApiParentResource(restApi.id, function (getResourceError, parentResource) {
            if (getResourceError || !parentResource) {
                pub.deleteApi(restApi.id, function (deleteApiError) {
                    if (deleteApiError) {
                        return callback(deleteApiError);
                    }
                    return callback(getResourceError);
                });
            } else if (inputParams.corsConfig) {
                CorsService.putOptionsMethod(restApi.id, parentResource.id, inputParams.corsConfig, function (corsError) {
                    if (corsError) {
                        pub.deleteApi(restApi.id, function (deleteApiError2) {
                            if (deleteApiError2) {
                                return callback(deleteApiError2);
                            }
                            return callback(corsError);
                        });
                    } else {
                        restApi.parentResourceId = parentResource.id;
                        return callback(undefined, restApi);
                    }
                });
            } else {
                restApi.parentResourceId = parentResource.id;
                return callback(undefined, restApi);
            }
        });
    });
};

pub.deleteApi = function deleteApi(restApiId, callback) {
    var params = {
        restApiId: restApiId
    };
    awsApiGateway.deleteRestApi(params, function (error) {
        if (error && error.code !== 'NotFoundException') {
            logger.log('Error RestApiService::deleteApi', { error: error, params: params });
            return callback(error);
        }
        return callback();
    });
};

pub.patchApi = function patchApi(restApiId, eventParams, callback) {
    var patchOperations = RestApiEvent.getPatchOperations(eventParams);
    if (patchOperations.length === 0) {
        return callback();
    }

    var params = {
        restApiId: restApiId,
        patchOperations: patchOperations
    };
    awsApiGateway.updateRestApi(params, function (error, _restApi) {
        if (error) {
            logger.log('Error RestApiService::patchApi', { error: error, params: params });
        }
        return callback(error);
    });
};

module.exports = pub;
