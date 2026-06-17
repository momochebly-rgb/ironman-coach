import { Inter, Archivo } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const archivo = Archivo({ subsets: ["latin"], weight: ["600","700","800"], variable: "--font-archivo" });

export const metadata = {
  title: "Maroun · Ironman Coach",
  description: "Personal triathlon coaching dashboard",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0E1B2A",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${archivo.variable}`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
