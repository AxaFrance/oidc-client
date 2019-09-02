module.exports = api => {
  api.cache.never();
  return {
    presets: ['@babel/env', '@babel/react'],
    plugins: ['@babel/plugin-transform-runtime', '@babel/plugin-proposal-class-properties'],
  };
};
