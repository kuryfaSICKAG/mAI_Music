declare module "express" {
  export interface Request {
    body?: any;
    params: Record<string, string>;
    query: Record<string, any>;
    headers: Record<string, string | string[] | undefined>;
  }

  export interface Response {
    status: (code: number) => Response;
    json: (body: any) => Response;
    send: (body: any) => Response;
  }

  export interface RouterInstance {
    use: (...args: any[]) => RouterInstance;
    get: (...args: any[]) => RouterInstance;
    post: (...args: any[]) => RouterInstance;
    patch: (...args: any[]) => RouterInstance;
    delete: (...args: any[]) => RouterInstance;
  }

  export function Router(): RouterInstance;

  export interface ExpressApp extends RouterInstance {
    listen: (port: number, callback?: () => void) => any;
  }

  interface ExpressFactory {
    (): ExpressApp;
    json: () => any;
  }

  const express: ExpressFactory;
  export default express;
}
