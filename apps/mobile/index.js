/**
 * Polyfill for EventEmitter before Expo loads.
 * Fixes "Cannot read property 'EventEmitter' of undefined" when globalThis.expo
 * is not yet initialized by native modules (e.g. in monorepo or certain load orders).
 */
if (typeof globalThis.expo === 'undefined') {
  globalThis.expo = {};
}
if (typeof globalThis.expo.EventEmitter === 'undefined') {
  try {
    globalThis.expo.EventEmitter = require('events').EventEmitter;
  } catch {
    class EventEmitter {
      constructor() { this._events = {}; }
      on(ev, fn) { (this._events[ev] = this._events[ev] || []).push(fn); return this; }
      emit(ev, ...a) { (this._events[ev] || []).forEach(f => f(...a)); return this; }
    }
    globalThis.expo.EventEmitter = EventEmitter;
  }
}

import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
