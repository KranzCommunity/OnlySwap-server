var express = require("express");
var router = express.Router();

var fs = require("fs");
const path = require("path");

/* GET users listing. */
router.get("/ethereum-assets", function (req, res, next) {
	console.log(
		`${__dirname}../cryptoAssets/blockchains/ethereum/tokenlist.json`
	);

	var obj;
	let filePath = path.join(
		__dirname,
		"../cryptoAssets/blockchains/ethereum/tokenlist.json"
	);
	fs.readFile(filePath, "utf8", function (err, data) {
		if (err) throw err;
		obj = JSON.parse(data);
		res.send(obj.tokens);
	});
});

router.get("/bsc-assets", function (req, res, next) {
        console.log(
                `${__dirname}../cryptoAssets/blockchains/smartchain/tokenlist.json`
        );

        var obj;
        let filePath = path.join(
                __dirname,
                "../cryptoAssets/blockchains/smartchain/tokenlist.json"
        );
        fs.readFile(filePath, "utf8", function (err, data) {
                if (err) throw err;
                obj = JSON.parse(data);
                res.send(obj.tokens);
        });
});

module.exports = router;
