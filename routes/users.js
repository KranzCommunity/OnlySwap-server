var express = require('express');
var router = express.Router();
var Web3 = require('web3');
var limitOrderProtocol = require('limit-order-protocol');
var auth = require("../app/authstrategy")();
var crud = require('../app/crud');
var cfg = require('../app/config');
var jwt = require("jwt-simple");
var db = require("../app/dbconnection");
var utility = require("../app/utility.js");
const web3 = new Web3(new Web3.providers.HttpProvider(cfg.web3Provider));
var md5 = require('md5');
/* GET users listing. */
router.get('/', auth.authenticate(), function(req, res, next) {
  console.log("req.user ",req.user)
  res.send('respond with a resource');
});

// add user
router.post('/', async function(req, res, next) {
  const { body: { walletAddress, chainId } } = req;
  if(!walletAddress || !chainId) {
    return res.send({status:0,msg:"Wallet Address & ChainId required"});
  }

  var payload = {
    address: walletAddress,
    chainId: chainId,
    user_type: "USER"
  };
  var token = jwt.encode(payload, cfg.jwtSecret);

  let checkUserExists = await crud.read("users","*",{"address":walletAddress});
  
  if(checkUserExists == "NULL") {
    let addUserResult = await crud.create("users", {
      "address": walletAddress,
      "chainId": chainId,
      "is_active": 1
    });
  }
  return res.json({status:1,msg:"User added",token:token})
  
});

let serverLimitOrderTypedData;

// build limit order
router.post('/limit-order', async function(req, res, next) {
  try {
    
    const { body: { 
      address, chainId, salt, makerAsset, takerAsset, makerAssetData, takerAssetData, getMakerAmount, getTakerAmount, predicate, 
      permit, interaction, signature, orderHash, makerAmount, takerAmount, thresholdAmount, makerToken, takerToken, limitOrderContract, expiry } } = req;
    
    let price = parseFloat(takerAmount) / parseFloat(makerAmount);

    let checkTradeExists = await crud.read("trades","*",{"address":address,"salt":salt});
    if(checkTradeExists != "NULL") {
      return res.json({ status:0, msg: "trade already exists" })
    }
    let addResult = await crud.create("trades", {
      "address":address,
      "chain_id":chainId,
      "price":price.toString(),
      "salt":salt,
      "maker_asset":makerAsset,
      "taker_asset":takerAsset,
      "maker_asset_data":makerAssetData,
      "taker_asset_data":takerAssetData,
      "get_maker_amount":getMakerAmount,
      "get_taker_amount":getTakerAmount,
      "predicate":predicate,
      "permit":permit,
      "interaction":interaction,
      "signature":signature,
      "order_hash":orderHash,
      "maker_amount":makerAmount,
      "taker_amount":takerAmount,
      "threshold_amount":thresholdAmount,
      "maker_token":makerToken,
      "taker_token":takerToken,
      "limit_order_contract":limitOrderContract
    })

    if(addResult.insertId) {
      let setResult = await setExpiryTimeQuery({value: expiry, id: addResult.insertId});
      console.log("setResult ",setResult);
    }
    
    res.json({ status:1, trade_id: addResult.insertId });

  } catch(e) {
    console.log("e ",e)
    return res.json({ status:0 })
  }
});

// match limit order
router.post('/match-limit-order', async function(req, res, next) {
  try {
    
    const { body: { 
      address, chainId, salt, makerAsset, takerAsset, makerAssetData, takerAssetData, getMakerAmount, getTakerAmount, predicate, 
      permit, interaction, signature, orderHash, makerAmount, takerAmount, thresholdAmount, makerToken, takerToken, limitOrderContract } } = req;
    
    let price = parseFloat(takerAmount) / parseFloat(makerAmount);

    let orderObj = {
      "address":address,
      "chain_id":chainId,
      "price":price.toString(),
      "salt":salt,
      "maker_asset":makerAsset,
      "taker_asset":takerAsset,
      "maker_asset_data":makerAssetData,
      "taker_asset_data":takerAssetData,
      "get_maker_amount":getMakerAmount,
      "get_taker_amount":getTakerAmount,
      "predicate":predicate,
      "permit":permit,
      "interaction":interaction,
      "signature":signature,
      "order_hash":orderHash,
      "maker_amount":makerAmount,
      "taker_amount":takerAmount,
      "threshold_amount":thresholdAmount,
      "maker_token":makerToken,
      "taker_token":takerToken,
      "limit_order_contract":limitOrderContract
    }

    let matchingTradeResult = await matchOrderQuery(orderObj);
    // console.log("matchingTradeResult ",matchingTradeResult)
    if(matchingTradeResult == "NULL") {
      return res.json({ status:0, msg: "no matching trade" })
    }
    
    let remainingTrades = new Array();
    await utility.forEachAsync(matchingTradeResult, async function (trade, index) {
      console.log("trade ",trade);
      let remaining = await getRemaining(trade.order_hash);
      if(remaining.status == 1) {
        if(parseInt(remaining.data.toString()) > 0) {
          remainingTrades.push(trade);
        } else {
          console.log("inactivate trade")
          let inactivateTrade = await crud.update("trades",{"id":trade.id}, {"is_active":0});
          console.log("inactivateTrade ",inactivateTrade);
          // return res.json({ status:0, msg: "no matching trade" });
        }
      } else if(remaining.status == 0) {
        remainingTrades.push(trade);
      }
    });
    
    res.json({ status:1, data: remainingTrades });

  } catch(e) {
    console.log("e ",e)
    return res.json({ status:0 })
  }
});

/* POST verify beta password. */
// router.post('/verify-password', async function(req, res, next){  
//   let password = req.body.password;
//   if(!password) {
//     return res.json({status:0,msg:"password is required"})
//   }
//   let result = await crud.read("admin","beta_password",{"user_id":1});
//   if(result == "NULL") {
//     return res.json({status:0,msg:"somethign went wrong"})
//   }
  
//   console.log("md5 ",md5(password));
//   console.log("table ",result)
//   if(md5(password) != result[0].beta_password) {
//     return res.json({status:0,msg:"Invalid password"})
//   } else {
//     return res.json({status:1,msg:"valid"})
//   }
  
// });

// update limit order signature
// router.post('/limit-order-signature', async function(req, res, next) {
//   const { body: { signature, trade_id, limitOrderTypedData } } = req;
//   console.log("serverLimitOrderTypedData ",serverLimitOrderTypedData);
//   // console.log("limitOrderTypedData ",typeof limitOrderTypedData);

//   let signatureUpdate = await crud.update("trade",{"id":trade_id}, {"signature":signature});

//   let tradeDetails = await crud.read("trade","*",{"id":trade_id});
  
//   const contractAddress = tradeDetails[0].contract_address;
//   const connector = new limitOrderProtocol.Web3ProviderConnector(web3);

//   const privateKey = 'bde18b9e2bdc30a0a58e990774367f237f3b77dc50013d93d42ec2d8aa3477f3';
//   // console.log("limitOrderProtocol ",limitOrderProtocol)
//   const privateKeyProviderConnector = new limitOrderProtocol.PrivateKeyProviderConnector(
//       privateKey,
//       connector
//   );

//   const limitOrderBuilder = new limitOrderProtocol.LimitOrderBuilder(
//       contractAddress,
//       1,
//       privateKeyProviderConnector
//   );
//   console.log("limitOrderBuilder ",limitOrderBuilder)

//   const limitOrderHash = limitOrderBuilder.buildLimitOrderHash(
//       serverLimitOrderTypedData
//   )
//   console.log("limitOrderHash ",limitOrderHash)
//   console.log("signatureUpdate ",signatureUpdate)
//   return res.json({status:1,msg:"saved successfully",hash:limitOrderHash})
// });

// POST limit order check remaining by orderhash
router.post('/check-remaining', async function(req, res, next) {
  let orderHash = req.body.orderHash;

  const contractAddress = cfg.limitOrderContract;
  
  const connector = new limitOrderProtocol.Web3ProviderConnector(web3);
  
  const limitOrderProtocolFacade = new limitOrderProtocol.LimitOrderProtocolFacade(
      contractAddress,
      connector
  );
  // console.log("limitOrderProtocolFacade ",limitOrderProtocolFacade)
  await limitOrderProtocolFacade.remaining(
      orderHash
  ).then((result) => {
    console.log('result ',result);
  }).catch((e) => {
    console.log("e ",e)
  });
  // console.log("remainigni ",remaining);
  return res.send({status:1})
  
});

// // fill limit order by trade_id
// router.post('/fill-limit-order', async function(req, res, next) {
//   const { body: { trade_id, userMakerAmount } } = req;
//   let tradeDetails = await crud.read("trade","*",{"id":trade_id});
//   console.log("tradeDetails ",tradeDetails)

//   const contractAddress = tradeDetails[0].contract_address;

//   let order = {
//     "salt": tradeDetails[0].salt,
//     "makerAsset": tradeDetails[0].maker_asset,
//     "takerAsset": tradeDetails[0].taker_asset,
//     "makerAssetData": tradeDetails[0].maker_asset_data,
//     "takerAssetData": tradeDetails[0].taker_asset_data,
//     "getMakerAmount": tradeDetails[0].get_maker_amount,
//     "getTakerAmount": tradeDetails[0].get_taker_amount,
//     "predicate": tradeDetails[0].predicate,
//     "permit": tradeDetails[0].permit,
//     "interaction": tradeDetails[0].interaction
//   };
//   let signature = tradeDetails[0].signature;

//   const makerAmount = userMakerAmount;
//   const takerAmount = '0';
//   const thresholdAmount = userMakerAmount;

//   const connector = new limitOrderProtocol.Web3ProviderConnector(web3);
//   const limitOrderProtocolFacade = new limitOrderProtocol.LimitOrderProtocolFacade(contractAddress, connector);
//   // console.log(" limitOrderProtocolFacade ",limitOrderProtocolFacade)
//   const callData = limitOrderProtocolFacade.fillLimitOrder(
//       order,
//       signature,
//       makerAmount,
//       takerAmount,
//       thresholdAmount
//   );
//   console.log(" callData ",callData)
  
//   return res.json({status:1,msg:"saved successfully",data: callData, contractAddress:contractAddress})
// });

router.post('/chart/:from_token/:to_token/:tf', async function(req, res, next) {
  const { params : { from_token, to_token, tf } } = req;
  let timeFrames = [300, 900, 14400, 86400, 604800];
  if(!timeFrames.includes(parseInt(tf))){
    return res.json({status:0,msg:"invalid timeframe"})
  }

  console.log("from_token ",from_token);
  console.log("to_token ",to_token);
  console.log("tf ",tf);

  getChartData({from_token: from_token, to_token: to_token, tf: tf}, (err, resp) => {
    if(err) {
      return res.send(err)
    } else {
      return res.send(resp);
    }
  })

  // res.json({status:1});
});

let getChartData = async function(data, callback) {
  try {
    let chartQueryResult = await chartQuery(data);

    if(chartQueryResult.status) {
      callback({status:1,data:chartQueryResult.data})
    } else {
      callback({status:0,msg:"No data available"});
    }
  } catch(e) {
    callback(e)
  }
}

function chartQuery(data) {
  return new Promise(function (resolve, reject) {
    var dbcon = db.connect();

    dbcon.getConnection(function (err, con) {
      if (err) {
        reject(err)
      }
      let tf = data.tf;
      con.query(
        `SELECT 
          FROM_UNIXTIME(floor(min(UNIX_TIMESTAMP(created_dt))/`+tf+`)*`+tf+`) as 'time',
          substring_index(min(concat(created_dt,'_',price)),'_',-1) as 'open',
          max(price) as 'high',
          min(price) as 'low',
          substring_index(max(concat(created_dt,'_',price)),'_',-1) as 'close'
         FROM trades
         WHERE maker_token=? AND taker_token=?
          group by floor(unix_timestamp(created_dt)/`+tf+`) order by created_dt LIMIT 100;
        `,
        [data.from_token, data.to_token],
        function (err, result) {
          con.destroy();
          // if issue in loading chart most probably error of SET GLOBAL sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''));
          // console.log("\n ", this.sql);
          console.log("\n err ",err)
          // console.log("\n result ",result)
          if (err) {
            reject(err);
          }
          if (result.length == 0) {
            resolve({status: 0});
          }
          resolve({
            status: 1,
            data: JSON.parse(JSON.stringify(result)),
          });
        }
      );
    });
  });
}

function matchOrderQuery(data) {
  return new Promise(function(resolve, reject) {
    var dbcon = db.connect();
    let limit, offset, query, params, search;
    
    // query = "SELECT * FROM trades WHERE maker_token = ? AND taker_token = ? AND maker_amount = ? AND taker_amount = ? AND is_active = ? ORDER BY ut.created_dt DESC;";
    // // reversing token & amount to find matching trade
    // params = [data.taker_token, data.maker_token, data.taker_amount, data.maker_amount, 1];
    
    query = "SELECT * FROM trades WHERE maker_asset = ? AND taker_asset = ? AND price <= ? AND is_active = ? AND expiry > NOW() ORDER BY price ASC LIMIT 1;";
    // reversing token & amount to find matching trade
    params = [data.taker_asset, data.maker_asset, data.maker_amount / data.taker_amount, 1];

    dbcon.getConnection(function (err, con) {
      if(err) {
        console.log(err);
        return false;
      }
      con.query(query,params, function (err, result) {
        con.release();
        console.log("\n ",this.sql);
        if (err) {
          reject(err);
        }
        if(result.length == 0) {
          resolve("NULL");
        }
        resolve(JSON.parse(JSON.stringify(result)));
      });
    });
  });
}

function getRemaining(orderHash) {
  return new Promise(async function(resolve, reject) {
    const connector = new limitOrderProtocol.Web3ProviderConnector(web3);
    const limitOrderProtocolFacade = new limitOrderProtocol.LimitOrderProtocolFacade(
        cfg.limitOrderContract,
        connector
    );
    await limitOrderProtocolFacade.remaining(
        orderHash
    ).then((result) => {
      console.log('result ',result);
      resolve({status:1,data:result})

    }).catch((e) => {
      console.log("e ",e)
      resolve({status:0})
    });
  });
}

router.post('/orders', async function(req, res, next) {
  const { body: { address, chainId, fromToken, toToken } } = req;
  if(!address || !chainId) {
    return res.send({status:0,msg:"Wallet Address & ChainId required"});
  }
  let userOrders = await crud.read("trades","*",{"address":address,"chain_id":chainId,"maker_token":fromToken,"taker_token":toToken});
  if(userOrders == "NULL") {
    return res.json({status:0,msg:"No orders found"})
  }
  res.json({status:1,msg:"User added",data:userOrders});
});

router.post('/order-cancel', async function(req, res, next) {
  const { body: { address, chainId, id } } = req;
  if(!address || !chainId || !id) {
    return res.send({status:0,msg:"Wallet Address & ChainId & OrderID required"});
  }
  let getOrder = await crud.read("trades","*",{"address":address,"chain_id":chainId,"id":id});
  if(getOrder == "NULL") {
    return res.json({status:0,msg:"Order not found"})
  } else {
    let inactivateTrade = await crud.update("trades",{"address":address,"chain_id":chainId,"id":id}, {"is_active":0});
    console.log("inactivateTrade ",inactivateTrade);
    return res.json({status:1,msg:"Order cancelled"});
  }
});

function setExpiryTimeQuery(data) {
	return new Promise(function(resolve, reject) {
		var dbcon = db.connect();
		let limit, offset, query, params, search;

		query = " UPDATE trades SET expiry = DATE_FORMAT(FROM_UNIXTIME(?), '%Y-%m-%d %H:%i:%s') WHERE id = ?";
		params = [data.value, data.id];

		dbcon.getConnection(function (err, con) {
			if(err) {
				console.log(err);
				return false;
			}
			con.query(query, params, function (err, result) {
				con.release();
				console.log("\n ", err);
        console.log("\n ",result);

				if (err) {
					reject(err);
				}
				if(result.length == 0) {
					resolve("NULL");
				}
				resolve(JSON.parse(JSON.stringify(result)));
			});
		});
	});
}

router.post('/test-expiry', async function(req, res, next) {
  let id = req.body.id;
  let expiry = req.body.expiry;
  // let setResult = await setExpiryTimeQuery({value: expiry.seconds, id: id})
  // console.log("setResult ",setResult);
  return res.send({status:1})
  
});
module.exports = router;
