'use strict';

const assert = require('assert');
const crypto = require('crypto');
const recoveryChallenge = require('./lib/recoveryChallenge');
const techAccess = require('./lib/techAccess');
const licenseManager = require('./lib/licenseManager');

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const publicKeyDer = publicKey.export({ format: 'der', type: 'spki' });

function signedEnvelope(claims) {
    // Exact CRM structure: sign UTF-8 JSON bytes, then Base64-wrap payload + signature.
    const payload = JSON.stringify(claims);
    const signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey);
    return Buffer.from(JSON.stringify({
        payload: Buffer.from(payload, 'utf8').toString('base64'),
        signature: signature.toString('base64'),
    }), 'utf8');
}

function tamperEnvelope(envelope) {
    const outer = JSON.parse(envelope.toString('utf8'));
    const claims = JSON.parse(Buffer.from(outer.payload, 'base64').toString('utf8'));
    claims.issued_at += 1;
    outer.payload = Buffer.from(JSON.stringify(claims), 'utf8').toString('base64');
    return Buffer.from(JSON.stringify(outer), 'utf8');
}

function expectReject(fn, label) {
    assert.throws(fn, undefined, label);
}

function testDiagnostics() {
    const challenge = techAccess.createUnlockChallenge();
    const valid = signedEnvelope({
        type: 'diagnostics_unlock',
        challenge_nonce: challenge.nonce,
        issued_at: Date.now(),
    });
    assert.strictEqual(
        techAccess.verifyUnlockGrant(valid, { publicKeyDer }),
        true,
        'diagnostics valid token must pass',
    );
    expectReject(
        () => techAccess.verifyUnlockGrant(valid, { publicKeyDer }),
        'diagnostics nonce must be deleted after success',
    );

    const tamperChallenge = techAccess.createUnlockChallenge();
    const signed = signedEnvelope({
        type: 'diagnostics_unlock',
        challenge_nonce: tamperChallenge.nonce,
        issued_at: Date.now(),
    });
    expectReject(
        () => techAccess.verifyUnlockGrant(tamperEnvelope(signed), { publicKeyDer }),
        'diagnostics tampered payload must fail',
    );
}

function testRecovery() {
    const challenge = JSON.parse(recoveryChallenge.generateChallenge().toString('utf8'));
    const valid = signedEnvelope({
        type: 'admin_recovery',
        challenge_nonce: challenge.nonce,
        target_username: 'global',
        new_password: 'Temporary-Test-Password-123!',
        issued_at: Date.now(),
    });
    const result = recoveryChallenge.verifyGrant(valid, { publicKeyDer });
    assert.strictEqual(result.targetUsername, 'global', 'recovery valid token must pass');
    expectReject(
        () => recoveryChallenge.verifyGrant(valid, { publicKeyDer }),
        'recovery nonce must be deleted after success',
    );

    const tamperChallenge = JSON.parse(recoveryChallenge.generateChallenge().toString('utf8'));
    const signed = signedEnvelope({
        type: 'admin_recovery',
        challenge_nonce: tamperChallenge.nonce,
        target_username: 'global',
        new_password: 'Temporary-Test-Password-123!',
        issued_at: Date.now(),
    });
    expectReject(
        () => recoveryChallenge.verifyGrant(tamperEnvelope(signed), { publicKeyDer }),
        'recovery tampered payload must fail',
    );
}

function testLicensing() {
    const payload = {
        customerName: 'Crypto Self-Test',
        hardwareId: licenseManager.computeHardwareId(),
        expiryDate: '2099-12-31',
        maxFixedCameras: 1,
        maxBwcDevices: 1,
    };
    const privateKeyPem = privateKey.export({ format: 'pem', type: 'pkcs8' });
    const publicKeyPem = publicKey.export({ format: 'pem', type: 'spki' });
    const signature = licenseManager.signPayload(payload, privateKeyPem);
    assert.strictEqual(
        licenseManager.verifySignature(payload, signature, publicKeyPem).ok,
        true,
        'license valid signature must pass',
    );
    const tampered = Object.assign({}, payload, { maxBwcDevices: 2 });
    assert.strictEqual(
        licenseManager.verifySignature(tampered, signature, publicKeyPem).ok,
        false,
        'license tampered payload must fail',
    );
}

testDiagnostics();
testRecovery();
testLicensing();
console.log('PASS diagnostics: valid accepted, nonce consumed, tamper rejected');
console.log('PASS recovery: valid accepted, nonce consumed, tamper rejected');
console.log('PASS licensing: valid accepted, tamper rejected');
