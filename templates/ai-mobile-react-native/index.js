import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './package.json';

// Register the main component
AppRegistry.registerComponent(appName, () => App);

// Configure global error handling
if (__DEV__) {
  console.log('AI Mobile Assistant running in development mode');
} else {
  // Production error handling
  console.reportErrorsAsExceptions = false;
}