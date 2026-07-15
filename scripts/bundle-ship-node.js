#!/usr/bin/env node
/**
 * Bundle portable Node 22 + npm dependencies into a delivery pack appDir.
 * ME8 requires Node 22+ (built-in node:sqlite in siteDb.js). Match SaaS trial lane 22.18.0.
 * Usage: node scripts/bundle-ship-node.js <appRoot> <appDir>
 */
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const appRoot = path.resolve(process.argv[2] || '');
const appDir = path.resolve(process.argv[3] || '');
const NODE_VERSION = process.env.FM_SHIP_NODE_VERSION || '22.18.0';
const NODE_ZIP = `node-v${NODE_VERSION}-win-x64.zip`;
const NODE_URL = `https://nodejs.org/dist/v${NODE_VERSION}/${NODE_ZIP}`;

if (!appRoot || !appDir) {
  console.error('Usage: node bundle-ship-node.js <appRoot> <appDir>');
  process.exit(2);
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        try { fs.unlinkSync(dest); } catch (_) { /* ignore */ }
        download(res.headers.location, dest).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        try { fs.unlinkSync(dest); } catch (_) { /* ignore */ }
        reject(new Error(`Download failed ${res.statusCode}: ${url}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      try { fs.unlinkSync(dest); } catch (_) { /* ignore */ }
      reject(err);
    });
  });
}

function extractNode(cacheZip, toolsNode) {
  if (fs.existsSync(path.join(toolsNode, 'node.exe'))) {
    console.log('ship node: portable Node already staged');
    return;
  }
  fs.mkdirSync(toolsNode, { recursive: true });
  const tmp = path.join(appDir, 'tools', '_node_extract');
  if (fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  console.log('ship node: extracting portable Node...');
  const zipEsc = cacheZip.replace(/'/g, "''");
  const tmpEsc = tmp.replace(/'/g, "''");
  execSync(
    `powershell -NoProfile -Command "Expand-Archive -Path '${zipEsc}' -DestinationPath '${tmpEsc}' -Force"`,
    { stdio: 'inherit' }
  );
  const inner = path.join(tmp, `node-v${NODE_VERSION}-win-x64`);
  if (!fs.existsSync(path.join(inner, 'node.exe'))) {
    throw new Error('Node extract failed — node.exe missing');
  }
  for (const ent of fs.readdirSync(inner)) {
    fs.cpSync(path.join(inner, ent), path.join(toolsNode, ent), { recursive: true });
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('ship node: portable Node ->', toolsNode);
}

async function ensurePortableNode() {
  const toolsNode = path.join(appDir, 'tools', 'node');
  if (fs.existsSync(path.join(toolsNode, 'node.exe'))) return toolsNode;

  const cacheDir = path.join(appRoot, 'vendor', 'node-win-x64-cache');
  const cacheZip = path.join(cacheDir, NODE_ZIP);
  fs.mkdirSync(cacheDir, { recursive: true });
  if (!fs.existsSync(cacheZip)) {
    console.log('ship node: downloading', NODE_URL);
    await download(NODE_URL, cacheZip);
  }
  extractNode(cacheZip, toolsNode);
  return toolsNode;
}

function npmInstall(toolsNode) {
  const npmCmd = path.join(toolsNode, 'npm.cmd');
  const nm = path.join(appDir, 'node_modules');
  if (fs.existsSync(path.join(nm, 'dotenv'))) {
    console.log('ship node: node_modules already present');
    return;
  }
  if (fs.existsSync(nm)) fs.rmSync(nm, { recursive: true, force: true });
  console.log('ship node: npm install (may take a few minutes)...');
  const env = Object.assign({}, process.env, {
    PATH: `${toolsNode};${process.env.PATH || ''}`,
  });
  const lock = path.join(appDir, 'package-lock.json');
  const cmd = fs.existsSync(lock)
    ? `"${npmCmd}" ci --omit=dev`
    : `"${npmCmd}" install --omit=dev`;
  execSync(cmd, { cwd: appDir, env, stdio: 'inherit', shell: true });
  if (!fs.existsSync(path.join(nm, 'dotenv'))) {
    throw new Error('npm install failed — dotenv missing');
  }
  console.log('ship node: node_modules OK');
}

function verify(toolsNode) {
  const nodeExe = path.join(toolsNode, 'node.exe');
  execSync(`"${nodeExe}" --check "${path.join(appDir, 'run.js')}"`, { stdio: 'inherit' });
}

(async function main() {
  try {
    const toolsNode = await ensurePortableNode();
    npmInstall(toolsNode);
    verify(toolsNode);
    console.log('ship node: bundle OK');
  } catch (err) {
    console.error('ship node FAILED:', err.message || err);
    process.exit(1);
  }
})();
