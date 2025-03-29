import { Auth0Provider } from '@auth0/auth0-react';
import { auth0Config } from '../auth0-config';
import { useEffect, useState } from 'react';
// ...existing code...

function MyApp({ Component, pageProps }) {
  // Use a state variable to track if we're on the client
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Create an inner component to handle Auth0 provider
  const AppContent = () => {
    // Only include Auth0Provider when mounted (client-side only)
    if (mounted) {
      return (
        <Auth0Provider
          domain={auth0Config.domain}
          clientId={auth0Config.clientId}
          authorizationParams={{
            redirect_uri: window.location.origin,
            scope: auth0Config.scope,
          }}
          cacheLocation="localstorage"
        >
          <Component {...pageProps} />
        </Auth0Provider>
      );
    }
    
    // During initial SSR or before hydration, render without Auth0
    // Use a wrapper div with the same structure to prevent layout shifts
    return <Component {...pageProps} />;
  };

  return <AppContent />;
}

// ...existing code...
