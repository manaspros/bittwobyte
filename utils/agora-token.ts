import { RtcTokenBuilder, RtcRole } from "agora-access-token";

// Agora credentials - these should be stored in environment variables
const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

// Generate a token for the Agora channel
export const generateToken = async (
  channelName: string,
  uid: number | string
) => {
  try {
    // Check if credentials are properly configured
    if (!APP_ID || APP_ID === "your-agora-app-id") {
      console.warn("Agora App ID not configured properly");
      return null;
    }

    if (!APP_CERTIFICATE || APP_CERTIFICATE === "your-agora-certificate") {
      console.warn("Agora App Certificate not configured properly");
      // If running in development, continue without token
      if (process.env.NODE_ENV === "development") {
        console.log(
          "Development mode: continuing without token (limited functionality)"
        );
        return null;
      }
    }

    // Try to get a token from the server if we have a backend endpoint
    try {
      console.log("Fetching token from server API");
      const response = await fetch(
        `/api/agora-token?channel=${encodeURIComponent(
          channelName
        )}&uid=${uid}`,
        { signal: AbortSignal.timeout(5000) } // 5 second timeout
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Token received from server");
        return data.token;
      } else {
        console.warn(`Server token generation failed: ${response.status}`);
      }
    } catch (apiError) {
      console.warn("Error fetching token from API:", apiError);
    }

    // Fallback to client-side generation (less secure but works for demos)
    console.log("Falling back to local token generation");
    return generateLocalToken(channelName, uid);
  } catch (error) {
    console.error("Error in token generation:", error);
    return null;
  }
};

// Generate a token locally (less secure but works for demos)
const generateLocalToken = (channelName: string, uid: number | string) => {
  if (!APP_CERTIFICATE || APP_CERTIFICATE === "your-agora-certificate") {
    console.warn(
      "No valid Agora App Certificate found - token will not be generated"
    );
    return null;
  }

  try {
    // Set token expiration time - 1 hour from now
    const expirationTimeInSeconds = Math.floor(Date.now() / 1000) + 3600;

    // Build the token
    const token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID!,
      APP_CERTIFICATE,
      channelName,
      Number(uid),
      RtcRole.PUBLISHER,
      expirationTimeInSeconds
    );

    return token;
  } catch (error) {
    console.error("Local token generation failed:", error);
    return null;
  }
};
