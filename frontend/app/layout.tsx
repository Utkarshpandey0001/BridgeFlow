import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Bitflow — Bitcoin-Native Yield Protocol',
  description: 'Autonomous AI agents optimize your USDCx yield across Stacks and Base using programmatic CCTP bridging.',
  keywords: ['Stacks', 'Bitcoin', 'DeFi', 'yield', 'USDC', 'CCTP', 'bridge', 'agent'],
  openGraph: {
    title: 'Bitflow — Bitcoin-Native Yield Protocol',
    description: 'Let AI agents manage your cross-chain yield strategy.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-[#080B14] text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
