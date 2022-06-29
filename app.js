var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var passport = require("passport");
//var indexRouter = require("./routes/index");
const indexRouter = express.static(
	path.join(__dirname, "dist/Kranz-web-angular/")
);
var usersRouter = require("./routes/users");
var assetsRouter = require("./routes/assets");
var adminRouter = require("./routes/admin");

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "dist/Kranz-web-angular/")));
app.use(express.static(path.join(__dirname, "public")));

app.use(function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header(
		"Access-Control-Allow-Methods",
		"GET,PUT,POST,DELETE,OPTIONS,PATCH"
	);
	res.header(
		"Access-Control-Allow-Headers",
		"Origin, Basic, X-Requested-With, Content-Type, Accept, Authorization"
	);
	res.header("Access-Control-Allow-Credentials", "true");
	next();
});

app.use("/", indexRouter);
app.use(passport.initialize());
app.use("/users", usersRouter);
app.use("/assets", assetsRouter);
app.use("/admin", adminRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
	next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get("env") === "development" ? err : {};

	// render the error page
	res.status(err.status || 500);
	res.render("error");
});

module.exports = app;
