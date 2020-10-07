/**
 * Checks whether we're in the Node.js or Browser environment
 *
 * @returns Answer to given question
 */
export function isNodeEnv(): boolean {
  // tslint:disable:strict-type-predicates
  return Object.prototype.toString.call(typeof process !== 'undefined' ? process : 0) === '[object process]';
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

const global = getGlobalObject();
global.__AMPLITUDE__ = global.__AMPLITUDE__ || {};

export const getGlobalAmplitudeNamespace = (): any => {
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
