import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 }
      );
    }

    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

    // Check the backend to see if this user is registered
    const response = await fetch(`${backendUrl}/api/users/${userId}`, {
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { exists: false, error: `Backend returned ${response.status}` },
        { status: 200 }
      );
    }

    const data = await response.json();
    return NextResponse.json({ exists: !!data, user: data }, { status: 200 });
  } catch (error) {
    console.error("Error checking user:", error);
    return NextResponse.json(
      { error: "Failed to check user authentication status" },
      { status: 500 }
    );
  }
}
