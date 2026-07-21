import { registerRootComponent } from 'expo';
import App from './src/App';

// Entry point — registers App as the root component under the native
// component name "main" (matches android MainActivity.getMainComponentName()).
registerRootComponent(App);
