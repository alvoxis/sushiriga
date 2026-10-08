import { isRouteErrorResponse, useRouteError } from 'react-router';

/** Last-resort error screen (rendered outside the layout, so it avoids app context). */
export function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : 'Something went wrong';
  if (import.meta.env.DEV) console.error(error);
  return (
    <main className="container" style={{ padding: '4rem 1rem' }}>
      <h1>SUSHIRIGA</h1>
      <p>{message}</p>
      <p>
        <a href="/">← SUSHIRIGA</a>
      </p>
    </main>
  );
}
