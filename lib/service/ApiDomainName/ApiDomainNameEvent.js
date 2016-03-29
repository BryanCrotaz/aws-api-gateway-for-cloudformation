'use strict';

var patchOperationsHelper = require('../patchOperationsHelper');
var certificateParser = require('../util/certificateParser');

var pub = {};

/* eslint max-statements: 0 */
/* eslint complexity: 0 */
pub.getParameters = function getParameters(event) {
    var eventParams = {
        params: extractParams(event.ResourceProperties),
        old: extractParams(event.OldResourceProperties)
    };

    if (event.RequestType !== 'Delete') {
        // Validation

        if (!eventParams.params.iamServerCertificateName) {
            if (!eventParams.params.certificateBody && !eventParams.params.certificateChain) {
                throw new Error('Missing parameter {iamServerCertificateName or certificateBody and certificateChain} in input');
            }
            if (!eventParams.params.certificateBody) {
                throw new Error('Missing parameter {certificateBody} in input');
            }
            if (!eventParams.params.certificateChain) {
                throw new Error('Missing parameter {certificateChain} in input');
            }
        }

        if (!eventParams.params.certificateName) {
            throw new Error('Missing parameter {certificateName} in input');
        }
        if (!eventParams.params.certificatePrivateKey) {
            throw new Error('Missing parameter {certificatePrivateKey} in input');
        }
        if (!eventParams.params.domainName) {
            throw new Error('Missing parameter {domainName} in input');
        }

        // Parse the certificate parts as they are mangled by CloudFormation
        if (eventParams.params.certificateBody && eventParams.params.certificateChain) {
            eventParams.params.certificateBody = certificateParser.parseCertificate(eventParams.params.certificateBody, certificateParser.CERTIFICATE_PART.BODY);
            eventParams.params.certificateChain = certificateParser.parseCertificate(eventParams.params.certificateChain, certificateParser.CERTIFICATE_PART.CHAIN);
        }
        eventParams.params.certificatePrivateKey = certificateParser.parseCertificate(eventParams.params.certificatePrivateKey, certificateParser.CERTIFICATE_PART.PRIVATE_KEY);

        if (eventParams.old) {
            if (eventParams.old.certificateBody && eventParams.old.certificateChain) {
                eventParams.old.certificateBody = certificateParser.parseCertificate(eventParams.old.certificateBody, certificateParser.CERTIFICATE_PART.BODY);
                eventParams.old.certificateChain = certificateParser.parseCertificate(eventParams.old.certificateChain, certificateParser.CERTIFICATE_PART.CHAIN);
            }
            eventParams.old.certificatePrivateKey = certificateParser.parseCertificate(eventParams.old.certificatePrivateKey, certificateParser.CERTIFICATE_PART.PRIVATE_KEY);
        }
    }

    return eventParams;
};

var allowedModifications = {
    add: [],
    replace: ['domainName', 'certificateName', 'certificateBody', 'certificatePrivateKey', 'certificateChain'],
    remove: []
};
pub.getPatchOperations = function (eventParams) {
    var modifications = patchOperationsHelper.getAllowedModifications(eventParams.params, eventParams.old, allowedModifications);
    return patchOperationsHelper.getOperations(eventParams.params, modifications);
};

module.exports = pub;

function extractParams(resourceProperties) {
    if (!resourceProperties) {
        return undefined;
    }
    return {
        iamServerCertificateName: resourceProperties.iamServerCertificateName,
        certificateBody: resourceProperties.certificateBody,
        certificateChain: resourceProperties.certificateChain,
        certificateName: resourceProperties.certificateName,
        certificatePrivateKey: resourceProperties.certificatePrivateKey,
        domainName: resourceProperties.domainName
    };
}
