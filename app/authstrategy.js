'use strict';
var passport = require("passport");
var passportJWT = require("passport-jwt");
var cfg = require('../app/config');
var ExtractJwt = passportJWT.ExtractJwt;
var Strategy = passportJWT.Strategy;
var db = require('./dbconnection');

var params = {
    secretOrKey: cfg.jwtSecret,
    jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('jwt')
};

module.exports = function() {
    var strategy = new Strategy(params, function(payload, done) {
        var dbcon = db.connect();
		dbcon.getConnection(function (err, con) {

            if(err) {
                console.log(err);
                return false;
            }
            if(payload.user_type == "USER") {
                con.query('SELECT user_id, address, chainId FROM users WHERE address=? AND chainId=? AND is_active = 1', [payload.address, payload.chainId], function (err, result) {
	                con.release();

	                if(err) {
	                    return done("CONNECTION_ERROR", null);
	                }

	                if(result.length < 1) {
	                    return done("USER_NOT_FOUND", null);
                	}
                	var resultJson = JSON.parse(JSON.stringify(result));
                    return done(null, {
                        address: payload.address,
                        chainId: payload.chainId,
                        user_id: resultJson[0].user_id,
                        user_type: "USER"
                    });
                })
            } else if(payload.user_type == "ADMIN") {
                con.query('SELECT user_id, fname, username FROM admin WHERE username=? AND password=?', [payload.username, payload.password], function (err, result) {
                    // console.log(this.sql, " strategy sql");
                    console.log("err ",err, " result ",result)
                    con.release();

                    if(err) {
                        return done("CONNECTION_ERROR", null);
                    }

                    if(result.length < 1) {
                        return done("USER_NOT_FOUND", null);
                    }
                    var resultJson = JSON.parse(JSON.stringify(result));
                    return done(null, {
                        username: payload.username,
                        password: payload.password,
                        user_id: resultJson[0].user_id,
                        user_type: "ADMIN"
                    });
                    console.log("here if not return")
                })
            }
        })
    });

    passport.use(strategy);

    return {
        initialize: function() {
            return passport.initialize();
        },
        authenticate: function() {
            return passport.authenticate("jwt", cfg.jwtSession);
        }
    };
};
