import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Persona 3D | Figurka ze zdjęcia",
  description:
    "Persona 3D tworzy spersonalizowane figurki na podstawie zdjęć — do własnego malowania albo ręcznie pomalowane i gotowe na prezent.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#fff8f2",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
