import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { Web3Provider } from '@/components/providers';

export const metadata: Metadata = {
  title: 'Coinbase Hat Studio',
  description: 'Upload a photo, add a hat, and download your creation!',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <Web3Provider>
          {children}
        </Web3Provider>
        <Toaster />
      </body>
    </html>
  );
}
