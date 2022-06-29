var db = require('./dbconnection');
exports.create = function(tableName, data) {
	return new Promise(function(resolve, reject) {
		var dbcon = db.connect();
		var keys = Object.keys(data)
		var values = Object.values(data)
		var valuesQ = "";
		keys.forEach((key, index) => {
			if(index + 1 == keys.length) {
				valuesQ += "?"
			} else {
				valuesQ += "?,"
			}
		});
		var query = "INSERT IGNORE INTO "+tableName+"("+keys+") VALUES("+valuesQ+")";
		dbcon.getConnection(function (err, con) {
			if(err) {
				reject(null);
			}
			con.query(query, values, function (err, result) {
				con.release();
				if(err) {
					reject(null);
				}
				resolve(result);
			});
		})
	});
}
exports.read = function(tableName, columns, condition, conditionType) {
	return new Promise(function(resolve, reject) {
		var dbcon = db.connect();
		var type = "AND";
		var fields = "*";
		if(conditionType) {
			type = conditionType
		}
		if(columns) {
			fields = columns
		}
		var query = "SELECT "+fields+" FROM "+tableName;
		var params=[];
		if(condition) {
			var keys = Object.keys(condition)
			params = Object.values(condition)
			query += " WHERE ";
			keys.forEach((key, index) => {
				if(index + 1 == keys.length) {
					query += key+" = ?"
				} else {
					query += key+" = ? "+type+" "
				}
			});
		}
		dbcon.getConnection(function (err, con) {
			if(err) {
				reject(null);
			}
			con.query(query, params, function (err, result) {
				console.log("\n ",this.sql)
				con.release();
				if(err) {
					reject(null);
				}
				if(result.length < 1) {
					resolve("NULL");
				}
				let user = JSON.parse(JSON.stringify(result));
				resolve(user);
			});
		})
	});
}
exports.update = function(tableName, condition, data, conditionType) {
	return new Promise(function(resolve, reject) {
		var dbcon = db.connect();
		var type = "AND";
		if(conditionType) {
			type = conditionType
		}
		var dataKeys = Object.keys(data)
		var dataValues = Object.values(data)
		var conditionKeys = Object.keys(condition)
		var conditionValues = Object.values(condition)
		var query = "UPDATE "+tableName+" SET ";
		dataKeys.forEach((key, index) => {
			if(index + 1 == dataKeys.length) {
				query += key+" = ? WHERE "
			} else {
				query += key+" = ?, "
			}
		});
		conditionKeys.forEach((key, index) => {
			if(index + 1 == conditionKeys.length) {
				query += key+" = ?"
			} else {
				query += key+" = ? "+type+" "
			}
		});
		console.log("query ",query)
		var params = dataValues.concat(conditionValues)
		dbcon.getConnection(function (err, con) {
			if(err) {
				reject(null);
			}
			con.query(query, params, function (err, result) {
				console.log("\n ",this.sql)
				con.release();
				if(err) {
					reject(err);
				} else {
					resolve(result);
				}
			});
		})
	});
}
exports.delete = function(tableName, condition, conditionType) {
	return new Promise(function(resolve, reject) {
		var dbcon = db.connect();
		var type = "AND";
		if(conditionType) {
			type = conditionType
		}
		var conditionKeys = Object.keys(condition)
		var conditionValues = Object.values(condition)
		var query = "DELETE FROM "+tableName+" WHERE ";
		conditionKeys.forEach((key, index) => {
			if(index + 1 == conditionKeys.length) {
				query += key+" = ?"
			} else {
				query += key+" = ? "+type+" "
			}
		});
		console.log("query ",query)
		dbcon.getConnection(function (err, con) {
			if(err) {
				reject(null);
			}
			con.query(query, conditionValues, function (err, result) {
				con.release();
				if(err) {
					reject(err);
				} else {
					resolve(result);
				}
			});
		})
	});
}
