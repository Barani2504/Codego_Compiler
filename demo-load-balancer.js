#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════╗
 * ║       CodeGoAI — Load Balancer Live Demo             ║
 * ║  Shows NGINX distributing traffic across 4 NestJS    ║
 * ║  API instances using the least-connections algorithm ║
 * ╚══════════════════════════════════════════════════════╝
 *
 * Usage:
 *   node demo-load-balancer.js            → 20 requests, default localhost
 *   node demo-load-balancer.js 40         → 40 requests
 *   node demo-load-balancer.js 20 80      → 20 requests to port 80
 */

const http = require('http');

// ── Config ────────────────────────────────────────────────────────────────────
const TOTAL_REQUESTS  = parseInt(process.argv[2]) || 20;
const PORT            = parseInt(process.argv[3]) || 80;
const HOST            = process.argv[4]           || 'localhost';
const CONCURRENCY     = 4;   // fire 4 requests at a time (one per API instance)
const ENDPOINT        = `/api/instance`;

// ── ANSI colours ──────────────────────────────────────────────────────────────
const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';
const GREEN  = '\x1b[32m';
const CYAN   = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RED    = '\x1b[31m';
const MAGENTA= '\x1b[35m';
const BLUE   = '\x1b[34m';
const WHITE  = '\x1b[97m';

// One colour per instance (cycles if there are more than 6 instances)
const INSTANCE_COLORS = [GREEN, CYAN, YELLOW, MAGENTA, BLUE, RED];
const instanceColorMap = {};
let colorIndex = 0;

function colorFor(instance) {
  if (!instanceColorMap[instance]) {
    instanceColorMap[instance] = INSTANCE_COLORS[colorIndex++ % INSTANCE_COLORS.length];
  }
  return instanceColorMap[instance];
}

// ── HTTP helper ───────────────────────────────────────────────────────────────
function fetchInstance(reqNum) {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = http.get({ host: HOST, port: PORT, path: ENDPOINT }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        const ms = Date.now() - start;
        try {
          const data = JSON.parse(body);
          resolve({ ok: true, reqNum, ms, ...data });
        } catch {
          resolve({ ok: false, reqNum, ms, instance: '?', error: 'JSON parse error' });
        }
      });
    });
    req.on('error', (e) => {
      resolve({ ok: false, reqNum, ms: Date.now() - start, instance: 'ERROR', error: e.message });
    });
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ ok: false, reqNum, ms: 5000, instance: 'TIMEOUT', error: 'Request timed out' });
    });
  });
}

// ── Fancy header ──────────────────────────────────────────────────────────────
function printHeader() {
  console.log('');
  console.log(`${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${CYAN}║${WHITE}        CodeGoAI — NGINX Load Balancer Live Demo              ${CYAN}║${RESET}`);
  console.log(`${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════╝${RESET}`);
  console.log(`${DIM}  Target : http://${HOST}:${PORT}${ENDPOINT}${RESET}`);
  console.log(`${DIM}  Sending: ${TOTAL_REQUESTS} requests  (${CONCURRENCY} concurrent)${RESET}`);
  console.log(`${DIM}  Algorithm: least_conn (NGINX)${RESET}`);
  console.log('');
  console.log(`${BOLD}  #    Instance         PID       Time${RESET}`);
  console.log(`  ${'─'.repeat(52)}`);
}

// ── Print a single result row ─────────────────────────────────────────────────
function printRow(r) {
  const col = r.ok ? colorFor(r.instance) : RED;
  const num   = String(r.reqNum).padStart(3);
  const inst  = (r.instance || 'unknown').padEnd(16);
  const pid   = String(r.pid   || '').padEnd(9);
  const ms    = `${r.ms}ms`.padStart(6);
  const bar   = r.ok ? `${col}●${RESET}` : `${RED}✗${RESET}`;
  console.log(`  ${DIM}${num}${RESET}  ${bar} ${col}${BOLD}${inst}${RESET}  ${DIM}${pid}${RESET} ${DIM}${ms}${RESET}`);
}

// ── Summary table ─────────────────────────────────────────────────────────────
function printSummary(results, totalMs) {
  const counts = {};
  let errors   = 0;
  results.forEach(r => {
    if (!r.ok) { errors++; return; }
    counts[r.instance] = (counts[r.instance] || 0) + 1;
  });

  const instances   = Object.keys(counts).sort();
  const totalOk     = results.length - errors;
  const avgMs       = Math.round(results.reduce((s, r) => s + r.ms, 0) / results.length);

  console.log('');
  console.log(`  ${'─'.repeat(52)}`);
  console.log(`${BOLD}${WHITE}  Distribution Summary${RESET}`);
  console.log('');

  instances.forEach(inst => {
    const col   = colorFor(inst);
    const count = counts[inst];
    const pct   = Math.round((count / totalOk) * 100);
    const bar   = '█'.repeat(Math.round(pct / 4)).padEnd(25);
    console.log(`  ${col}${BOLD}${inst.padEnd(18)}${RESET} ${col}${bar}${RESET} ${BOLD}${count}${RESET} req  ${DIM}(${pct}%)${RESET}`);
  });

  console.log('');
  console.log(`  ${'─'.repeat(52)}`);
  console.log(`  ${DIM}Total:${RESET}  ${BOLD}${results.length}${RESET} requests  │  ${GREEN}${totalOk} OK${RESET}  │  ${errors > 0 ? RED : DIM}${errors} errors${RESET}`);
  console.log(`  ${DIM}Time:${RESET}   ${BOLD}${totalMs}ms${RESET} total  │  avg ${BOLD}${avgMs}ms${RESET}/request`);
  console.log(`  ${DIM}Instances hit: ${BOLD}${instances.length} / 4${RESET}`);
  console.log('');

  if (instances.length >= 3) {
    console.log(`  ${GREEN}${BOLD}✔ Load balancing is working — traffic distributed across ${instances.length} instances!${RESET}`);
  } else if (instances.length === 2) {
    console.log(`  ${YELLOW}${BOLD}⚠ Only ${instances.length} instances hit — try sending more requests.${RESET}`);
  } else {
    console.log(`  ${RED}${BOLD}✗ All traffic went to 1 instance — check NGINX config.${RESET}`);
  }
  console.log('');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  printHeader();

  const results   = [];
  const startTime = Date.now();
  let reqNum      = 1;

  while (reqNum <= TOTAL_REQUESTS) {
    // Fire CONCURRENCY requests at once
    const batch = [];
    for (let i = 0; i < CONCURRENCY && reqNum <= TOTAL_REQUESTS; i++, reqNum++) {
      batch.push(fetchInstance(reqNum));
    }
    const batchResults = await Promise.all(batch);
    batchResults
      .sort((a, b) => a.reqNum - b.reqNum)
      .forEach(r => { printRow(r); results.push(r); });
  }

  printSummary(results, Date.now() - startTime);
}

main().catch(err => {
  console.error(`${RED}Fatal: ${err.message}${RESET}`);
  process.exit(1);
});
