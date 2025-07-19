const path = require("path");
const EnvPlugin = require("webpack-dotenv-plugin");

module.exports = {
  mode: "production",
  context: __dirname,
  entry: "./src/index.ts",
  devtool: "inline-source-map",
  target: "node",
  output: {
    filename: "bundle.cjs",
    path: path.join(__dirname, "dist"),
  },
  module: {
    rules: [
      {
        test: /\.(?:js|mjs|cjs|ts|tsx)$/,
        exclude: /node_modules/,
        loader: "ts-loader",
      },
    ],
  },
  plugins: [
    new EnvPlugin({
      path: "./env/.env.production",
      sample: "./env/.env.example",
      allowEmptyValues: true,
    }),
  ],
  resolve: {
    extensions: [".ts", ".js", ".json"],
  },
};
