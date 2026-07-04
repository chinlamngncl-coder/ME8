/**
 * mob-me8-i18n-ops-complete — merge locale patches + glossary fixes.
 * Run: node scripts/apply-i18n-ops-complete.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, '..', 'public', 'locales');

function loadJson(file) {
    return JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf8'));
}

function saveJson(file, obj) {
    const sorted = Object.keys(obj).sort().reduce((o, k) => {
        o[k] = obj[k];
        return o;
    }, {});
    fs.writeFileSync(path.join(localesDir, file), JSON.stringify(sorted, null, 2) + '\n', 'utf8');
}

function mergePatch(langFile, patch) {
    const locale = loadJson(langFile);
    Object.assign(locale, patch);
    saveJson(langFile, locale);
}

/** Glossary fixes — industry ops terms (existing bad strings). */
const glossaryFixes = {
    zh: {
        'ptt.audioCmd.auto': '自动',
        'ptt.downlink.auto': '自动',
        'auditTrail.colIp': 'IP 地址',
        'auditTrail.colAction': '操作',
        'auditTrail.colSummary': '摘要',
        'auditTrail.exportCsv': '导出 CSV',
        'auditTrail.filterAction': '操作',
        'auditTrail.filterSearchPh': '目标、操作、详情…',
        'auditTrail.prev': '上一页',
        'auditTrail.summaryKillSwitch': '终止开关报告 — 显示 {from}–{to}，共 {total} 条 · 存储共 {store} 条',
        'auditTrail.summaryGeofence': '电子围栏报告 — 显示 {from}–{to}，共 {total} 条 · 存储共 {store} 条',
        'auditTrail.summary': '显示 {from}–{to}（共 {total} 条匹配） · 存储共 {store} 条',
        'map.legend.geofenceOut': '电子围栏外',
    },
};

const patchZh = loadJson('patch-zh.json');
mergePatch('zh.json', patchZh);
mergePatch('zh.json', glossaryFixes.zh);

const patchKo = loadJson('patch-ko.json');
mergePatch('ko.json', patchKo);

const patchTh = loadJson('patch-th.json');
mergePatch('th.json', patchTh);

const patchId = loadJson('patch-id.json');
mergePatch('id.json', patchId);

const patchFil = loadJson('patch-fil.json');
mergePatch('fil.json', patchFil);

const en = loadJson('en.json');
const langs = ['en', 'zh', 'ko', 'th', 'id', 'fil'];
const enKeys = Object.keys(en);
let ok = true;
langs.forEach((l) => {
    const loc = loadJson(`${l}.json`);
    const miss = enKeys.filter((k) => !(k in loc));
    console.log(`${l}.json: ${Object.keys(loc).length} keys, missing vs en: ${miss.length}`);
    if (miss.length) ok = false;
});
process.exit(ok ? 0 : 1);
