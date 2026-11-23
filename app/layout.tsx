import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kerbwise Order Desk",
  description: "Packing desk for Kerbwise shops"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
