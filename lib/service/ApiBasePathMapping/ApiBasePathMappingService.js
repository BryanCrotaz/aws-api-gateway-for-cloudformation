'use strict';

var getWrappedService = require('../util/api-gateway-retry-wrapper');
var awsApiGateway = getWrappedService({ apiVersion: '2015-07-09' });
var logger = require('../util/logger');

var pub = {};

pub.getForResponse = function getForResponse(basePath, domainName, callback) {
    var params = {
        basePath: basePath,
        domainName: domainName
    };
    awsApiGateway.getBasePathMapping(params, function (error, apiBasePathMapping) {
        if (error) {
            logger.log('Error ApiBasePathService::getForResponse', error, params);
        }
        return callback(error, apiBasePathMapping);
    });
};

pub.createBasePathMapping = function createBasePathMapping(parameters, callback) {
    createDeployment(parameters, function (createDeploymentError) {
        if (createDeploymentError) {
            return callback(createDeploymentError);
        }
        var params = {
            domainName: parameters.domainName,
            restApiId: parameters.restApiId,
            basePath: parameters.basePath,
            stage: parameters.stage
        };
        awsApiGateway.createBasePathMapping(params, function (error, apiBasePathMapping) {
            if (error) {
                logger.log('Error ApiBasePathService::createBasePathMapping', error, params);
                return callback(error);
            }
            apiBasePathMapping.physicalResourceId = parameters.domainName + '/' + parameters.basePath;
            callback(undefined, apiBasePathMapping);
        });
    });
};

pub.deleteBasePathMapping = function deleteBasePathMapping(parameters, callback) {
    var params = {
        domainName: parameters.domainName,
        basePath: parameters.basePath
    };
    awsApiGateway.deleteBasePathMapping(params, function (error) {
        if (error && error.code !== 'NotFoundException') {
            logger.log('Error ApiBasePathService::deleteBasePathMapping', error, params);
            return callback(error);
        }
        callback();
    });
};

pub.patchBasePathMapping = function patchBasePathMapping(_basePath, _domainName, _eventParams, callback) {
    return callback();
    // Patching currently not allowed
    //var patchOperations = ApiBasePathMappingEvent.getPatchOperations(eventParams);
    //if (patchOperations.length === 0) {
    //    return callback();
    //}
    //var params = {
    //    basePath: basePath,
    //    domainName: domainName,
    //    patchOperations: patchOperations
    //};
    //awsApiGateway.updateBasePathMapping(params, function(error, apiBasePathMapping) {
    //    if (error && error.code !== 'NotFoundException') {
    //        logger.log('Error ApiBasePathService::patchBasePathMapping', error, params);
    //        return callback(error);
    //    }
    //    return callback(undefined, apiBasePathMapping);
    //});
};

module.exports = pub;

function createDeployment(parameters, callback) {
    var getStageParams = {
        stageName: parameters.stage,
        restApiId: parameters.restApiId
    };
    awsApiGateway.getStage(getStageParams, function (getStageError, stage) {
        if (getStageError && getStageError.code !== 'NotFoundException') {
            logger.log('Error ApiBasePathService::getStage', getStageError, getStageParams);
            return callback(getStageError);
        } else if (stage) {
            return callback();
        }

        var createDeploymentParams = {
            restApiId: parameters.restApiId,
            stageName: parameters.stage,
            description: 'Created by APIGatewayForCloudFormation',
            stageDescription: 'Created by APIGatewayForCloudFormation'
        };
        awsApiGateway.createDeployment(createDeploymentParams, function (createDeploymentError) {
            if (createDeploymentError) {
                logger.log('Error ApiBasePathService::createDeployment', createDeploymentError, createDeploymentParams);
            }
            return callback(createDeploymentError);
        });
    });
}
