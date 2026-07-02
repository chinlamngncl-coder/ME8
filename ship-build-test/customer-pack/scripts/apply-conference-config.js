#!/usr/bin/env node
/** Apply storage/conference-settings.json to .env + docker/livekit.yaml */
const path = require('path');
const root = path.join(__dirname, '..');
const conferenceConfig = require(path.join(root, 'lib/conferenceConfig.js'));

conferenceConfig.init({
    storageDir: path.join(root, 'storage'),
    baseDir: root,
});
conferenceConfig.applyToEnvAndDocker(conferenceConfig.load());
console.log('Applied conference settings to .env and livekit.yaml');
