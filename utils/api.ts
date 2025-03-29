import { User, Message } from "@/types/chat";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

// Helper function to fetch with retry and better diagnostics
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 2
) {
  try {
    console.log(`Fetching: ${url}`);

    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout (increased from 5s)

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Request failed with status ${response.status}: ${url}`);
      const errorText = await response.text();
      console.warn(
        `Error details: ${errorText || "No error details provided"}`
      );

      if (response.status === 404) {
        console.error(`API endpoint not found: ${url}`);
        console.info(
          "This could indicate the server is not running or the endpoint is incorrect"
        );
      }

      throw new Error(`API request failed: ${response.status}`);
    }

    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      console.error(`Request timed out: ${url}`);
      throw new Error(`Request timed out: ${url}`);
    }

    if (retries > 0) {
      console.log(`Retrying request to ${url}, ${retries} retries left`);
      // Wait 1 second before retrying
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

// Check if the backend server is running
export const checkServerStatus = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });
    return response.ok;
  } catch (error) {
    console.error("Backend server appears to be offline:", error);
    return false;
  }
};

// Generate mock users when the server is unavailable
const generateMockUsers = (count = 5): User[] => {
  console.log("Generating mock users as fallback");
  const users = [];
  for (let i = 1; i <= count; i++) {
    users.push({
      id: `user_${i}`,
      username: `User ${i}`,
      isOnline: Math.random() > 0.5,
      lastSeen: new Date().toISOString(),
    });
  }
  return users;
};

export const fetchOnlineUsers = async (): Promise<User[]> => {
  try {
    // First check if server is running
    const isServerRunning = await checkServerStatus();
    if (!isServerRunning) {
      console.log("Server offline, returning mock online users");
      return generateMockUsers(3).filter((u) => u.isOnline);
    }

    console.log(`Fetching online users from: ${API_BASE_URL}/api/users/online`);
    const response = await fetchWithRetry(`${API_BASE_URL}/api/users/online`);
    const data = await response.json();
    console.log(`Got ${data.length} online users`);
    return data;
  } catch (error) {
    console.error("Error fetching online users:", error);
    // Return mock data as fallback
    return generateMockUsers(3).filter((u) => u.isOnline);
  }
};

export const fetchAllUsers = async (): Promise<User[]> => {
  try {
    // First check if server is running
    const isServerRunning = await checkServerStatus();
    if (!isServerRunning) {
      console.log("Server offline, returning mock users");
      return generateMockUsers(8);
    }

    console.log(`Fetching all users from: ${API_BASE_URL}/api/users`);
    const response = await fetchWithRetry(`${API_BASE_URL}/api/users`);
    const data = await response.json();
    console.log(`Got ${data.length} users`);
    return data;
  } catch (error) {
    console.error("Error fetching users:", error);
    // Return mock data as fallback
    return generateMockUsers(8);
  }
};

// Generate mock messages when the server is unavailable
const generateMockMessages = (roomId: string, count = 10): Message[] => {
  console.log(`Generating mock messages for room: ${roomId}`);
  const messages = [];
  for (let i = 1; i <= count; i++) {
    messages.push({
      id: `msg_${i}`,
      user: `User ${Math.ceil(Math.random() * 5)}`,
      userId: `user_${Math.ceil(Math.random() * 5)}`,
      text: `This is message ${i} in room ${roomId}`,
      room: roomId,
      timestamp: new Date(Date.now() - (count - i) * 60000).toISOString(),
    });
  }
  return messages;
};

export const fetchMessageHistory = async (
  roomId: string
): Promise<Message[]> => {
  try {
    // First check if server is running
    const isServerRunning = await checkServerStatus();
    if (!isServerRunning) {
      console.log(
        `Server offline, returning mock messages for room: ${roomId}`
      );
      return generateMockMessages(roomId);
    }

    console.log(`Fetching message history for room: ${roomId}`);
    const response = await fetchWithRetry(
      `${API_BASE_URL}/api/messages/${roomId}`
    );
    const data = await response.json();
    console.log(`Got ${data.length} messages for room ${roomId}`);
    return data;
  } catch (error) {
    console.error("Error fetching message history:", error);
    // Return mock messages as fallback
    return generateMockMessages(roomId);
  }
};

// Debugging utility for message issues
export const debugMessages = async (roomId: string): Promise<any> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/debug/messages/${roomId}`
    );
    return await response.json();
  } catch (error) {
    console.error("Debug API error:", error);
    return { error: error.message };
  }
};
