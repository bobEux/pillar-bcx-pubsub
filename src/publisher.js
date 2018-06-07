#!/usr/bin/env node
/** ************************************************************************************ */
/*  Publisher                                                                          */
/** ************************************************************************************ */
const amqp = require('amqplib/callback_api');
const ipc = require('node-ipc');
const logger = require('./utils/logger');
const mongoose = require('mongoose');
const ethAddresses = require('./models/accounts_model').Accounts;
const gethConnect = require('./services/gethConnect.js');
const dbServices = require('./services/dbServices.js');
const bcx = require('./services/bcx.js');
const gethSubscribe = require('./services/gethSubscribe.js');
const processTx = require('./services/processTx.js');
const rmqServices = require('./services/rmqServices.js');
const abiDecoder = require('abi-decoder');
require('dotenv').config();
const mongoUser = process.env.MONGO_USER;
const mongoPwd = process.env.MONGO_PWD;
const serverIP = process.env.SERVER;
const dbName = process.env.DBNAME;
const mongoUrl = `mongodb://${mongoUser}:${mongoPwd}@${serverIP}:27017/${dbName}`;

var HashMap = require('hashmap');
var wallets;
//starting point
var latestId;

process.on('message',(data) => {
  console.log('Publisher received message: ' + JSON.stringify(data));
  var message = data.message;
  for(var i=0;i<message.length;i++) {
    var obj = message[i];
    logger.info('Publisher received notification to monitor :' + obj.walletId + ' for pillarId: ' + obj.pillarId);
    wallets.set(obj.walletId,obj.pillarId);
    latestId = obj.id;
  }
});

exports.initIPC = function () {
  try {
    logger.info('Started executing publisher.initIPC()');

    wallets = new HashMap();

    setInterval(function() {
      exports.poll()
    },5000);
    exports.initBCXMQ();
  } catch(err) {
    logger.error('Publisher.init() failed: ',err.message);
    throw err;
  } finally {
    logger.info('Exited publisher.initIPC()');
  }
};

exports.poll = function() {
  logger.info('Requesting new wallet :');

  process.send({
    type: 'wallet.request',
    message : latestId
  });
};


exports.initSubscriptions = function (channel, queue) {
  console.log(rmqServices.sendMessage)
  /* CONNECT TO GETH NODE */
  gethConnect.gethConnectDisplay()
    .then((web3) => {
      /* CONNECT TO DATABASE --> NEED TO REPLACE THIS WITH HASHTABLE */
      dbServices.dbConnectDisplayAccounts(mongoUrl)
        .then((dbCollections) => {
          /* SUBSCRIBE TO GETH NODE EVENTS */
          gethSubscribe.subscribePendingTx(web3, bcx, processTx, dbCollections, abiDecoder, channel, queue, rmqServices);
          gethSubscribe.subscribeBlockHeaders(
            web3, gethSubscribe, bcx, processTx, dbServices,
            dbCollections, abiDecoder, channel, queue, rmqServices,
          );
          gethSubscribe.subscribeAllDBERC20SmartContracts(web3, bcx, processTx, dbCollections, channel, queue, rmqServices);
        });
    });
};

exports.walletReceived = function () {

};


// this.initIPC();
rmqServices.initMQ()
  .then((MQParams) => {
    const channel = MQParams.ch;
    const queue = MQParams.q;
    this.initSubscriptions(channel, queue);
  });
