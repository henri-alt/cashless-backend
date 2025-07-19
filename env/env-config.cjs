const dotenv = require("dotenv");
const { resolve } = require("path");

dotenv.config({
  path: resolve("./env", `.env.${process.env.NODE_ENV}`),
});
