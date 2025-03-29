import { NextResponse } from "next/server";

export async function GET() {
  try {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
    const response = await fetch(`${backendUrl}/api/health`, {
      // Add a timeout to avoid long waits if backend is down
      signal: AbortSignal.timeout(3000),
    });

    const status = response.ok ? "online" : "error";
    const data = await response.text();

    return NextResponse.json({
      status,
      message: response.ok
        ? "Backend is running"
        : `Backend error: ${response.status}`,
      data: response.ok ? data : null,
    });
  } catch (error) {
    console.error("Backend health check failed:", error);
    return NextResponse.json({
      status: "offline",
      message: error instanceof Error ? error.message : "Unknown error",
      data: null,
    });
  }
}
