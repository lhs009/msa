/**
 * file: dynamoUtil.js
 * writer: hwansoo lee
 * description:
 * dynamodb access wrapper
 */
"use strict";

const AWS = require("aws-sdk");
AWS.config.update({
  region: "local",
  endpoint: "http://dynamodb-local:8000",
  accessKeyId: "5anz2",
  secretAccessKey: "ur800a",
  //region: process.env.AWS_REGION,
  // accessKeyId: process.env.AWS_ACCESSKEY,
  // secretAccessKey: process.env.AWS_SECRETKEY,
});
const documentClient = new AWS.DynamoDB.DocumentClient({
  apiVersion: "2012-08-10",
});
// select db
const get = async (key, table) => {
  const params = {
    TableName: table,
    Key: key,
  };
  return documentClient.get(params).promise();
};

// insert db
const put = async (data, table) => {
  const params = {
    TableName: table,
    Item: data,
  };
  return documentClient.put(params).promise();
};

const remove = async (key, table) => {
  const params = {
    TableName: table,
    Key: key,
  };
  return documentClient.delete(params).promise();
};

const getDocumentClient = () => documentClient;

module.exports = {
  get,
  put,
  remove,
  getDocumentClient,
};
