import { Middleware, MiddlewarePayload, Next } from '@amplitude/types';

export class MiddlewareRunner {
  private readonly _middlewares: Middleware[] = [];

  add(middleware: Middleware): void {
    this._middlewares.push(middleware);
  }

  run(payload: MiddlewarePayload, next: Next): void {
    let curMiddlewareIndex = -1;
    const middlewareCount = this._middlewares.length;

    const middlewareNext: Next = curPayload => {
      curMiddlewareIndex += 1;
      if (curMiddlewareIndex < middlewareCount) {
        this._middlewares[curMiddlewareIndex](curPayload, _next);
      } else {
        next(curPayload);
      }
    };

    const _next: Next = middlewareCount > 0 ? middlewareNext : next;

    _next(payload);
  }
}
