import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fff',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://steventhelawnmoaner.vercel.app/steventhelawn.jpeg"
            alt="Steven the Lawn Moaner"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          />
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (e) {
    console.error(e);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}