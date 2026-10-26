// Starts a fresh Home Assistant in Docker, onboards it through the REST API and
// saves a logged-in browser state for the tests to reuse.
import {execFileSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {CLIENT_ID, COMPOSE_FILE, ENTITIES, HA_URL, STORAGE_STATE} from './ha.js';
import {dumpLogs} from './global-teardown.js';

const USER = {name: 'Test', username: 'test', password: 'onlylocklock-test', language: 'en'};

export default async function globalSetup() {
  // --force-recreate throws away the previous container, and with it HA's .storage.
  execFileSync('docker', ['compose', '-f', COMPOSE_FILE, 'up', '-d', '--force-recreate'], {stdio: 'inherit'});
  try {
    await onboard();
  } catch (error) {
    dumpLogs();
    throw error;
  }
}

async function onboard() {
  // The first boot takes a while, longer when the image has just been pulled.
  await waitFor('HA to start', async () => (await fetch(`${HA_URL}/api/onboarding`)).ok, 180_000);

  const {auth_code: code} = await post('/api/onboarding/users', {...USER, client_id: CLIENT_ID});
  const tokens = await fetchTokens(code);
  const auth = tokens.access_token;
  await post('/api/onboarding/core_config', {}, auth);
  await post('/api/onboarding/analytics', {}, auth);
  await post('/api/onboarding/integration', {client_id: CLIENT_ID, redirect_uri: `${HA_URL}/?auth_callback=1`}, auth);

  for (const entityId of Object.values(ENTITIES)) {
    await waitFor(`${entityId} to exist`, async () => (await get(`/api/states/${entityId}`, auth)).ok, 60_000);
  }

  // Workers start after global setup, so they inherit this.
  process.env.HA_TOKEN = auth;

  // The frontend reads its tokens from localStorage.hassTokens, so the tests start logged in.
  const hassTokens = {
    ...tokens,
    hassUrl: HA_URL,
    clientId: CLIENT_ID,
    expires: Date.now() + tokens.expires_in * 1000,
  };
  mkdirSync(dirname(STORAGE_STATE), {recursive: true});
  writeFileSync(STORAGE_STATE, JSON.stringify({
    cookies: [],
    origins: [{origin: HA_URL, localStorage: [{name: 'hassTokens', value: JSON.stringify(hassTokens)}]}],
  }));
}

async function fetchTokens(code) {
  const response = await fetch(`${HA_URL}/auth/token`, {
    method: 'POST',
    body: new URLSearchParams({grant_type: 'authorization_code', code, client_id: CLIENT_ID}),
  });
  if (!response.ok) throw new Error(`/auth/token: ${response.status} ${await response.text()}`);
  return response.json();
}

async function post(path, body, token) {
  const response = await fetch(`${HA_URL}${path}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', ...(token && {Authorization: `Bearer ${token}`})},
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`);
  return response.json();
}

function get(path, token) {
  return fetch(`${HA_URL}${path}`, {headers: {Authorization: `Bearer ${token}`}});
}

async function waitFor(what, check, timeout) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      if (await check()) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out after ${timeout / 1000}s waiting for ${what}`);
}
