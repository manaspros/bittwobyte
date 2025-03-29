import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Only allow in development mode
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Debug endpoints disabled in production" },
      { status: 403 }
    );
  }

  try {
    const userId = params.id;
    if (!userId) {
      return NextResponse.json(
        { error: "No user ID provided" },
        { status: 400 }
      );
    }

    // Gather debug information
    const debug = {
      userId,
      decodedUserId: decodeURIComponent(userId),
      localStorage: null as any,
      backendCheck: null as any,
      directApi: null as any,
    };

    // Check backend
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
    try {
      const backendResponse = await fetch(`${backendUrl}/api/users/${userId}`, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (backendResponse.ok) {
        debug.backendCheck = {
          status: backendResponse.status,
          data: await backendResponse.json(),
        };
      } else {
        debug.backendCheck = {
          status: backendResponse.status,
          error: await backendResponse.text(),
        };

        // Try with decoded ID as well
        const decodedResponse = await fetch(
          `${backendUrl}/api/users/${debug.decodedUserId}`,
          {
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
          }
        );

        if (decodedResponse.ok) {
          debug.backendCheck.decodedIdCheck = {
            status: decodedResponse.status,
            data: await decodedResponse.json(),
          };
        } else {
          debug.backendCheck.decodedIdCheck = {
            status: decodedResponse.status,
            error: await decodedResponse.text(),
          };
        }
      }
    } catch (error) {
      debug.backendCheck = {
        error: error instanceof Error ? error.message : String(error),
      };
    }

    return NextResponse.json(debug);
  } catch (error) {
    console.error("Debug API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
