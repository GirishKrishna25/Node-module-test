// IMPORTS
const express = require("express");
require("dotenv").config();
const clc = require("cli-color");
const mongoose = require("mongoose");
const session = require("express-session");
const mongoDBSession = require("connect-mongodb-session")(session);
const cleanUpAndValidate = require("./utils/AuthUtils");
const bcrypt = require("bcrypt");
const validator = require("validator");
const isAuth = require("./middlewares/isAuth");
const UserSchema = require("./UserSchema");
const rateLimiting = require("./middlewares/rateLimiting");

// Initializing SERVER
const app = express();
app.set("view engine", "ejs");
const PORT = process.env.PORT;

// Connecting DB to the App
mongoose.set("strictQuery", false);
mongoose
  .connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then((res) => {
    console.log(clc.green("Connected to MongoDB successful"));
  })
  .catch((err) => {
    console.log(clc.red("Failed to connect to MongoDB", err));
  });

// MIDDLEWARES
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// SESSION
const store = new mongoDBSession({
  uri: process.env.MONGODB_URL,
  collection: "session",
});
app.use(
  session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);

// ROUTES
// get -- requesting data from the server
app.get("/", (req, res) => {
  res.send("Welcome to Profile app");
});

app.get("/register", (req, res) => {
  return res.render("register");
});

app.get("/login", (req, res) => {
  return res.render("login");
});

let user;
app.get("/profile", isAuth, async (req, res) => {
  try {
    user = await UserSchema.findOne({ username: req.session.username });
    console.log(clc.blue(user));
    res.render("profile", { user: user });
  } catch (err) {
    return res.send({
      status: 400,
      message: "Internal server error, Please try again",
      error: err,
    });
  }

  return res.render("profile");
});

// post -- sending data to the server
// REGISTER Page
app.post("/register", async (req, res) => {
  //  console.log(req.body);
  //// req.body contains what we entered in the input fields as an object
  const { name, username, email, password } = req.body;

  //// check its validation
  try {
    await cleanUpAndValidate({ name, username, email, password });
  } catch (err) {
    return res.send({ status: 400, message: err });
  }

  //// hash the password
  const hashedPassword = await bcrypt.hash(password, 6);
  // console.log(hashedPassword);

  //// make an object with data that we want to save in db
  let user = new UserSchema({
    name: name,
    username: username,
    email: email,
    password: hashedPassword,
  });

  //// before saving in db, check whether user exists or not.
  let userExists;
  try {
    userExists = await UserSchema.findOne({ email });
  } catch (err) {
    return res.send({
      status: 400,
      message: "Internal server error, Please try again",
      error: err,
    });
  }

  //// if exists
  if (userExists) {
    return res.send({
      status: 400,
      message: "User already exists",
    });
  }

  //// if not, we save user in db and redirect to Login page.
  try {
    const userDB = await user.save();
    // console.log(userDB);
    res.redirect("/login");
  } catch (err) {
    return res.send({
      status: 400,
      message: "Internal server error, Please try again later.",
      error: err,
    });
  }
});

// LOGIN Page
app.post("/login", async (req, res) => {
  // get data from input fields
  const { loginId, password } = req.body;
  // check validation
  if (
    typeof loginId !== "string" ||
    typeof password !== "string" ||
    !loginId ||
    !password
  ) {
    return res.send({
      status: 400,
      message: "Invalid data",
    });
  }

  let userDB;
  // to login we can use either email / username. Therefore, we search db using what we enter
  try {
    if (validator.isEmail(loginId)) {
      userDB = await UserSchema.findOne({ email: loginId });
    } else {
      userDB = await UserSchema.findOne({ username: loginId });
    }
    console.log(userDB);
    console.log(clc.red(loginId, password));

    // if we don't find it in db.
    if (!userDB) {
      return res.send({
        status: 400,
        message: "User not found, Please register first",
        error: err,
      });
    }

    // if we find
    // we check password validation
    const isMatch = await bcrypt.compare(password, userDB.password);
    // if fails
    if (!isMatch) {
      return res.send({
        status: 400,
        message: "Invalid password",
        data: req.body,
      });
    }
    // if passes
    req.session.isAuth = true;
    req.session.user = {
      username: userDB.username,
      email: userDB.email,
      userId: userDB._id,
    };
    res.redirect("/profile");
  } catch (err) {
    return res.send({
      status: 400,
      message: "Internal server error, Please login again",
      error: err,
    });
  }
});

app.get("/profile", function (req, res) {
  // Retrieve the user's data from the database
  UserSchema.findOne({ username: req.session.username }, function (err, user) {
    if (err) {
      res.send({
        status: 400,
        message: "Internal server error, try again later",
      });
    } else {
      // Store the user's data in the session store

      req.session.user = user;

      // Redirect to the profile page
      res.redirect("/profile");
    }
  });
});
////
// Listening SERVER
app.listen(PORT, () => {
  console.log(clc.yellow.underline(`http://localhost:${PORT}`));
});
