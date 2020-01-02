module.exports = api => {
  api.cache.never();
  return {
    presets: ['@babel/preset-env', '@babel/preset-react'],
    plugins: ['@babel/plugin-transform-runtime', '@babel/plugin-proposal-class-properties'],
  };
};
