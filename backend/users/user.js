const bcrypt = require("bcrypt");

const users = [
  {
    id: 1,
    username: "brayan",
    password: bcrypt.hashSync("123456", 10), // contraseña encriptada
  },
];

module.exports = users;
