var path = require("path");
var fs = require("fs");
var awsPromised = require('aws-promised');
var cf = awsPromised.cloudFormation({
    region: "us-east-1"
});

var BASE_STACK_NAME="ApiGatewayCloudFormation";
var LAMBDA_OUTPUT_KEY="LambdaFunction";


var exec = function (command)
{
    console.log("Running command:\n" + command);
    //run command
}

console.log("Making sure Lambda has not already been setup\n");
//var describeStacks = exec("aws cloudformation describe-stacks --stack-name " + BASE_STACK_NAME + " >NUL 2>&1");
cf.describeStacksPromised({
    StackName: BASE_STACK_NAME
})
.then(function (describeStacks) {
    console.log("describeStacks returned with:\n\n" + JSON.stringify(describeStacks, null, 2));

    console.log("\n\n ====> Success <====\n\nCloudFormation stack " + BASE_STACK_NAME + " already exists. Continuing with deploy...");
    process.exit(0);
})
.catch(function (err)
{
    console.log("Creating CloudFormation stack");
    var templateDirectory = path.resolve("_scripts/install"); // $({ pwd; echo "_scripts/install"; } | tr "\n" "/")
    console.log("Template directory is " + templateDirectory);

    var templatePath = path.join(templateDirectory, "ApiGatewayCloudFormation.template");
    var template = JSON.parse(fs.readFileSync(templatePath));
    var templateBody = JSON.stringify(template, null, 2);
    console.log("Template body is:\n" + templateBody);

    return cf.createStackPromised({
        StackName: BASE_STACK_NAME,
        TemplateBody: templateBody,
        Capabilities: [
            "CAPABILITY_IAM"
        ]
    });
})
.then(function (stackResponse) {
    console.log("createStack returned with:\n");
    console.log({stackResponse})

    console.log("\n\n ====> Success <====\n\nLook up the lambda ARN yourself cos we're lazy");
})
.catch(function (err) {
    console.log("\n\n ====> Failed <====\n\nCreateStack threw an error:\n" + err);
});

return;

// var STACK_STATUS = "N/A";
// while [ "${STACK_STATUS}" != "CREATE_COMPLETE" ]; do
//     console.log("Waiting for CloudFormation to complete. Current status: [${STACK_STATUS}]...");
//     sleep 10
//     STACK_STATUS=$(aws cloudformation describe-stacks --stack-name ${stackId} --output text |head -n1|cut -f7)
//     if [ "${STACK_STATUS}" == "ROLLBACK_IN_PROGRESS" ] || [ "${STACK_STATUS}" == "ROLLBACK_COMPLETE" ]; then
//         console.log("CloudFormation create stack failed. Stack is being deleted. See the CloudFormation Console detailed information.");
//         process.exit(1);
//     fi
// done;

// console.log("CloudFormation stack creation complete: ${stackId}");

// var lambdaArn="";
// while IFS=' ' read -ra outputs; do
//     for output in "${outputs[@]}"; do
//         key=$(echo "${output}" |cut -f1);
//         if [ "${key}" == "${LAMBDA_OUTPUT_KEY}" ]; then
//             lambdaArn=$(echo "${output}" |cut -f2);
//         fi;
//     done;
// done <<< "$(aws cloudformation describe-stacks --stack-name ${stackId} --output text --query Stacks[*].Outputs)";

// if [ -z "${lambdaArn}" ]; then
//     console.log("Unable to find Output ${LAMBDA_OUTPUT_KEY}");
//     process.exit(1);;
// else
//     console.log("Updating deploy script");
//     echo "${lambdaArn}" > './lambda-arn'
// fi