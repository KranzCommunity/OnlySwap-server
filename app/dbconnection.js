require('dotenv').config()
var mysql = require("mysql");

// var pool  = null;
var pool = mysql.createPool({
    connectionLimit : 1000,
    host: "127.0.0.1",
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    charset : 'utf8mb4'
    // multipleStatements: true
});

exports.connect = function () {
    return pool;
}
