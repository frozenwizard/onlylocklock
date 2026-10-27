// Builds the rows, starts a fresh Home Assistant in Docker, onboards it through the
// REST API and creates a token for the tests' REST calls. The browser needs no
// token: HA logs it in through the trusted_networks provider.
import {execFileSync} from 'node:child_process';
import {CLIENT_ID, COMPOSE_FILE, ENTITIES, HA_URL} from './ha.js';
import {dumpLogs} from './global-teardown.js';

const USER = {name: 'Test', username: 'test', password: 'onlylocklock-test', language: 'en'};

export default async function globalSetup() {
  // Builds here rather than in the npm script, so `npx playwright test` never tests a stale bundle.
  execFileSync('npm', ['run', 'build'], {stdio: 'inherit'});
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
  const auth = (await fetchTokens(code)).access_token;
  await post('/api/onboarding/core_config', {}, auth);
  await post('/api/onboarding/analytics', {}, auth);
  await post('/api/onboarding/integration', {client_id: CLIENT_ID, redirect_uri: `${HA_URL}/?auth_callback=1`}, auth);

  for (const entityId of Object.values(ENTITIES)) {
    await waitFor(`${entityId} to exist`, async () => (await get(`/api/states/${entityId}`, auth)).ok, 60_000);
  }

  // The access token lasts 30 minutes, which `playwright test --ui` or a long
  // --repeat-each run can outlast. Workers start after global setup, so they inherit this.
  process.env.HA_TOKEN = await createLongLivedToken(auth);
}

// HA only creates long-lived tokens through its websocket API.
async function createLongLivedToken(accessToken) {
  const socket = new WebSocket(`${HA_URL.replace(/^http/, 'ws')}/api/websocket`);
  try {
    return await new Promise((resolve, reject) => {
      socket.addEventListener('error', () => reject(new Error('Websocket connection to HA failed')));
      socket.addEventListener('message', ({data}) => {
        const message = JSON.parse(data);
        if (message.type === 'auth_required') {
          socket.send(JSON.stringify({type: 'auth', access_token: accessToken}));
        } else if (message.type === 'auth_ok') {
          socket.send(JSON.stringify({
            id: 1, type: 'auth/long_lived_access_token', client_name: 'onlylocklock tests', lifespan: 1,
          }));
        } else if (message.type === 'result' && message.success) {
          resolve(message.result);
        } else {
          reject(new Error(`Creating a long-lived token: ${data}`));
        }
      });
    });
  } finally {
    socket.close();
  }
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
