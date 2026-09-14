import "./globals.css";
import { PWARegister } from "@/components/PWARegister";

export const metadata = {
  title: "MyTradeBook — Journal de trading",
  description: "Le livre de comptes du trader financé — trades, evals, payouts, certificats et ROI.",
  manifest: "/manifest.json",
  icons: { icon: "/icon", apple: "/apple-icon" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MyTradeBook",
  },
};

export const viewport = {
  themeColor: "#080b09",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/apple-icon" />
      </head>
      <body className="bg-ink text-white antialiased">
        {children}
        <PWARegister />
      </body>
    </html>
  );
}
