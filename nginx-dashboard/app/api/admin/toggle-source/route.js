'use server';

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Config path for persistent storage
const CONFIG_PATH = path.join(process.cwd(), '.config');
const DATA_SOURCE_PATH = path.join(CONFIG_PATH, 'data_source.json');

/**
 * Initialize the config directory if it doesn't exist
 */
function ensureConfigDir() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      fs.mkdirSync(CONFIG_PATH, { recursive: true });
    }
    
    if (!fs.existsSync(DATA_SOURCE_PATH)) {
      fs.writeFileSync(DATA_SOURCE_PATH, JSON.stringify({ source: 'db' }), 'utf8');
    }
  } catch (error) {
    console.error('Error initializing config directory:', error);
  }
}

/**
 * Get the current data source
 */
export function getCurrentSource() {
  try {
    ensureConfigDir();
    const data = JSON.parse(fs.readFileSync(DATA_SOURCE_PATH, 'utf8'));
    return data.source || 'db';
  } catch (error) {
    console.error('Error reading data source config:', error);
    return 'db'; // Default to database if config can't be read
  }
}

/**
 * POST handler for toggling data source
 * Persists the data source choice to a config file
 */
export async function POST(request) {
  try {
    const { source } = await request.json();
    
    if (!source || (source !== 'db' && source !== 'file')) {
      return NextResponse.json({ 
        error: 'Invalid source parameter. Use "db" or "file".' 
      }, { status: 400 });
    }
    
    ensureConfigDir();
    
    // Save the new data source to the config file
    fs.writeFileSync(DATA_SOURCE_PATH, JSON.stringify({ source }), 'utf8');
    
    return NextResponse.json({ 
      success: true, 
      source,
      message: `Data source changed to ${source === 'db' ? 'PostgreSQL Database' : 'Static JSON Files'}`
    });
  } catch (error) {
    console.error('Error toggling data source:', error);
    return NextResponse.json({ 
      error: 'Failed to toggle data source', 
      details: error.message 
    }, { status: 500 });
  }
}