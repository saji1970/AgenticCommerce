// Framework entry point for easy integration
export { default as AgenticCommerceFramework } from './components/AgenticCommerceFramework';
export { setConfig, getConfig, config } from './config';
export { api } from './services/api';
export * from './types';
export { store } from './store';

// Default export is the main app
export { default } from '../App';

