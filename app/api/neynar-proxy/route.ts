import { NextRequest, NextResponse } from "next/server";
import axios from 'axios';

export const runtime = "edge";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

const api = axios.create({
  baseURL: 'https://api.neynar.com/v2/farcaster',
  headers: {
    'accept': 'application/json',
    'x-api-key': NEYNAR_API_KEY
  }
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, params } = body;
    
    const response = await api.get(endpoint, { params });
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Neynar proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from Neynar' },
      { status: 500 }
    );
  }
} 