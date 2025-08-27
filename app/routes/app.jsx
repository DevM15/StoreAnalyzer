import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

export const links = () => [
  { rel: "stylesheet", href: polarisStyles },
  { rel: "stylesheet", href: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css", integrity: "sha512-Evv84Mr4kqVGRNSgIGL/F/aIDqQb7xQ2vcrdIwxfjThSH8CSR7PBEakCr51Ck+w+/U6swU2Im1vVX0SVk9ABhg==", crossOrigin: "anonymous", referrerPolicy: "no-referrer" }
];

export const loader = async ({ request }) => {
  const { authenticate } = await import("../shopify.server");
  const { admin } = await authenticate.admin(request);
  return {
    shop: admin.shop,
    accessToken: admin.accessToken,
  };
};

export default function App() {

  return (
    <AppProvider>
      <NavMenu>
        <Link to="/app" rel="home">
          Home
        </Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
