import { NextResponse } from "next/server";
import { RtcTokenBuilder, RtcRole } from "agora-access-token";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const channelName = searchParams.get("channel");
    const uid = searchParams.get("uid");

    if (!channelName || !uid) {
      return NextResponse.json(
        { error: "Missing channel name or uid" },
        { status: 400 }
      );
    }

    // Agora credentials from environment variables
    const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!appId || !appCertificate) {
      return NextResponse.json(
        { error: "Agora credentials not configured" },
        { status: 500 }
      );
    }

    // Set token expiration time - 1 hour
    const expirationTimeInSeconds = Math.floor(Date.now() / 1000) + 3600;

    // Build the token
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      parseInt(uid),
      RtcRole.PUBLISHER,
      expirationTimeInSeconds
    );

    return NextResponse.json({ token });
  } catch (error) {
    console.error("Error generating Agora token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
