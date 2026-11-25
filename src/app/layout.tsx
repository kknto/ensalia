import type { Metadata, Viewport } from "next";
import { PRODUCT_IDENTITY } from "@/lib/product/identity";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#123D31",
};

export const metadata: Metadata = {
  title: `${PRODUCT_IDENTITY.name} | Gestión de laboratorio`,
  description: PRODUCT_IDENTITY.description,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: PRODUCT_IDENTITY.shortName,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>{children}</body>
    </html>
  );
}
