const baseConfig = require('../../jest.config.js');
const package = require('./package');

module.exports = {
  ...baseConfig,
  displayName: package.name,
  name: package.name,
  rootDir: '.',
};
