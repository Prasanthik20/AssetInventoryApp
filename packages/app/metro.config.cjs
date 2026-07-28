const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Optional: add custom extensions
config.resolver.sourceExts.push('cjs');

// Exclude Android build intermediates from file watching to prevent ENOENT crashes
const { blockList } = config.resolver;
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const nodeModulesPath = escapeRegExp(path.join(__dirname, 'node_modules'));
const androidBuildPattern = new RegExp(
  `${nodeModulesPath}[/\\\\].*[/\\\\]android[/\\\\]build[/\\\\]`
);

config.resolver.blockList = blockList
  ? Array.isArray(blockList)
    ? [...blockList, androidBuildPattern]
    : [blockList, androidBuildPattern]
  : androidBuildPattern;

module.exports = config;
