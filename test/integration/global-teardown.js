// Saves HA's log next to the test results, then removes the container.
// Set HA_KEEP_RUNNING=1 to leave HA up for debugging.
import {execFileSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {COMPOSE_FILE} from './ha.js';

export function dumpLogs() {
  const logs = execFileSync('docker', ['compose', '-f', COMPOSE_FILE, 'logs', '--no-color']);
  mkdirSync('test-results', {recursive: true});
  writeFileSync('test-results/home-assistant.log', logs);
}

export default async function globalTeardown() {
  dumpLogs();
  if (process.env.HA_KEEP_RUNNING) return;
  execFileSync('docker', ['compose', '-f', COMPOSE_FILE, 'down'], {stdio: 'inherit'});
}
