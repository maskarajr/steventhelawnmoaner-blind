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
  version: "vNext",
  image: "https://steventhelawnmoaner.vercel.app/original3x2.png",
  buttons: [
    {
      label: "Click & Check your Lawn Points",
      action: "post"
    }
  ],
  postUrl: "https://steventhelawnmoaner.vercel.app",
  imageAspectRatio: "1.91:1"
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
    'fc:frame:image': "https://steventhelawnmoaner.vercel.app/original3x2.png",
    'fc:frame:button:1': "Click & Check your Lawn Points",
    'fc:frame:button:1:action': "post",
    'fc:frame:post_url': "https://steventhelawnmoaner.vercel.app",
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
        <meta property="fc:frame:post_url" content="https://steventhelawnmoaner.vercel.app" />
      </head>
      <body>{children}</body>
    </html>
  );
}