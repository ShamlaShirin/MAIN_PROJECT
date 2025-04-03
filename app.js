var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var hbs = require("express-handlebars");
var usersRouter = require("./routes/users");
var adminRouter = require("./routes/admin");
var staffRouter = require("./routes/staff");
var fileUpload = require("express-fileupload");
var db = require("./config/connection");
var session = require("express-session");
var app = express();
const Handlebars = require('handlebars');


// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");

Handlebars.registerHelper('eq', function (a, b) {
  return a === b;
});

// Set up Handlebars engine with helpers
app.engine(
  "hbs",
  hbs({
    extname: "hbs",
    defaultLayout: "layout",
    layoutsDir: __dirname + "/views/layout/",
    partialsDir: __dirname + "/views/header-partials/",
    helpers: {
      incremented: function (index) {
        index++;
        return index;
      },
      eq: function (a, b) {
        return a === b;
      },

      toNumber: function (value) {
        return Number(value);
      },
      formatDate: function (dateString) {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
        const year = date.getFullYear();
        return `${day}-${month}-${year}`; // Return the formatted date
      },
      formatDateY: function (date) {
        if (!date) return ''; // Handle null or undefined dates
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0'); // Ensure two digits
        const day = String(d.getDate()).padStart(2, '0'); // Ensure two digits
        return `${year}-${month}-${day}`;
      },
      formatFacilities:  function (text) {
        if (!text) return ""; // Handle empty input

        const listItems = text
            .split("*") // Split based on '*'
            .filter(item => item.trim() !== "") // Remove empty entries
            .map(item => `<li>${item.trim()}</li>`) // Wrap in <li>
            .join(""); // Join all items
    
        return `<ul class="facilities-list">${listItems}</ul>`; // Return as SafeString
    },
    halfAmount:function (fullAmount, paymentMethod) {
      if (paymentMethod === "COD") {
          return (fullAmount * 0.5).toFixed(2); // Ensures proper formatting
      } else {
          return fullAmount;
      }
  }
    },
  })
);



app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(fileUpload());
app.use(
  session({
    secret: "Key",
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 1 day in milliseconds
  })
);
db.connect((err) => {
  if (err) console.log("Error" + err);
  else console.log("\x1b[38;2;144;238;144mDatabase Connected Successfully ✅ \x1b[0m");
  console.log("\x1b[38;2;144;238;144mYour Link : http://localhost:4001/ ✅ \x1b[0m");


});
app.use("/", usersRouter);

app.use("/staff", staffRouter);
app.use("/staff/rooms", staffRouter);

app.use("/admin", adminRouter);
app.use("/admin/users", adminRouter);
app.use("/admin/staffs", adminRouter);
app.use("/admin/rooms", adminRouter);
app.use("/admin/category", adminRouter);
app.use("/admin/payment", adminRouter);
app.use("/admin/discount", adminRouter);


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
