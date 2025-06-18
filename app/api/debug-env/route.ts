import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    NILLION_SCHEMA_ID: process.env.NILLION_SCHEMA_ID,
    NILLION_NODE1_URL: process.env.NILLION_NODE1_URL,
    NILLION_ORG_DID: process.env.NILLION_ORG_DID,
    NILLION_SECRET_KEY: process.env.NILLION_SECRET_KEY,
    NEYNAR_API_KEY: process.env.NEYNAR_API_KEY,
    // Add any other variables you want to check
  });
} 