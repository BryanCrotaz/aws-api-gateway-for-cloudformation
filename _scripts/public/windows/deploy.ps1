param([string]$name="ApiGatewayCloudFormation",$version="latest")

lambdaOutputKey="LambdaFunction"

lambdaArn = &"aws" cloudformation describe-stacks --stack-name $name --output text --query "Stacks[0].Outputs[?OutputKey=='$lambdaOutputKey'].{Value:OutputValue}"
if ($lambdaArn.Equals("") ) {
    "You have to run make install before deploying"
    Exit
}

rm $version
curl -O $version http://apigatewaycloudformation.s3-website-eu-west-1.amazonaws.com/builds/$version
aws lambda update-function-code --function-name "$lambdaArn" --zip-file fileb://$version --publish
rm $version

"ApiGateway for CloudFormation has been updated"
"ServiceToken for CloudFormation: $lambdaArn"