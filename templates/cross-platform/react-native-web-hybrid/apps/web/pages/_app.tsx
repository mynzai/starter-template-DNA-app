import React, { useEffect } from 'react';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ThemeProvider } from '@hybrid/shared-components';
import { NavigationProvider } from '@hybrid/shared-navigation';
import { store, persistor } from '../store/store';
import { routes } from '../config/routes';
import ErrorBoundary from '../components/ErrorBoundary';
import LoadingSpinner from '../components/LoadingSpinner';
import { Analytics } from '../components/Analytics';
import { PWAHandler } from '../components/PWAHandler';
import GlobalStyles from '../styles/GlobalStyles';

// Performance monitoring
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function reportWebVitals(metric: any) {
  // Log to analytics service
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', metric.name, {
      event_category: 'Web Vitals',
      event_label: metric.id,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      non_interaction: true,
    });
  }
  
  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Web Vital:', metric);
  }
}

function MyApp({ Component, pageProps }: AppProps) {
  // Setup web vitals monitoring
  useEffect(() => {
    getCLS(reportWebVitals);
    getFID(reportWebVitals);
    getFCP(reportWebVitals);
    getLCP(reportWebVitals);
    getTTFB(reportWebVitals);
  }, []);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content="#000000" />
        <meta name="description" content="React Native + Next.js Hybrid Platform" />
        
        {/* PWA meta tags */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        
        {/* Performance hints */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* SEO */}
        <title>Hybrid Platform - React Native + Next.js</title>
      </Head>
      
      <ErrorBoundary>
        <Provider store={store}>
          <PersistGate loading={<LoadingSpinner />} persistor={persistor}>
            <ThemeProvider>
              <NavigationProvider routes={routes}>
                <GlobalStyles />
                <PWAHandler />
                <Analytics />
                <Component {...pageProps} />
              </NavigationProvider>
            </ThemeProvider>
          </PersistGate>
        </Provider>
      </ErrorBoundary>
    </>
  );
}

export default MyApp;