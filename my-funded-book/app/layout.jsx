import "./globals.css";
import { PWARegister } from "@/components/PWARegister";

export const metadata = {
  title: "MY FUNDED BOOK — Trading Journal for Funded Traders",
  description: "Le livre de comptes du trader financé — trades, evals, payouts, certificats et ROI.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MY FUNDED BOOK",
  },
};

export const viewport = {
  themeColor: "#0D0F12",
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
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="bg-ink text-white antialiased">
        {children}
        <PWARegister />
      </body>
    </html>
  );
}
