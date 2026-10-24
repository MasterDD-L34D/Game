const rawBasePath = process.env.CONSOLE_BASE_PATH ?? '';
const trimmedBase = rawBasePath === '/' ? '' : rawBasePath.replace(/\/$/, '');

export const pathFor = (route: string = '/'): string => {
  const normalisedRoute =
    !route || route === '/' ? '/' : route.startsWith('/') ? route : `/${route}`;
  if (normalisedRoute === '/') {
    return trimmedBase ? `${trimmedBase}/` : '/';
  }
  return `${trimmedBase}${normalisedRoute}` || normalisedRoute;
};
