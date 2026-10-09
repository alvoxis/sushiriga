import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AppProviders } from '@/app/providers/AppProviders';
import { routeObjects } from '@/app/routeObjects';
import type { Services } from '@/services';
import type { Locale } from '@/types';

/** Renders the whole app (real routes, providers and mock services) at a given URL. */
export function renderApp(url = '/', locale: Locale = 'en', services?: Services) {
  const router = createMemoryRouter(routeObjects, { initialEntries: [url] });
  const user = userEvent.setup();
  const utils = render(
    <AppProviders initialLocale={locale} {...(services ? { services } : {})}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { ...utils, user, router };
}
