/**
 * Built-in Centre Summary assistant (node-llama-cpp + Qwen2.5 GGUF).
 *
 * Customer packages ship vendor/llm/*.gguf (vendor runs download-centre-llm.ps1 once).
 * On server start the model is copied to storage/llm/ — clients never download.
 *
 * Env:
 *   FM_LLM_AUTO_DOWNLOAD=0   default for rental — no client internet download
 *   FM_LLM_BUNDLE_DIR        override vendor/llm path
 *   FM_LLM_MODEL_FILE / FM_LLM_MODEL_URL
 *   FM_LLM_WARMUP=1          preload after start
 */

const fs = require('fs');
const path = require('path');

const LANG_NAMES = {
    en: 'English',
    fil: 'Filipino',
    id: 'Indonesian',
    th: 'Thai',
    ko: 'Korean',
};

const DEFAULT_MODEL_FILE = 'qwen2.5-3b-instruct-q4_k_m.gguf';
const DEFAULT_MODEL_URL = 'https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf';

let storageRoot = null;
let transferState = { active: false, pct: 0, error: null, mode: null };
let transferPromise = null;
let engine = {
    ready: false,
    loading: false,
    error: null,
    loadPromise: null,
    contextSequence: null,
};

function modelFileName() {
    return String(process.env.FM_LLM_MODEL_FILE || DEFAULT_MODEL_FILE).trim();
}

function modelUrl() {
    return String(process.env.FM_LLM_MODEL_URL || DEFAULT_MODEL_URL).trim();
}

function appRoot() {
    return storageRoot ? path.dirname(storageRoot) : path.join(__dirname, '..');
}

function bundleDir(root) {
    const base = root || appRoot();
    const custom = process.env.FM_LLM_BUNDLE_DIR;
    return custom ? path.resolve(custom) : path.join(base, 'vendor', 'llm');
}

function vendorModelPath(root) {
    return path.join(bundleDir(root), modelFileName());
}

function modelDir() {
    if (!storageRoot) throw new Error('Centre LLM not initialised.');
    return path.join(storageRoot, 'llm');
}

function modelPath() {
    return path.join(modelDir(), modelFileName());
}

function autoDownloadEnabled() {
    return process.env.FM_LLM_AUTO_DOWNLOAD === '1';
}

function langLabel(code) {
    return LANG_NAMES[String(code || 'en').toLowerCase()] || LANG_NAMES.en;
}

function copyFileWithProgress(src, dest) {
    return new Promise(function (resolve, reject) {
        transferState = { active: true, pct: 0, error: null, mode: 'copy' };
        const total = fs.statSync(src).size;
        let copied = 0;
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        const tmp = dest + '.part';
        const rd = fs.createReadStream(src);
        const wr = fs.createWriteStream(tmp);
        rd.on('data', function (chunk) {
            copied += chunk.length;
            if (total > 0) transferState.pct = Math.min(99, Math.round((copied / total) * 100));
        });
        rd.on('error', reject);
        wr.on('error', reject);
        wr.on('finish', function () {
            try {
                if (fs.existsSync(dest)) fs.unlinkSync(dest);
                fs.renameSync(tmp, dest);
                transferState.pct = 100;
                transferState.active = false;
                resolve(dest);
            } catch (err) {
                reject(err);
            }
        });
        rd.pipe(wr);
    });
}

async function downloadModelTo(dest) {
    if (transferPromise) return transferPromise;
    transferPromise = (async function () {
        const url = modelUrl();
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        const tmp = dest + '.part';
        transferState = { active: true, pct: 0, error: null, mode: 'download' };
        const res = await fetch(url, { redirect: 'follow' });
        if (!res.ok) {
            throw new Error('Model download failed (HTTP ' + res.status + ').');
        }
        const total = parseInt(res.headers.get('content-length') || '0', 10) || 0;
        const reader = res.body && res.body.getReader ? res.body.getReader() : null;
        if (!reader) throw new Error('Model download not supported in this Node version.');
        const file = fs.createWriteStream(tmp);
        let received = 0;
        try {
            while (true) {
                const chunk = await reader.read();
                if (chunk.done) break;
                file.write(Buffer.from(chunk.value));
                received += chunk.value.length;
                if (total > 0) {
                    transferState.pct = Math.min(99, Math.round((received / total) * 100));
                }
            }
            await new Promise(function (resolve, reject) {
                file.end(function (err) { return err ? reject(err) : resolve(); });
            });
            if (fs.existsSync(dest)) fs.unlinkSync(dest);
            fs.renameSync(tmp, dest);
            transferState.pct = 100;
        } catch (err) {
            try { file.close(); } catch (_) { /* ignore */ }
            try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch (_) { /* ignore */ }
            transferState.error = err.message;
            throw err;
        } finally {
            transferState.active = false;
            transferPromise = null;
        }
        return dest;
    })();
    return transferPromise;
}

async function installBundledModelIfNeeded() {
    const dest = modelPath();
    if (fs.existsSync(dest)) return dest;
    const bundled = vendorModelPath();
    if (!fs.existsSync(bundled)) return null;
    console.log('[centre-llm] Installing bundled AI model to storage/llm/ …');
    await copyFileWithProgress(bundled, dest);
    console.log('[centre-llm] AI model ready (shipped with installer).');
    return dest;
}

async function ensureModelFile() {
    const dest = modelPath();
    if (fs.existsSync(dest)) return dest;

    const bundled = vendorModelPath();
    if (fs.existsSync(bundled)) {
        return copyFileWithProgress(bundled, dest);
    }

    if (!autoDownloadEnabled()) {
        throw new Error(
            'Centre Summary AI model is not installed. '
            + 'Vendor must include vendor/llm/' + modelFileName() + ' in the customer package, '
            + 'or run scripts/download-centre-llm.ps1 before shipping.'
        );
    }

    return downloadModelTo(dest);
}

function init(storageDir) {
    storageRoot = storageDir;
    installBundledModelIfNeeded()
        .then(function (installed) {
            if (installed) return installed;
            if (autoDownloadEnabled()) {
                return ensureModelFile();
            }
            return null;
        })
        .catch(function (err) {
            console.warn('[centre-llm]', err.message);
        });
}

async function ensureEngine() {
    if (engine.ready && engine.contextSequence) return engine;
    if (engine.loadPromise) return engine.loadPromise;
    engine.loading = true;
    engine.error = null;
    engine.loadPromise = (async function () {
        const modelFile = await ensureModelFile();
        const { getLlama, LlamaChatSession } = await import('node-llama-cpp');
        const llama = await getLlama();
        const model = await llama.loadModel({ modelPath: modelFile });
        const context = await model.createContext({
            contextSize: Math.min(4096, model.trainContextSize || 4096),
        });
        engine.contextSequence = context.getSequence();
        engine.LlamaChatSession = LlamaChatSession;
        engine.ready = true;
        engine.loading = false;
        return engine;
    })().catch(function (err) {
        engine.loading = false;
        engine.error = err.message;
        engine.loadPromise = null;
        throw err;
    });
    return engine.loadPromise;
}

function compactSummary(summary) {
    const s = summary || {};
    return {
        updated: s.generatedAt,
        serverUptimeHours: Math.round((Number(s.serverUptimeSec) || 0) / 3600),
        fleet: s.fleet || {},
        sos: s.sos || {},
        storage: {
            total: s.storage && s.storage.totalLabel,
            breakdown: (s.storage && s.storage.breakdown) || [],
        },
        services: s.services || {},
        recentActivity: (s.recentActivity || []).slice(0, 12),
        trends: {
            dailyTotal: s.trends && s.trends.daily ? s.trends.daily.total : 0,
            weeklyTotal: s.trends && s.trends.weekly ? s.trends.weekly.total : 0,
            monthlyTotal: s.trends && s.trends.monthly ? s.trends.monthly.total : 0,
            weeklyBuckets: s.trends && s.trends.weekly
                ? (s.trends.weekly.buckets || []).slice(-7).map(function (b) {
                    return { period: b.label, sosCount: b.count, open: b.open, acknowledged: b.ack };
                })
                : [],
        },
    };
}

function buildSystemPrompt(lang) {
    const langName = langLabel(lang);
    return [
        'You are a calm, helpful operations assistant for a body-worn camera command centre.',
        'You only answer using the dashboard JSON data the user provides.',
        'Respond in ' + langName + '.',
        'Use plain language for dispatchers and supervisors — no code, file paths, or developer jargon.',
        'Be accurate with numbers from the data.',
        'If the answer is not in the data, say so briefly and suggest what they could check on the dashboard.',
        'Keep most answers to 2–6 short sentences unless they ask for more detail.',
    ].join('\n');
}

async function checkStatus() {
    const file = modelFileName();
    const dest = storageRoot ? modelPath() : null;
    const bundled = vendorModelPath();
    const hasRuntime = dest && fs.existsSync(dest);
    const hasBundled = fs.existsSync(bundled);

    if (transferState.active) {
        const verb = transferState.mode === 'copy' ? 'Installing AI from package' : 'Downloading AI';
        return {
            ok: true,
            engine: 'built-in',
            configuredModel: file,
            modelReady: false,
            installing: transferState.mode === 'copy',
            downloading: transferState.mode === 'download',
            downloadPct: transferState.pct,
            hint: verb + '… ' + (transferState.pct || 0) + '%',
        };
    }

    if (transferState.error) {
        return {
            ok: false,
            engine: 'built-in',
            configuredModel: file,
            modelReady: false,
            error: transferState.error,
            hint: 'Contact your vendor — AI model should be included in the installer.',
        };
    }

    if (!hasRuntime && hasBundled) {
        return {
            ok: true,
            engine: 'built-in',
            configuredModel: file,
            modelReady: false,
            installing: true,
            hint: 'AI included in your package — finishing setup…',
        };
    }

    if (!hasRuntime && !hasBundled) {
        return {
            ok: false,
            engine: 'built-in',
            configuredModel: file,
            modelReady: false,
            needsInstall: true,
            hint: autoDownloadEnabled()
                ? 'AI model missing — enable vendor bundle or internet download.'
                : 'AI model not included in this package. Contact your vendor.',
        };
    }

    if (engine.loading) {
        return {
            ok: true,
            engine: 'built-in',
            configuredModel: file,
            modelReady: false,
            loading: true,
            hint: 'Loading AI into memory (first question may take a minute)…',
        };
    }

    if (engine.error) {
        return {
            ok: false,
            engine: 'built-in',
            configuredModel: file,
            modelReady: false,
            error: engine.error,
            hint: 'Restart the server and try again.',
        };
    }

    return {
        ok: true,
        engine: 'built-in',
        configuredModel: file,
        modelReady: hasRuntime,
        bundled: hasBundled,
        hint: engine.ready ? null : 'AI installed — ready when you ask a question.',
    };
}

async function ask(question, summary, lang) {
    const q = String(question || '').trim();
    if (!q) throw new Error('Please enter a question.');
    if (q.length > 2000) throw new Error('Question is too long.');

    const eng = await ensureEngine();
    const context = compactSummary(summary);
    const userContent = buildSystemPrompt(lang) + '\n\nDashboard data (JSON):\n'
        + JSON.stringify(context, null, 2)
        + '\n\nQuestion: ' + q
        + '\n\nAnswer in plain language:';

    const Session = eng.LlamaChatSession;
    const session = new Session({
        contextSequence: eng.contextSequence,
        autoDisposeSequence: false,
    });
    try {
        const answer = await session.prompt(userContent, {
            maxTokens: 512,
            temperature: 0.35,
        });
        const text = String(answer || '').trim();
        if (!text) throw new Error('AI returned an empty answer. Try again.');
        return {
            ok: true,
            answer: text,
            model: modelFileName(),
            engine: 'built-in',
            lang: lang || 'en',
        };
    } finally {
        try { session.dispose(); } catch (_) { /* ignore */ }
    }
}

function warmup() {
    return ensureEngine().catch(function () { /* optional */ });
}

module.exports = {
    init,
    checkStatus,
    ask,
    warmup,
    langLabel,
    modelFileName,
    vendorModelPath,
    downloadModelTo,
    bundleDir,
};
