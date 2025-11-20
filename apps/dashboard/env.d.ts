/// <reference types="vite/client" />

declare module 'angular' {
  interface AngularModule {
    name: string;
    config(configFn: any): AngularModule;
    component(name: string, definition: any): AngularModule;
    service(name: string, constructor: any): AngularModule;
  }

  interface AngularStatic {
    module(name: string, requires?: string[], configFn?: any): AngularModule;
    element(element: Element | Document | string): {
      ready(callback: () => void): void;
    };
    bootstrap(
      element: Element | Document,
      modules: string[],
      config?: Record<string, unknown>,
    ): void;
  }

  const angular: AngularStatic;
  export default angular;
}

declare module 'angular-route';
declare module 'angular-animate';
declare module 'angular-sanitize';
