import './globals.css';
import type { Metadata } from 'next';
import localFont from 'next/font/local';

const inter = localFont({
  src: [
    {
      path: '../public/fonts/Inter-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/Inter-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-inter',
  display: 'swap',
});

const bungeeSpice = localFont({
  src: '../public/fonts/BungeeSpice-Regular.ttf',
  variable: '--font-bungee-spice',
  display: 'swap',
});

const frameMetadata = {
  version: "next",
  name: "Steven the Lawn Moaner",
  iconUrl: "https://steventhelawnmoaner.vercel.app/icon.png",
  homeUrl: "https://steventhelawnmoaner.vercel.app",
  imageUrl: "https://steventhelawnmoaner.vercel.app/original3x2.png",
  button: {
    title: "Click & Check your Lawn Points",
    action: {
      type: "launch_frame",
      url: "https://steventhelawnmoaner.vercel.app",
      name: "Steven the Lawn Moaner"
    }
  },
  splashImageUrl: "https://steventhelawnmoaner.vercel.app/icon.png",
  splashBackgroundColor: "#00011f"
};

export const metadata: Metadata = {
  title: 'Lawn Points Leaderboard',
  description: 'Check your Lawn Points balance and see who\'s leading the pack!',
  openGraph: {
    title: 'Lawn Points Leaderboard',
    description: 'Check your Lawn Points balance and see who\'s leading the pack!',
    images: ['https://steventhelawnmoaner.vercel.app/original3x2.png'],
  },
  other: {
    'fc:frame': JSON.stringify(frameMetadata),
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${bungeeSpice.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <meta property="fc:frame" content={JSON.stringify(frameMetadata)} />
        <meta property="fc:frame:image" content="https://steventhelawnmoaner.vercel.app/original3x2.png" />
        <meta property="fc:frame:button:1" content="Click & Check your Lawn Points" />
        <meta property="fc:frame:button:1:action" content="post" />
        <meta property="fc:frame:splash_screen:image" content="https://steventhelawnmoaner.vercel.app/icon.png" />
        <meta property="fc:frame:splash_screen:background_color" content="#00011f" />
      </head>
      <body>{children}</body>
    </html>
  );
}