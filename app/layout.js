import './globals.css'
import { Providers } from './providers'

export const metadata = {
  title: 'Language Scoop - Tutor & Student Management',
  description: 'Never miss a class, never lose the Zoom link, never forget homework.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Language Scoop',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0F766E',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0F766E" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" href="/favicon.png" />
        <script dangerouslySetInnerHTML={{__html:`
          window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);
          if (typeof window !== "undefined") {
            if ("serviceWorker" in navigator) {
              navigator.serviceWorker.getRegistrations().then(function(regs) {
                for (var r of regs) { r.unregister(); }
              });
            }
            if ("caches" in window) {
              caches.keys().then(function(keys) {
                for (var k of keys) { caches.delete(k); }
              });
            }
          }
        `}} />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
