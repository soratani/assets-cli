import Config, { PackageInfo, PACKAGE_TYPE, ENV } from "@/common/config";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import HtmlWebpackTagsPlugin from "html-webpack-tags-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";
import ModuleConcatenationPlugin from "webpack/lib/optimize/ModuleConcatenationPlugin";
import webpack, { DefinePlugin } from "webpack";
import EslintWebpackPlugin from "eslint-webpack-plugin";
import { CleanWebpackPlugin } from "clean-webpack-plugin";
import { findFiles } from "@/utils";
import { readFileSync } from "fs";
import { join } from "path";

export default function createPlugins(pkg: PackageInfo, config: Config) {
  const prefix = [PACKAGE_TYPE.APP].includes(pkg.type) ? "static" : "/static";
  const assets = findFiles(pkg.public);
  const templateDir = join(__dirname, "../../../templates");
  const templateContent = readFileSync(
    join(templateDir, `${pkg.type}.html`)
  ).toString();
  const publicFiles = new HtmlWebpackTagsPlugin({
    links: assets.filter((file) => file.includes(".css")),
    tags: assets.filter((file) => file.includes(".js")),
    append: false,
  });
  const copy = new CopyWebpackPlugin({
    patterns: [
      {
        from: pkg.public,
        to: pkg.output,
        filter(filepath: string) {
          return !filepath.includes(".html");
        },
      },
    ],
  });
  const css = new MiniCssExtractPlugin({
    filename: `${prefix}/style/[name].[contenthash:8].css`,
    chunkFilename: `${prefix}/style/[id].[contenthash:8].chunk.css`,
  });
  const template = new HtmlWebpackPlugin({
    templateContent,
    filename: "index.html",
    inject: "head",
  });
  const plugins = [
    new CleanWebpackPlugin(),
    new EslintWebpackPlugin({
      context: pkg.source,
      cache: true,
    }),
    new DefinePlugin({
      "process.env": {
        ENV: JSON.stringify(config.env),
        NAME: JSON.stringify(pkg.name),
        VERSION: JSON.stringify(pkg.version),
        PLATFORM: JSON.stringify(pkg.type),
        APP: JSON.stringify(pkg.name),
      },
    }),
    new webpack.ProvidePlugin({
      React: "react", // 这样在任何地方都可以直接使用React，无需import
      ReactDOM: "react-dom",
    }),
    new ModuleConcatenationPlugin(),
  ];
  const isCssChunk = ![PACKAGE_TYPE.APP].includes(pkg.type);
  const isTemplate =
    ![PACKAGE_TYPE.APP].includes(pkg.type) ||
    [ENV.development].includes(config.env);
  const isCopy = isTemplate && pkg.public;
  if (isCopy) plugins.push(copy);
  if (isCssChunk) plugins.push(css);
  if (isTemplate) plugins.push(template);
  if (pkg.public && isTemplate) plugins.push(publicFiles);
  return plugins;
}
