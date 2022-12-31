const validator = require("validator");

const cleanUpAndValidate = ({ name, username, email, password }) => {
  return new Promise((resolve, reject) => {
    // if we leave input fields empty
    if (!name || !username || !email || !password) {
      return reject("Missing credentials");
    }

    // Name
    if (typeof name !== "string") {
      return reject("Name is not a string");
    }
    // Username
    if (typeof username !== "string") {
      return reject("Username is not a string");
    }
    if (username.length < 3 || username.length > 25) {
      return reject(
        "The length of the username should be 3-25 characters long"
      );
    }
    // Email
    if (typeof email !== "string") {
      return reject("Email is not a string");
    }
    //// validator is an async function
    if (!validator.isEmail(email)) {
      return reject("Invalid email format");
    }
    // Password
    if (typeof password !== "string") {
      return reject("Password is not a string");
    }
    if (password && !validator.isAlphanumeric(password)) {
      return reject("Password should contain alphabets and numbers");
    }

    return resolve();
  });
};

module.exports = cleanUpAndValidate;
