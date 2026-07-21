'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const frStorageWorkspace = require('../lib/frStorageWorkspace');
const serverSettings = require('../lib/serverSettings');

const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'me8-fr-storage-'));

try {
    const baseDir = path.join(sandbox, 'app');
    const defaultRoot = path.join(baseDir, 'storage');
    fs.mkdirSync(defaultRoot, { recursive: true });

    assert.strictEqual(
        frStorageWorkspace.resolveRoot(baseDir, defaultRoot, {}),
        path.resolve(defaultRoot),
        'unset root must preserve the current storage location'
    );

    const configuredRoot = frStorageWorkspace.resolveRoot(baseDir, defaultRoot, {
        frStorage: { rootPath: path.join('data', 'fr') },
    });
    assert.strictEqual(configuredRoot, path.join(baseDir, 'data', 'fr'));

    const oldLayout = frStorageWorkspace.ensureManagedLayout(defaultRoot);
    fs.mkdirSync(path.join(oldLayout.blacklistRoot, 'photos'), { recursive: true });
    fs.writeFileSync(path.join(oldLayout.blacklistRoot, 'index.json'), '{"people":[]}');
    fs.writeFileSync(path.join(oldLayout.blacklistRoot, 'photos', 'face.jpg'), 'face');
    fs.writeFileSync(path.join(defaultRoot, 'fr-settings.json'), '{"matchThreshold":82}');
    fs.writeFileSync(path.join(oldLayout.cropsRoot, 'discard.jpg'), 'temporary crop');
    fs.writeFileSync(path.join(oldLayout.verifyTemp, 'discard.tmp'), 'temporary');

    const newRoot = path.join(sandbox, 'managed-fr');
    const migrated = frStorageWorkspace.prepareRootChange(defaultRoot, newRoot);
    assert.strictEqual(migrated.changed, true);
    assert(migrated.copied.includes('fr-blacklist'));
    assert(fs.existsSync(path.join(newRoot, 'fr-blacklist', 'index.json')));
    assert(fs.existsSync(path.join(newRoot, 'fr-blacklist', 'photos', 'face.jpg')));
    assert.strictEqual(
        fs.readFileSync(path.join(newRoot, 'fr-settings.json'), 'utf8'),
        '{"matchThreshold":82}'
    );
    assert(fs.existsSync(path.join(defaultRoot, 'fr-blacklist', 'index.json')), 'old data must remain for rollback');
    assert(!fs.existsSync(path.join(newRoot, 'fr-live-crops', 'discard.jpg')), 'live crops must not migrate');
    assert(!fs.existsSync(path.join(newRoot, 'fr-verify-tmp', 'discard.tmp')), 'temporary jobs must not migrate');
    frStorageWorkspace.MANAGED_DIRS.forEach((name) => {
        assert(fs.statSync(path.join(newRoot, name)).isDirectory(), name + ' must be created');
    });

    const conflictRoot = path.join(sandbox, 'conflict-fr');
    fs.mkdirSync(path.join(conflictRoot, 'fr-blacklist'), { recursive: true });
    fs.writeFileSync(path.join(conflictRoot, 'fr-blacklist', 'other.json'), '{}');
    assert.throws(
        () => frStorageWorkspace.prepareRootChange(defaultRoot, conflictRoot),
        /already contains fr-blacklist/
    );

    const normalized = serverSettings.normalize({
        frStorage: { rootPath: 'F:\\Mobility-FR' },
    });
    assert.strictEqual(normalized.frStorage.rootPath, 'F:\\Mobility-FR');

    console.log('PASS verify-fr-storage-workspace');
} finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
}
