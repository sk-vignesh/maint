/**
 * OnTrack API Proxy — catch-all route
 *
 * Proxies all requests from the browser to the OnTrack API server-side,
 * eliminating CORS issues. The browser never contacts the external API directly.
 *
 * Route: /api/ontrack/[...path]
 * Example: /api/ontrack/walkaround-templates → https://ontrack-api.agilecyber.acom/int/v1/walkaround-templates
 */

import { NextRequest, NextResponse } from "next/server"

const ONTRACK_BASE = process.env.ONTRACK_API_BASE_URL ?? "https://ontrack-api.agilecyber.acom/int/v1"

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params)
}

async function proxy(req: NextRequest, params: { path: string[] }) {
  const path = params.path.join("/")
  const url = new URL(`${ONTRACK_BASE}/${path}`)

  // Forward query params
  req.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value)
  })

  // Build headers — forward auth token, content-type
  const headers: Record<string, string> = {
    "Accept": "application/json",
  }

  const authHeader = req.headers.get("authorization")
  if (authHeader) {
    headers["Authorization"] = authHeader
  }

  const contentType = req.headers.get("content-type")
  if (contentType) {
    headers["Content-Type"] = contentType
  }

  // Forward body for non-GET requests
  let body: string | undefined
  if (req.method !== "GET" && req.method !== "HEAD") {
    try {
      body = await req.text()
    } catch {
      // No body
    }
  }

  try {
    const upstream = await fetch(url.toString(), {
      method: req.method,
      headers,
      body,
    })

    const responseBody = await upstream.text()

    return new NextResponse(responseBody, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      },
    })
  } catch (err) {
    console.error("[OnTrack Proxy] Upstream error:", err)
    return NextResponse.json(
      { error: "Proxy failed to reach OnTrack API", detail: String(err) },
      { status: 502 }
    )
  }
}
