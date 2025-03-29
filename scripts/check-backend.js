#!/usr/bin/env node

/**
 * This script checks if the backend server is running and starts it if needed
 */

const { exec, spawn } = require("child_process");
const path = require("path");
const http = require("http");
const fs = require("fs");

const projectRoot = path.resolve(__dirname, "..");
const backendPath = path.join(projectRoot, "backend");

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

console.log(`${colors.cyan}Bit2Byte Backend Server Check${colors.reset}`);
console.log(
  `${colors.blue}Checking if server is already running...${colors.reset}`
);

// Check if server is running
function checkServerRunning() {
  return new Promise((resolve) => {
    http
      .get("http://localhost:5000/api/health", (res) => {
        if (res.statusCode === 200) {
          console.log(
            `${colors.green}✓ Backend server is already running${colors.reset}`
          );
          resolve(true);
        } else {
          console.log(
            `${colors.yellow}⚠ Backend server returned status ${res.statusCode}${colors.reset}`
          );
          resolve(false);
        }
      })
      .on("error", () => {
        console.log(
          `${colors.yellow}⚠ Backend server not running${colors.reset}`
        );
        resolve(false);
      });
  });
}

// Check if the backend directory and required files exist
function checkBackendExists() {
  if (!fs.existsSync(backendPath)) {
    console.log(
      `${colors.red}✗ Backend directory not found at ${backendPath}${colors.reset}`
    );
    return false;
  }

  const serverFile = path.join(backendPath, "server.js");
  if (!fs.existsSync(serverFile)) {
    console.log(
      `${colors.red}✗ Backend server.js not found at ${serverFile}${colors.reset}`
    );
    return false;
  }

  return true;
}

// Start the backend server
function startServer() {
  console.log(`${colors.blue}Starting backend server...${colors.reset}`);

  // Check if running on Windows for correct command
  const isWindows = process.platform === "win32";

  // Use the npm script to start the server in a new terminal window
  if (isWindows) {
    // Windows command
    const startCommand = `start cmd.exe /K "cd ${projectRoot} && npm run server"`;
    exec(startCommand, (error) => {
      if (error) {
        console.log(
          `${colors.red}✗ Failed to start server: ${error}${colors.reset}`
        );
        return;
      }
      console.log(
        `${colors.green}✓ Server started in a new window${colors.reset}`
      );
    });
  } else {
    // macOS/Linux command
    const startCommand = `gnome-terminal -- bash -c "cd ${projectRoot} && npm run server; exec bash" || xterm -e "cd ${projectRoot} && npm run server" || terminal -e "cd ${projectRoot} && npm run server"`;
    exec(startCommand, (error) => {
      if (error) {
        console.log(
          `${colors.yellow}⚠ Failed to open new terminal, starting in background...${colors.reset}`
        );
        // Fallback: start in background
        const child = spawn("npm", ["run", "server"], {
          cwd: projectRoot,
          detached: true,
          stdio: "ignore",
        });
        child.unref();
        console.log(
          `${colors.green}✓ Server started in background${colors.reset}`
        );
      } else {
        console.log(
          `${colors.green}✓ Server started in a new terminal${colors.reset}`
        );
      }
    });
  }
}

// Main function
async function main() {
  const serverRunning = await checkServerRunning();

  if (!serverRunning) {
    if (checkBackendExists()) {
      startServer();

      // Give the server some time to start
      console.log(
        `${colors.blue}Waiting for server to start...${colors.reset}`
      );
      setTimeout(async () => {
        const serverStarted = await checkServerRunning();
        if (serverStarted) {
          console.log(
            `${colors.green}✓ Server is now running on http://localhost:5000${colors.reset}`
          );
        } else {
          console.log(
            `${colors.red}✗ Server failed to start. Please check the server logs or run 'npm run server' manually.${colors.reset}`
          );
        }
      }, 5000);
    } else {
      console.log(
        `${colors.red}✗ Backend files missing. Please make sure the backend directory exists and has a server.js file.${colors.reset}`
      );
    }
  }
}

main();
