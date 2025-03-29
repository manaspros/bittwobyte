# Bit2Byte Video Call Application

A video call application built with Next.js, Agora RTC, and Auth0 authentication.

## Features

- Secure user authentication with Auth0
- Real-time audio/video calls using Agora SDK
- Create and join call channels
- Toggle audio/video during calls
- Responsive UI for various devices

## Setup Instructions

### Prerequisites

- Node.js (>= 14.x)
- An Auth0 account
- An Agora account with an App ID and App Certificate

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Auth0 Configuration
NEXT_PUBLIC_AUTH0_DOMAIN=your-auth0-domain.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret
AUTH0_AUDIENCE=your-auth0-api-audience

# Agora Configuration
AGORA_APP_ID=your-agora-app-id
AGORA_APP_CERTIFICATE=your-agora-app-certificate
AGORA_PRIMARY_CERTIFICATE=your-agora-primary-certificate

# Server Configuration
PORT=5000
```

### Installation

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npm run dev
   ```

3. Start the backend server:
   ```
   npm run server
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Auth0 Setup

1. Create a new Auth0 application (Regular Web Application)
2. Configure the following URLs in your Auth0 Dashboard:
   - Allowed Callback URLs: `http://localhost:3000/api/auth/callback`
   - Allowed Logout URLs: `http://localhost:3000`
   - Allowed Web Origins: `http://localhost:3000`
3. Create an API in Auth0 Dashboard and set the identifier as your AUTH0_AUDIENCE value

## Agora Setup

1. Create an account at [Agora.io](https://www.agora.io/)
2. Create a new project in the Agora Console
3. Generate a temporary token or use the App Certificate for token generation
4. Copy the App ID and App Certificate to your .env file

## Usage

1. Navigate to the Video Call page
2. Enter a channel name to create or join a call
3. Toggle audio/video during the call using the control buttons
4. Click "Leave Call" to end the call

## Folder Structure

- `/app`: Next.js pages and routing
- `/backend`: Express server for Agora token generation
  - `/middleware`: Authentication middleware
  - `/routes`: API endpoints
  - `/services`: Business logic
- `/components`: React components
- `/hooks`: Custom React hooks
- `/public`: Static assets

## License

MIT