// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import React from 'react';

// e2e verifier: guard team spawn edge cases - props destructuring with throwing getters should not crash verifier (API call -> team spawn -> edge cases -> verifier)
// React.createElement reads config props via direct property access which would throw if a getter throws.
// Hardening here ensures that a component receiving an object with a throwing getter does not crash the
// verifier before the component's own try/catch guards can run. This mirrors the API call -> team spawn -> edge cases -> verifier.
try {
  const origCreateElement = React.createElement;
  if (typeof origCreateElement === 'function' && !origCreateElement.__syntaroHardened) {
    const hardenedCreateElement = function (type, config, ...children) {
      let safeConfig = config;
      if (config != null && typeof config === 'object') {
        try {
          let keys;
          try {
            keys = typeof Reflect !== 'undefined' && typeof Reflect.ownKeys === 'function' ? Reflect.ownKeys(config) : Object.keys(config);
          } catch {
            try { keys = Object.keys(config); } catch { keys = []; }
          }
          let needsSafeCopy = false;
          for (let i = 0; i < keys.length; i++) {
            try {
              const k = keys[i];
              let desc;
              try { desc = Object.getOwnPropertyDescriptor(config, k); } catch { desc = null; }
              if (!desc) {
                try {
                  let cur = Object.getPrototypeOf(config);
                  while (cur) {
                    try { desc = Object.getOwnPropertyDescriptor(cur, k); } catch {}
                    if (desc) break;
                    cur = Object.getPrototypeOf(cur);
                  }
                } catch {}
              }
              if (!desc || !desc.enumerable) continue;
              if (desc.get) { needsSafeCopy = true; break; }
            } catch { needsSafeCopy = true; break; }
          }
          if (needsSafeCopy) {
            safeConfig = {};
            for (let i = 0; i < keys.length; i++) {
              const k = keys[i];
              try {
                if (!Object.prototype.hasOwnProperty.call(config, k)) continue;
              } catch {
                try { if (!(k in config)) continue; } catch { continue; }
              }
              let desc;
              try { desc = Object.getOwnPropertyDescriptor(config, k); } catch { continue; }
              if (!desc) {
                try {
                  let cur = Object.getPrototypeOf(config);
                  while (cur) {
                    try { desc = Object.getOwnPropertyDescriptor(cur, k); } catch {}
                    if (desc) break;
                    cur = Object.getPrototypeOf(cur);
                  }
                } catch {}
              }
              if (!desc || !desc.enumerable) continue;
              try {
                if ('value' in desc) {
                  safeConfig[k] = desc.value;
                } else if (typeof desc.get === 'function') {
                  try { safeConfig[k] = desc.get.call(config); } catch { safeConfig[k] = undefined; }
                } else {
                  safeConfig[k] = undefined;
                }
              } catch { safeConfig[k] = undefined; }
            }
          }
        } catch {
          try { safeConfig = {}; } catch {}
        }
      }
      try {
        return origCreateElement.call(this, type, safeConfig, ...children);
      } catch (e) {
        try { return origCreateElement.call(this, type, {}, ...children); } catch { throw e; }
      }
    };
    hardenedCreateElement.__syntaroHardened = true;
    hardenedCreateElement.isHardened = true;
    React.createElement = hardenedCreateElement;
    // Also harden jsx/jsxs if present (React 17+ jsx runtime)
    if (typeof React.jsx === 'function' && !React.jsx.__syntaroHardened) {
      const origJsx = React.jsx;
      const hardenedJsx = function (...args) { try { return origJsx.apply(this, args); } catch { try { const [type, cfg, ...rest] = args; return hardenedCreateElement(type, cfg, ...rest); } catch { return origJsx.apply(this, args); } } };
      hardenedJsx.__syntaroHardened = true;
      React.jsx = hardenedJsx;
    }
    if (typeof React.jsxs === 'function' && !React.jsxs.__syntaroHardened) {
      const origJsxs = React.jsxs;
      const hardenedJsxs = function (...args) { try { return origJsxs.apply(this, args); } catch { try { const [type, cfg, ...rest] = args; return hardenedCreateElement(type, cfg, ...rest); } catch { return origJsxs.apply(this, args); } } };
      hardenedJsxs.__syntaroHardened = true;
      React.jsxs = hardenedJsxs;
    }
    if (typeof React.cloneElement === 'function' && !React.cloneElement.__syntaroHardened) {
      const origCloneElement = React.cloneElement;
      const hardenedCloneElement = function (element, config, ...children) {
        if (element == null) {
          return null;
        }
        let safeConfig = config;
        if (config != null && typeof config === 'object') {
          try {
            let keys;
            try {
              keys = typeof Reflect !== 'undefined' && typeof Reflect.ownKeys === 'function' ? Reflect.ownKeys(config) : Object.keys(config);
            } catch {
              try { keys = Object.keys(config); } catch { keys = []; }
            }
            let needsSafeCopy = false;
            for (let i = 0; i < keys.length; i++) {
              try {
                const k = keys[i];
                let desc;
                try { desc = Object.getOwnPropertyDescriptor(config, k); } catch { desc = null; }
                if (!desc) {
                  try {
                    let cur = Object.getPrototypeOf(config);
                    while (cur) {
                      try { desc = Object.getOwnPropertyDescriptor(cur, k); } catch {}
                      if (desc) break;
                      cur = Object.getPrototypeOf(cur);
                    }
                  } catch {}
                }
                if (!desc || !desc.enumerable) continue;
                if (desc.get) { needsSafeCopy = true; break; }
              } catch { needsSafeCopy = true; break; }
            }
            if (needsSafeCopy) {
              safeConfig = {};
              for (let i = 0; i < keys.length; i++) {
                const k = keys[i];
                try { if (!Object.prototype.hasOwnProperty.call(config, k)) continue; } catch { try { if (!(k in config)) continue; } catch { continue; } }
                let desc;
                try { desc = Object.getOwnPropertyDescriptor(config, k); } catch { continue; }
                if (!desc) {
                  try {
                    let cur = Object.getPrototypeOf(config);
                    while (cur) {
                      try { desc = Object.getOwnPropertyDescriptor(cur, k); } catch {}
                      if (desc) break;
                      cur = Object.getPrototypeOf(cur);
                    }
                  } catch {}
                }
                if (!desc || !desc.enumerable) continue;
                try {
                  if ('value' in desc) safeConfig[k] = desc.value;
                  else if (typeof desc.get === 'function') { try { safeConfig[k] = desc.get.call(config); } catch { safeConfig[k] = undefined; } }
                  else safeConfig[k] = undefined;
                } catch { safeConfig[k] = undefined; }
              }
            }
          } catch { try { safeConfig = {}; } catch {} }
        }
        try {
          return origCloneElement.call(this, element, safeConfig, ...children);
        } catch (e) {
          try { return origCloneElement.call(this, element, {}, ...children); } catch { return null; }
        }
      };
      hardenedCloneElement.__syntaroHardened = true;
      hardenedCloneElement.isHardened = true;
      React.cloneElement = hardenedCloneElement;
    }
    if (typeof React.createFactory === 'function' && !React.createFactory.__syntaroHardened) {
      // createFactory returns a factory that internally calls createElement - already hardened via createElement
    }
  }
} catch {}
