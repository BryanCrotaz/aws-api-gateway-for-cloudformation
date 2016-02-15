'use strict';

var RestApiService = require('../service/RestApi/RestApiService');
var RestApiEvent = require('../service/RestApi/RestApiEvent');
var CloudFormationResourceTracker = require('../service/CloudFormationResourceTracker');

var pub = {};

pub.getParameters = function (event) {
    return RestApiEvent.getParameters(event);
};

pub.createResource = function createResource(event, context, eventParams, callback) {
    RestApiService.createApi(eventParams.params.name, eventParams.params.description, function (error, restApi) {
        if (error) {
            return callback(error);
        }
        getForResponse(event, context, restApi.id, callback);
    });
};

pub.deleteResource = function deleteResource(event, context, _eventParams, callback) {
    RestApiService.deleteApi(event.PhysicalResourceId, function (deleteError) {
        if (deleteError) {
            return callback(deleteError);
        }
        return callback(error);
    });
};

pub.updateResource = function updateResource(event, context, eventParams, callback) {
    RestApiService.patchApi(event.PhysicalResourceId, eventParams, function (patchError, restApi) {
        if (patchError) {
            return callback(patchError);
        }
        getForResponse(event, context, restApi.id, callback);
    });
};

module.exports = pub;

function getForResponse(event, context, restApiId, callback) {
    RestApiService.getForResponse(restApiId, function (getError, restApi) {
        if (getError) {
            return callback(getError);
        }
        restApi.physicalResourceId = restApi.id;
        return callback(error, restApi);
    });
}
