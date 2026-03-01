import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Building2, Map, Home } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SG Condos - Singapore New Launch Tracker",
  description: "Track upcoming and new launch condominiums in Singapore",
};

function Navigation() {
  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Building2 className="h-6 w-6 text-primary" />
            <span>SG Condos</span>
          </Link>
          
          <div className="flex items-center gap-1">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <Link
              href="/map"
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
            >
              <Map className="h-4 w-4" />
              <span className="hidden sm:inline">Map</span>
            </Link>

          </div>
        </div>
      </div>
    </nav>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <div className="min-h-screen flex flex-col">
          <Navigation />
          <main className="flex-1">{children}</main>
          <footer className="border-t py-6 text-center text-sm text-muted-foreground">
            <div className="container mx-auto px-4">
              <p>© 2026 SG Condos. Data sourced from public listings.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
