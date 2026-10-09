import { createBrowserRouter, RouterProvider } from 'react-router';
import { ROUTER_BASENAME } from './basePath';
import { AppProviders } from './providers/AppProviders';
import { routeObjects } from './routeObjects';

const router = createBrowserRouter(routeObjects, { basename: ROUTER_BASENAME });

export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
