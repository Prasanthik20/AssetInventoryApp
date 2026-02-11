const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Optional: add custom extensions
config.resolver.sourceExts.push('cjs');

module.exports = config;
