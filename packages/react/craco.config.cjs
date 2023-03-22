module.exports = {
    webpack: {
      configure: (webpackConfig, { env, paths }) => {
        webpackConfig.resolve.extensionAlias = {
          ".js": [".ts", ".js", ".tsx", ".jsx"],
          ".mjs": [".mts", ".mjs"]
        }
        return webpackConfig;
      },
    },
  };