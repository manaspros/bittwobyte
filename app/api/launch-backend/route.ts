import { exec } from 'child_process';
import { NextResponse } from 'next/server';
import path from 'path';

export async function GET() {
  // Only allow this in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    // Get the project root directory
    const projectRoot = path.resolve(process.cwd());
    
    // Run the check-backend script to start the server if needed
    exec(`node ${projectRoot}/scripts/check-backend.js`, (error, stdout) => {
      if (error) {
        console.error(`Error executing check-backend script: ${error.message}`);
        return;
      }
      
      console.log(`Backend check output: ${stdout}`);
    });

    return NextResponse.json({ message: 'Backend server launch initiated' });
  } catch (error) {
    console.error('Error launching backend server:', error);
    return NextResponse.json(
      { error: 'Failed to launch backend server' },
      { status: 500 }
    );
  }
}
