import { NextResponse } from 'next/server';
import { fetchUserPoints } from '@/app/lib/neynar';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { untrustedData } = data;
    const { fid } = untrustedData;
    
    if (!fid) {
      return new NextResponse('Missing fid', { status: 400 });
    }

    // Get user points
    const points = await fetchUserPoints(fid.toString());

    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Lawn Points</title>
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="${process.env.NEXT_PUBLIC_HOST}/api/og?points=${points}" />
          <meta property="fc:frame:button:1" content="View Leaderboard" />
          <meta property="fc:frame:button:1:action" content="link" />
          <meta property="fc:frame:button:1:target" content="${process.env.NEXT_PUBLIC_HOST}" />
        </head>
      </html>
      `,
      {
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  } catch (error) {
    console.error('Frame error:', error);
    return new NextResponse('Error processing frame', { status: 500 });
  }
}