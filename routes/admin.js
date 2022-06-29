var express = require('express');
var jwt = require("jwt-simple");
var router = express.Router();
var cfg = require("../app/config");
var db = require('../app/dbconnection');
var auth = require("../app/authstrategy")();

var utility = require("../app/utility.js");
var md5 = require('md5');
var path = require('path');
var mime = require('mime');
var fs = require('fs');
var crud = require('../app/crud');
let db_tofixed = 6;
let pagination_limit = 10;
var multer = require("multer");
const ercTokenFilePath = path.resolve(__dirname, "../../kranz-server-old/cryptoAssets/blockchains/ethereum/tokenlist.json");
const bepTokenFilePath = path.resolve(__dirname, "../../kranz-server-old/cryptoAssets/blockchains/smartchain/tokenlist.json");

var storage = multer.diskStorage({
	destination: function (req, file, callback) {
		if (!fs.existsSync("./public/icon"))
			fs.mkdirSync("./public/icon");
		if (!fs.existsSync("./public/icon/"))
			fs.mkdirSync("./public/icon/");

		callback(null, "./public/icon/");
	},
	filename: function (req, file, callback) {
		// var caption = file.originalname.replace(/ /g, "");
		callback(null, file.originalname);
	},
});


var iconUpload = multer({
	storage: storage,
	limits: { fieldNameSize: 100, fileSize: 10 * 1024 * 1024 },
});

/* GET users base page. */
router.get('/', function(req, res, next) {
	console.log(constants, " /users/");
	res.render('index', { title: 'Express' });
});

/* Latest balance callback function */
router.post('/login', function(req, res, next) {
	console.log("admin login");
	var username = req.body.username;
	var password = req.body.password;
	var curr_dt = new Date();
	
	if (username != false && password != false) {
	
		var dbcon = db.connect();
	
		dbcon.getConnection(function (err, con) {
	
			if (err) {
				console.log(err);
				return res.json({status:"fail",msg:"Something went wrong!"});
			}
	
			con.query("SELECT user_id, fname, username FROM admin WHERE username=? AND password=md5(?)", [username, password], function (err, result) {
				console.log(this.sql);
				console.log(err, " err");
				console.log(result, " result");
				if (err) {
					con.release();
					console.log(err);
					return res.json({status:"fail",msg:"Something went wrong!"});
				}
				if (result.length < 1) {
					con.release();
					return res.json({status:"fail",msg:"Invalid Username Password combination"});
				}
				if(result.length == 1) {
					con.release();
	
					var payload = {
						// username: username,
						// password: md5(password)
						username: username,
						password: md5(password),
						user_type: "ADMIN",
						logged_dt:curr_dt
					};
					console.log("payload ",payload);
					var token = jwt.encode(payload, cfg.jwtSecret);
	
					return res.json({
						status: "success",
						msg: "login success",
						data : {
							name: result[0].fname,
							id: result[0].admin_id,
							token: token
						}
					});
	
				} else {
					con.release();
					console.log(err);
					return res.json({status:"fail",msg:"Something went wrong!"});
				}
	
			})
		})
	
	} else {
		return res.json({status:"fail",msg: "All fields are required"});
	}
	
});

// let ercLength = 0;
/* POST erc list. */
router.post('/erc', auth.authenticate(), async function(req, res, next){
	if(req.user.user_type == "ADMIN") {
		let pageNo = req.body.pageNo;
		if(!pageNo) {
			pageNo = 1;
		}
		var allErcResult = await (allErc({pageNo: pageNo, isErc: req.body.isErc}));
		// console.log("allErcResult ",allErcResult)
		// ercLength = allErcResult.length;
		// console.log("ercLength ",ercLength)
		if(allErcResult) {
			return res.json({status:1,data:allErcResult})
		} else {
			return res.json({status:"fail",msg:"No currencies found"})
		}
	} else {
		res.send({status:"fail",msg:"Unauthorized"});
	}
});

/* POST set beta password. */
router.post('/set-password', auth.authenticate(), async function(req, res, next){
	console.log("req.suer ",req.user)
	if(req.user.user_type == "ADMIN") {
		let password = req.body.password;
		if(!password) {
			return res.json({status:0,msg:"password is required"})
		}
		let passwordUpdateResult = await crud.update("admin",{"user_id":req.user.user_id}, {"beta_password":md5(password)});
		console.log("passwordUpdateResult ",passwordUpdateResult)
		return res.json({status:1,msg:"password changed successfully"})
	} else {
		res.send({status:"fail",msg:"Unauthorized"});
	}
});

/* POST all erc count. */
router.post('/erc-count', auth.authenticate(), async function(req, res, next){
	if(req.user.user_type == "ADMIN") {
		var ercCountResult = await (allErcCount({isErc: req.body.isErc}));
		console.log("ercCountResult ",ercCountResult)
		if(ercCountResult) {
			return res.json({status:1,count:ercCountResult})
		} else {
			return res.json({status:"fail",msg:"No currencies found"})
		}
	} else {
		res.send({status:"fail",msg:"Unauthorized"});
	}
});

/* Delete Erc coin. */
router.post('/erc-delete', auth.authenticate(), async function(req, res, next){
	if(req.user.user_type == "ADMIN") {
		console.log("address ",req.body.address)
		var ercDeleteResult = await (deleteErc({address: req.body.address, isErc: req.body.isErc}));
		if(ercDeleteResult) {
			return res.json({status:1})
		} else {
			return res.json({status:"fail",msg:"No currencies found"})
		}
	} else {
		res.send({status:"fail",msg:"Unauthorized"});
	}
});

/* Add Erc coin. */
router.post('/erc-new', auth.authenticate(), iconUpload.single("icon"), async function(req, res, next){
	if(req.user.user_type == "ADMIN") {
		const { body: { address, name, symbol, decimals, logoUrl, isErc } } = req;
		let logoPath;

		console.log("req.file ",req.file)
		if (req.file) {
			logoPath = "/" + req.file.path;
		} else {
			logoPath = logoUrl
		}
		console.log("logoPath ",logoPath)
		let coinType = "ERC20";
		if(!isErc) {
			coinType = "BEP20";
		}
		let addObj = {
            "asset": "c60_t0x0000000000095413afC295d19EDeb1Ad7B71c952",
            "type": coinType,
            "address": address,
            "name": name,
            "symbol": symbol,
            "decimals": parseInt(decimals),
            "logoURI": logoPath,
            "pairs": []
        }
        console.log("addObj ",addObj)
		var ercAddResult = await (addErc(addObj, isErc));
		if(ercAddResult) {
			return res.json({status:1})
		} else {
			return res.json({status:"fail",msg:"No currencies found"})
		}
	} else {
		res.send({status:"fail",msg:"Unauthorized"});
	}
});

/* test sort. */
router.post('/erc-sort', 
	
	  async function(req, res, next){
	
	// if(req.user.user_type == "ADMIN") {
		
		var ercAddResult = await (testSort("true"));
		if(ercAddResult) {
			return res.json({status:1})
		} else {
			return res.json({status:"fail",msg:"No currencies found"})
		}
	// } else {
	// 	res.send({status:"fail",msg:"Unauthorized"});
	// }
});

/* POST password edit  */
router.post('/password-edit', auth.authenticate(), async function(req, res, next) {
	if(req.user.user_type == "ADMIN") {
		const { body: { oldpassword, password } } = req;
		if (!oldpassword) { return res.status(422).json({errors: {oldpassword: 'is required'}}) }
		if (!password) { return res.status(422).json({errors: {password: 'is required'}}) }
		
		let oldPasswordCheck = await crud.read("admin","user_id",{"password":md5(oldpassword),"user_id":req.user.user_id});
		if(oldPasswordCheck == "NULL") {
			return res.send({status:"fail",msg:"Old password is wrong"})
		}

		let passwordUpdateResult = await crud.update("admin",{"user_id":req.user.user_id}, {"password":md5(password)});
		console.log("passwordUpdateResult ",passwordUpdateResult)

		res.send({status:"success",msg:"Password updated successfully"})
	} else {
		res.send({status:"fail",msg:"Unauthorized"});
	}
});



function allErc(qObj) {
	return new Promise(function(resolve, reject) {
		console.log("allErc ",qObj.isErc)
		let filePath;
		if(qObj.isErc == "true") {
			filePath = ercTokenFilePath;
		} else {
			filePath = bepTokenFilePath;
		}
		fs.readFile(filePath, 'utf8', function(err, data){
			if(err) {
		    	reject(err);
		    } else {
		    	let parsedData = JSON.parse(data);
		    	resolve(parsedData.tokens)
		    }
		});
	});
}

function deleteErc(qObj) {
	return new Promise(function(resolve, reject) {
		let filePath;
		if(qObj.isErc == "true") {
			filePath = ercTokenFilePath;
		} else {
			filePath = bepTokenFilePath;
		}
		fs.readFile(filePath, 'utf8', function(err, data){
			if(err) {
				reject(err);
			} else {
				let parsedData = JSON.parse(data);
				let tokens = parsedData.tokens;
				tokens.forEach((value, i) => {
					if(value.address == qObj.address) {
						tokens.splice(i, 1)
					}
				});
				parsedData.tokens = tokens;
				fs.writeFile(filePath, JSON.stringify(parsedData), function writeJSON(err) {
					if (err) return reject({status:0});
				});
				resolve({status:1})
			}
		});
	});
}

function addErc(qObj, isErc) {
	return new Promise(function(resolve, reject) {
		let filePath;
		let tokenSymbolAtTop;
		if(isErc == "true") {
			tokenSymbolAtTop = "ETH"
			filePath = ercTokenFilePath;
		} else {
			tokenSymbolAtTop = "BNB"
			filePath = bepTokenFilePath;
		}
		console.log("tokenSymbolAtTop ",tokenSymbolAtTop)
		fs.readFile(filePath, 'utf8', function(err, data){
			if(err) {
				reject(err);
			} else {
				let parsedData = JSON.parse(data);
				let tokens = parsedData.tokens;
				tokens.push(qObj);

				// sort by name & shift ETH, BNB to top
				let mainToken;
				tokens.forEach((value, i) => {
					if(value.symbol == tokenSymbolAtTop) {
						mainToken = value;
						tokens.splice(i, 1)
					}
				});
				
				tokens = tokens.sort(dynamicSort("name"));
				if(mainToken) {
					console.log("mainToken ",mainToken);
					tokens.unshift(mainToken);
				}
				// end

				parsedData.tokens = tokens;
				fs.writeFile(filePath, JSON.stringify(parsedData), function writeJSON(err) {
					if (err) return reject({status:0});
				});
				resolve({status:1})
			}
		});
	});
}

function allErcCount(qObj) {
	return new Promise(function(resolve, reject) {
		console.log("allErcCount ",qObj.isErc)
		let filePath;
		if(qObj.isErc == "true") {
			console.log("erc")
			filePath = ercTokenFilePath;
		} else {
			console.log("bep")
			filePath = bepTokenFilePath;
		}
		fs.readFile(filePath, 'utf8', function(err, data){
			if(err) {
		    	reject(err);
		    } else {
		    	let parsedData = JSON.parse(data);
		    	resolve(parsedData.tokens.length)
		    }
		});
	});
}


function testSort(isErc) {
	return new Promise(function(resolve, reject) {
		let filePath;
		if(isErc == "true") {
			filePath = ercTokenFilePath;
		} else {
			filePath = bepTokenFilePath;
		}
		fs.readFile(filePath, 'utf8', function(err, data){
			if(err) {
				reject(err);
			} else {
				let parsedData = JSON.parse(data);
				let tokens = parsedData.tokens;
				console.log("before ",tokens.length)
				// sort by name & shift ETH, BNB to top
				let mainToken;
				tokens.forEach((value, i) => {
					if(value.symbol == "ETH") {
						mainToken = value;
						tokens.splice(i, 1)
					}
				});
				
				tokens = tokens.sort(dynamicSort("name"));
				if(mainToken) {
					console.log("mainToken ",mainToken);
					tokens.unshift(mainToken);
				}
				// end

				console.log("after ",tokens.length)
				parsedData.tokens = tokens;
				console.log("sorted Array ",JSON.stringify(parsedData.tokens))
				fs.writeFile(filePath, JSON.stringify(parsedData), function writeJSON(err) {
					if (err) return reject({status:0});
				});
				resolve({status:1})
			}
		});
	});
}

function dynamicSort(property) {
    var sortOrder = 1;
    if(property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function (a,b) {
        /* next line works with strings and numbers, 
         * and you may want to customize it to your needs
         */
        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
    }
}
module.exports = router;