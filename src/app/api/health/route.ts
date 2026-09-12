import { NextResponse } from 'next/server';

interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  environment: string;
  version: string;
  uptime: number;
}

export function GET(): NextResponse<HealthResponse> {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? 'unknown',
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0',
    uptime: process.uptime(),
  });
}