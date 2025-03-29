const fetch = require("node-fetch");

const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";

async function testEndpoint(url, method = "GET", body = null) {
  console.log(`Testing ${method} ${url}...`);

  try {
    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (body && (method === "POST" || method === "PUT")) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const status = response.status;

    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = await response.text();
    }

    console.log(`Status: ${status}`);
    console.log("Response:", data);

    return { status, data };
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return { status: "ERROR", error: error.message };
  }
}

async function runTests() {
  console.log(`Testing backend API at ${backendUrl}`);
  console.log("------------------------");

  // Health check
  await testEndpoint(`${backendUrl}/api/health`);

  // User endpoints
  await testEndpoint(`${backendUrl}/api/users`);

  // Test user creation
  const testUserId = `test_user_${Date.now()}`;
  await testEndpoint(`${backendUrl}/api/users`, "POST", {
    userId: testUserId,
    username: "TestUser",
    authProvider: "test",
  });

  // Test getting a user
  await testEndpoint(`${backendUrl}/api/users/${testUserId}`);

  // Test online users
  await testEndpoint(`${backendUrl}/api/users/online`);

  console.log("Tests completed.");
}

runTests().catch(console.error);
