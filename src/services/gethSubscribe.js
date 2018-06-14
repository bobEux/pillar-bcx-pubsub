const logger = require('../utils/logger.js');
const colors = require('colors');

const ERC20ABI = require('./ERC20ABI.json');

const gethConnect = require('./gethConnect.js');
const bcx = require('./bcx.js');
const processTx = require('./processTx.js');
// const abiDecoder = require('abi-decoder');
const dbServices = require('./dbServices.js');


function subscribePendingTx(accounts, assets) {
  const subscribePromise = new Promise(((resolve, reject) => {
    try {
      gethConnect.web3.eth.subscribe('pendingTransactions', (err, res) => {})
        .on('data', (txHash) => {
          if ((txHash !== null) && (txHash !== '')) {
            bcx.getTxInfo(txHash)
              .then((txInfo) => {
                if (txInfo != null) {
                  processTx.newPendingTx(txInfo, accounts, assets);
                }
              })
              .catch((e) => { reject(e); });
          }
        })
        .on('endSubscribePendingTx', () => { // Used for testing only
          logger.info('END PENDING TX SUBSCRIBTION\n');
          resolve();
        });
      logger.info(colors.green.bold('Subscribed to Pending Tx and Smart Contract Calls\n'));
    } catch (e) { reject(e); }
  }));
  return (subscribePromise);
}
module.exports.subscribePendingTx = subscribePendingTx;

function subscribeBlockHeaders() {
  const subscribePromise = new Promise((resolve, reject) => {
    try {
      gethConnect.web3.eth.subscribe('newBlockHeaders', (err, res) => {})
        .on('data', (blockHeader) => {
          if (blockHeader && blockHeader.number && blockHeader.hash) {
            logger.info(colors.gray(`NEW BLOCK MINED : # ${blockHeader.number} Hash = ${blockHeader.hash}\n`));
            // Check for pending tx in database and update their status
            dbServices.dbCollections.transactions.listPending()
              .then((pendingTxArray) => {
                processTx.checkPendingTx(pendingTxArray, blockHeader.number)
                  .then(() => {
                    dbServices.dbCollections.transactions.updateTxHistoryHeight(blockHeader.number)
                      .then(() => {
                        // logger.info(colors.green.bold('Highest Block Number for Tx History: '+blockHeader.number+'\n'))
                      })
                      .catch((e) => { reject(e); });
                  })
                  .catch((e) => { reject(e); });
              })
              .catch((e) => { reject(e); });
          }
        })
        .on('endSubscribeBlockHeaders', () => { // Used for testing only
          logger.info('END BLOCK HEADERS SUBSCRIBTION\n');
          resolve();
        });
      logger.info(colors.green.bold('Subscribed to Block Headers\n'));
    } catch (e) { reject(e); }
  });
  return (subscribePromise);
}
module.exports.subscribeBlockHeaders = subscribeBlockHeaders;


function subscribeAllDBERC20SmartContracts(accounts, assets) {
  try {
    const smartContractsArray = assets.values();
    smartContractsArray.forEach((ERC20SmartContract) => {
      module.exports.subscribeERC20SmartContract(accounts, assets, ERC20SmartContract);
    });
    logger.info(colors.green.bold('Subscribed to DB ERC20 Smart Contracts Transfer Events\n'));
  } catch (e) { logger.info(e); }
}
module.exports.subscribeAllDBERC20SmartContracts = subscribeAllDBERC20SmartContracts;

function subscribeERC20SmartContract(accounts, assets, ERC20SmartContract) {
  try {
    if (ERC20SmartContract.contractAddress !== 'contractAddress') {
      const ERC20SmartContractObject =
        new gethConnect.web3.eth.Contract(ERC20ABI, ERC20SmartContract.contractAddress);
      ERC20SmartContractObject.events.Transfer((error, result) => {
        if (!error) {
          processTx.checkTokenTransferEvent(accounts, assets, result, ERC20SmartContract);
        } else {
          logger.info(error);
        }
      });
    }
  } catch (e) { logger.info(e); }
}
module.exports.subscribeERC20SmartContract = subscribeERC20SmartContract;

