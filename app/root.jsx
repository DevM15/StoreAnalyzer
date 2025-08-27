// app/root.jsx
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { Outlet, Links, Meta, Scripts, LiveReload } from "@remix-run/react";
import "@shopify/polaris/build/esm/styles.css";

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <AppProvider>
          <Outlet />
        </AppProvider>
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
