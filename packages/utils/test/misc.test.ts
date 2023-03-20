import { isBrowserEnv, isNodeEnv, prototypeJsFix } from '@amplitude/utils';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { JSDOM, DOMWindow } from 'jsdom';

// Augment built-ins APIs for prototypeJsFix tests
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      window: { Prototype?: Record<string, any> } & DOMWindow;
    }
  }
  interface Array<T> {
    toJSON?: Function;
  }
}

// Used to help create browser env
const dom = new JSDOM();

// Used to restore Node global object after tests that use browser env
const processPlaceholder = global.process;

function setupBrowserTest(): void {
  // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
  // @ts-ignore
  global.window = dom.window;
  // Note: Used to get around not being able to delete non-optional fields for the sake of testing
  global.process = undefined as any;
}

function cleanupBrowserTest(): void {
  global.window = undefined as any;
  // Note: Used to get around not being able to delete non-optional fields for the sake of testing
  global.process = processPlaceholder;
}

describe('isNodeEnv', () => {
  it('should return false in a browser env', () => {
    setupBrowserTest();
    expect(isNodeEnv()).toBe(false);
    cleanupBrowserTest();
  });

  it('should return true in a node env', () => {
    expect(isNodeEnv()).toBe(true);
  });
});

describe('isBrowserEnv', () => {
  it('should return true in a browser env', () => {
    setupBrowserTest();
    expect(isBrowserEnv()).toBe(true);
    cleanupBrowserTest();
  });

  it('should return false in a node env', () => {
    expect(isBrowserEnv()).toBe(false);
  });
});

describe('prototypeJsFix', () => {
  it('should delete Array.prototype.toJSON if Prototype.js injects Array.prototype.toJSON', () => {
    setupBrowserTest();
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    global.window.Prototype = {};
    // eslint-disable-next-line no-extend-native
    Array.prototype.toJSON = jest.fn();
    expect(Array.prototype.toJSON).toBeTruthy();
    expect(prototypeJsFix()).toBe(true);
    expect(Array.prototype.toJSON).toBe(undefined);
    cleanupBrowserTest();
  });

  it('should do nothing if Prototype.js does not inject Array.prototype.toJSON', () => {
    expect(prototypeJsFix()).toBe(false);
  });
});
