import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import { PWAInstaller } from '@/components/PWAInstaller';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { AppShell } from '@/components/AppShell';
import { PerformanceMonitor } from '@/components/PerformanceMonitor';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true
});

export const metadata: Metadata = {
  title: {
    default: 'PWA Advanced Platform',
    template: '%s | PWA Platform'
  },
  description: 'Advanced Progressive Web App with offline capabilities and native-like features',
  keywords: ['PWA', 'Progressive Web App', 'Offline', 'Native Features', 'Performance'],
  authors: [{ name: 'PWA Platform Team' }],
  creator: 'PWA Platform',
  publisher: 'PWA Platform',
  
  // PWA metadata
  applicationName: 'PWA Advanced Platform',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PWA Platform',
    startupImage: [
      {
        url: '/icons/apple-splash-2048-2732.png',
        media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)'
      },
      {
        url: '/icons/apple-splash-1668-2388.png',
        media: '(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)'
      },
      {
        url: '/icons/apple-splash-1536-2048.png',
        media: '(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)'
      },
      {
        url: '/icons/apple-splash-1125-2436.png',
        media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)'
      }
    ]
  },
  
  // Open Graph
  openGraph: {
    type: 'website',
    title: 'PWA Advanced Platform',
    description: 'Advanced Progressive Web App with offline capabilities and native-like features',
    url: 'https://pwa-platform.example.com',
    siteName: 'PWA Platform',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PWA Advanced Platform'
      }
    ],
    locale: 'en_US'
  },
  
  // Twitter
  twitter: {
    card: 'summary_large_image',
    title: 'PWA Advanced Platform',
    description: 'Advanced Progressive Web App with offline capabilities and native-like features',
    images: ['/twitter-image.png'],
    creator: '@pwa-platform'
  },
  
  // Icons
  icons: {
    icon: [
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-16x16.png', sizes: '16x16', type: 'image/png' }
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ],
    other: [
      { rel: 'mask-icon', url: '/icons/safari-pinned-tab.svg', color: '#000000' }
    ]
  },
  
  // Manifest
  manifest: '/manifest.json',
  
  // Other metadata
  category: 'productivity',
  classification: 'Web Application',
  referrer: 'origin-when-cross-origin',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  // Verification
  verification: {
    google: 'google-site-verification-code',
    yandex: 'yandex-verification-code',
    yahoo: 'yahoo-verification-code'
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' }
  ],
  colorScheme: 'light dark'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang=\"en\" suppressHydrationWarning>
      <head>
        {/* DNS prefetch for external resources */}
        <link rel=\"dns-prefetch\" href=\"//fonts.googleapis.com\" />
        <link rel=\"dns-prefetch\" href=\"//fonts.gstatic.com\" />
        
        {/* Preconnect for critical resources */}
        <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\" />
        <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossOrigin=\"anonymous\" />
        
        {/* Apple-specific meta tags */}
        <meta name=\"apple-mobile-web-app-capable\" content=\"yes\" />
        <meta name=\"apple-mobile-web-app-status-bar-style\" content=\"black-translucent\" />
        <meta name=\"format-detection\" content=\"telephone=no\" />
        
        {/* Microsoft-specific meta tags */}
        <meta name=\"msapplication-TileColor\" content=\"#000000\" />
        <meta name=\"msapplication-config\" content=\"/browserconfig.xml\" />
        
        {/* Additional PWA meta tags */}
        <meta name=\"mobile-web-app-capable\" content=\"yes\" />
        <meta name=\"application-name\" content=\"PWA Platform\" />
        
        {/* Performance hints */}
        <link rel=\"preload\" href=\"/fonts/inter-var.woff2\" as=\"font\" type=\"font/woff2\" crossOrigin=\"anonymous\" />
        
        {/* Critical CSS inline would go here for instant loading */}
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Critical above-the-fold CSS */
            *,*::before,*::after{box-sizing:border-box}
            body{margin:0;font-family:system-ui,-apple-system,sans-serif;line-height:1.5}
            .app-shell{min-height:100vh;display:flex;flex-direction:column}
            .loading-skeleton{background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);background-size:200% 100%;animation:loading 1.5s infinite}
            @keyframes loading{0%{background-position:200% 0}100%{background-position:-200% 0}}
          `
        }} />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          <AppShell>
            {children}
            
            {/* PWA Components */}
            <PWAInstaller />
            <OfflineIndicator />
            <PerformanceMonitor />
          </AppShell>
        </Providers>
        
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' })
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                      
                      // Check for updates
                      registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                          if (newWorker.state === 'installed') {
                            if (navigator.serviceWorker.controller) {
                              // New content available
                              window.dispatchEvent(new CustomEvent('sw-update-available'));
                            }
                          }
                        });
                      });
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
              
              // Performance monitoring
              if ('PerformanceObserver' in window) {
                try {
                  const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                      if (entry.name === 'first-contentful-paint') {
                        console.log('FCP:', entry.startTime);
                      }
                    }
                  });
                  observer.observe({ entryTypes: ['paint'] });
                } catch (e) {
                  console.log('PerformanceObserver not supported');
                }
              }
            `
          }}
        />
      </body>
    </html>
  );
}