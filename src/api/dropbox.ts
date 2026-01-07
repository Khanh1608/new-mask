/**
 * Dropbox API Integration
 * OAuth 2.0 with PKCE for client-side authentication
 */

const DROPBOX_APP_KEY = 'YOUR_DROPBOX_APP_KEY'; // User will replace this
const DROPBOX_AUTH_URL = 'https://www.dropbox.com/oauth2/authorize';
const DROPBOX_TOKEN_URL = 'https://api.dropboxapi.com/oauth2/token';
const DROPBOX_UPLOAD_URL = 'https://content.dropboxapi.com/2/files/upload';

interface DropboxConfig {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

let config: DropboxConfig | null = null;

// PKCE helpers
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Initialize Dropbox from localStorage
 */
export function initDropbox(): void {
  const stored = localStorage.getItem('dropbox_config');
  if (stored) {
    try {
      config = JSON.parse(stored);
    } catch {
      config = null;
    }
  }
}

/**
 * Check if Dropbox is connected
 */
export function isDropboxConnected(): boolean {
  return config !== null && !!config.accessToken;
}

/**
 * Get Dropbox app key from localStorage or default
 */
export function getDropboxAppKey(): string {
  return localStorage.getItem('dropbox_app_key') || DROPBOX_APP_KEY;
}

/**
 * Set Dropbox app key
 */
export function setDropboxAppKey(appKey: string): void {
  localStorage.setItem('dropbox_app_key', appKey);
}

/**
 * Start OAuth flow - opens Dropbox authorization page
 */
export async function startDropboxAuth(): Promise<void> {
  const appKey = getDropboxAppKey();
  if (!appKey || appKey === 'YOUR_DROPBOX_APP_KEY') {
    throw new Error('Please set your Dropbox App Key first');
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Store verifier for token exchange
  localStorage.setItem('dropbox_code_verifier', codeVerifier);

  const redirectUri = window.location.origin + window.location.pathname;

  const params = new URLSearchParams({
    client_id: appKey,
    response_type: 'code',
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    token_access_type: 'offline',
  });

  window.location.href = `${DROPBOX_AUTH_URL}?${params.toString()}`;
}

/**
 * Handle OAuth callback - exchange code for token
 */
export async function handleDropboxCallback(code: string): Promise<boolean> {
  const appKey = getDropboxAppKey();
  const codeVerifier = localStorage.getItem('dropbox_code_verifier');

  if (!codeVerifier) {
    throw new Error('No code verifier found');
  }

  const redirectUri = window.location.origin + window.location.pathname;

  const response = await fetch(DROPBOX_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: appKey,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Failed to get access token');
  }

  const data = await response.json();

  config = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
  };

  localStorage.setItem('dropbox_config', JSON.stringify(config));
  localStorage.removeItem('dropbox_code_verifier');

  return true;
}

/**
 * Disconnect Dropbox
 */
export function disconnectDropbox(): void {
  config = null;
  localStorage.removeItem('dropbox_config');
}

/**
 * Upload file to Dropbox
 */
export async function uploadToDropbox(
  data: Blob | string,
  filename: string,
  folder = '/LayerMask Pro'
): Promise<{ success: boolean; path?: string; error?: string }> {
  if (!config?.accessToken) {
    return { success: false, error: 'Dropbox not connected' };
  }

  try {
    // Convert base64 to blob if needed
    let blob: Blob;
    if (typeof data === 'string') {
      // Assume base64 data URL
      const base64Data = data.replace(/^data:image\/\w+;base64,/, '');
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      blob = new Blob([bytes], { type: 'image/png' });
    } else {
      blob = data;
    }

    const path = `${folder}/${filename}`;

    const response = await fetch(DROPBOX_UPLOAD_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          path,
          mode: 'add',
          autorename: true,
          mute: false,
        }),
      },
      body: blob,
    });

    if (!response.ok) {
      const error = await response.json();

      // Check if token expired
      if (response.status === 401) {
        disconnectDropbox();
        return { success: false, error: 'Session expired. Please reconnect Dropbox.' };
      }

      return { success: false, error: error.error_summary || 'Upload failed' };
    }

    const result = await response.json();
    return { success: true, path: result.path_display };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Get auto-upload settings
 */
export function getAutoUploadSettings(): {
  enabled: boolean;
  uploadBase: boolean;
  uploadUpscale: boolean;
  uploadExport: boolean;
  folder: string;
} {
  const stored = localStorage.getItem('dropbox_auto_upload');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Fall through to default
    }
  }
  return {
    enabled: false,
    uploadBase: false,
    uploadUpscale: true,
    uploadExport: true,
    folder: '/LayerMask Pro',
  };
}

/**
 * Save auto-upload settings
 */
export function setAutoUploadSettings(settings: {
  enabled: boolean;
  uploadBase: boolean;
  uploadUpscale: boolean;
  uploadExport: boolean;
  folder: string;
}): void {
  localStorage.setItem('dropbox_auto_upload', JSON.stringify(settings));
}

// Initialize on load
initDropbox();
