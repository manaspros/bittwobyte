import { NextResponse } from "next/server";

// This route serves as a fallback for the backend's user creation API
export async function POST(request: Request) {
  try {
    const userData = await request.json();
    console.log("Frontend API received user data:", userData);

    if (!userData.userId || !userData.username) {
      return NextResponse.json(
        {
          error: "userId and username are required",
        },
        { status: 400 }
      );
    }

    // Forward to backend
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

    // Try multiple URL formats
    const urls = [`${backendUrl}/api/users`, `${backendUrl}/users`];

    let success = false;
    let responseData = null;
    let lastError = null;

    // Try each URL
    for (const url of urls) {
      try {
        console.log(`Trying to save user to: ${url}`);
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(userData),
        });

        if (response.ok) {
          responseData = await response.json();
          success = true;
          console.log("User saved successfully to:", url);
          break;
        } else {
          lastError = `Status ${response.status}: ${await response.text()}`;
          console.error(`Failed at ${url}: ${lastError}`);
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        console.error(`Error at ${url}:`, lastError);
      }
    }

    if (success) {
      return NextResponse.json(responseData);
    } else {
      console.error("All URLs failed. Last error:", lastError);
      // Cache user data on client side anyway
      return NextResponse.json(
        {
          id: userData.userId,
          username: userData.username,
          isOnline: true,
          lastSeen: new Date().toISOString(),
          error: "Saved locally only. Backend error: " + lastError,
          _cached: true,
        },
        { status: 207 }
      ); // 207 Multi-Status
    }
  } catch (error) {
    console.error("Error in users API route:", error);
    return NextResponse.json(
      {
        error: "Failed to process user data",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
