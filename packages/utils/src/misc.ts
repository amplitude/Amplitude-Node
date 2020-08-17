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
export function getGlobalObject(): any {
  return isNodeEnv()
    ? global
    : typeof window !== 'undefined'
    ? window
    : typeof self !== 'undefined'
    ? self
    : fallbackGlobalObject;
}
