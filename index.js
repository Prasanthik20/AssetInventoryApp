/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Register the app component
AppRegistry.registerComponent('AssetInventoryApp', () => App);

// Ensure there’s a root element in the DOM
if (!document.getElementById('root')) {
  const root = document.createElement('div');
  root.id = 'root';
  document.body.appendChild(root);
}

// Run the app on web
AppRegistry.runApplication(appName, {
  initialProps: {},
  rootTag: document.getElementById('root'),
});