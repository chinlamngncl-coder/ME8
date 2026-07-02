'use strict';
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const enterpriseEnv = require('../lib/enterpriseEnv');

const root = path.join(__dirname, '..');
const args = process.argv.slice(2);
let envPath = path.join(root, '.env');

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--env' && args[i + 1]) {
        envPath = path.resolve(args[i + 1]);
        i++;
    }
}

const merged = Object.assign({}, process.env);
if (fs.existsSync(envPath)) {
    Object.assign(merged, dotenv.parse(fs.readFileSync(envPath, 'utf8')));
}

const examplePath = path.join(root, '.env.enterprise.example');
if (fs.existsSync(examplePath)) {
    const example = dotenv.parse(fs.readFileSync(examplePath, 'utf8'));
    const exampleCheck = enterpriseEnv.validateEnterpriseEnv(example, root);
    if (!exampleCheck.ok) {
        console.error('FAIL: .env.enterprise.example invalid');
        exampleCheck.errors.forEach((e) => console.error(' -', e));
        process.exit(1);
    }
    console.log('ok: .env.enterprise.example validates');
}

const live = enterpriseEnv.validateEnterpriseEnv(merged, root);
const status = enterpriseEnv.publicEnterpriseStatus(merged, root);

console.log('enterprise env status:', JSON.stringify(status, null, 2));

if (!live.ok) {
    console.error('FAIL: .env enterprise validation');
    live.errors.forEach((e) => console.error(' -', e));
    process.exit(1);
}

console.log('enterprise env test OK');
process.exit(0);
