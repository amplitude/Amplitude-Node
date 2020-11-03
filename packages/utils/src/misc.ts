/**
 * Checks whether we're in a Node.js environment
 *
 * @returns Answer to given question
 */
export function isNodeEnv(): boolean {
  return typeof process === 'object' && process?.versions?.node !== undefined;
}

/**
 * Checks whether we're in a browser environment
 *
 * @returns Answer to given question
 */
export function isBrowserEnv(): boolean {
  return typeof window === 'object' && window?.document !== undefined;
}

const fallbackGlobalObject = {};

/**
 * Safely get global scope object
 *
 * @returns Global scope object
 */
export const getGlobalObject = (): any => {
  return isNodeEnv()
    ? global
    : typeof window !== 'undefined'
    ? window
    : typeof self !== 'undefined'
    ? self
    : fallbackGlobalObject;
};

export const getGlobalAmplitudeNamespace = (): any => {
  const global = getGlobalObject();
  global.__AMPLITUDE__ = global.__AMPLITUDE__ || {};

  return global.__AMPLITUDE__;
};

/**
 * A promise-based way to sleep for x millseconds, then queue ourselves back to the
 * JS event loop.
 *
 * @param milliseconds The number of milliseconds to wait for
 */
export const asyncSleep = (milliseconds: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
};

/**
 * Fixes browser edge case where Prototype.js injects Array.prototype.toJSON and breaks the built-in JSON.stringify()
 *
 * @returns true if Array.prototype.toJSON was deleted, false if not
 */
export const prototypeJsFix = (): boolean => {
  // Augment and cast built-ins to represent Prototype.js injection
  interface Window {
    Prototype?: Object;
  }
  interface ArrayConstructor {
    prototype?: { toJSON?: Function };
  }
  if (isBrowserEnv()) {
    const augmentedWindow = window as Window;
    const augmentedArray = Array as ArrayConstructor;
    if (augmentedWindow.Prototype !== undefined && augmentedArray.prototype?.toJSON !== undefined) {
      delete augmentedArray.prototype.toJSON;
      return true;
    }
  }
  return false;
};
