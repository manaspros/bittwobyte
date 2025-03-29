const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

/**
 * Check if a user exists in the MongoDB database
 */
export async function checkUserExists(userId: string): Promise<boolean> {
  try {
    const response = await fetch(`${backendUrl}/api/users/${userId}`);
    return response.ok;
  } catch (error) {
    console.error("Error checking user existence:", error);
    return false;
  }
}

/**
 * Create or update a user in the MongoDB database
 */
export async function saveUser(userData: {
  userId: string;
  username: string;
  authProvider: string;
  auth0Id: string;
  email?: string;
  picture?: string;
}): Promise<boolean> {
  try {
    // The socket handles this through the authenticated event,
    // but we can also use the direct API
    const response = await fetch(`${backendUrl}/api/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });
    return response.ok;
  } catch (error) {
    console.error("Error saving user:", error);
    return false;
  }
}

/**
 * Get a user from the MongoDB database
 */
export async function getUser(userId: string) {
  try {
    const response = await fetch(`${backendUrl}/api/users/${userId}`);
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error("Error getting user:", error);
    return null;
  }
}
