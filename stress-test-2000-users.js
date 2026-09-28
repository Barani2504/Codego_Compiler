#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║        CodeGoAI — 2,000 Simultaneous Users Stress Test       ║
 * ║  Validates NGINX least_conn load balancing, latency, and     ║
 * ║  instance distribution across 4 NestJS API nodes.            ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Usage:
 *   node stress-test-2000-users.js [TOTAL_USERS] [CONCURRENCY] [PORT] [HOST]
 *
 * Examples:
 *   node stress-test-2000-users.js                   # 2000 users, 250 concurrent
 *   node stress-test-2000-users.js 2000 500          # 2000 users, 500 concurrent
 *   node stress-test-2000-users.js 2000 2000         # 2000 users fully simultaneous
 */

const http = require('http');

// ── Configuration ─────────────────────────────────────────────────────────────
const TOTAL_USERS = parseInt(process.argv[2], 10) || 2000;
const CONCURRENCY = parseInt(process.argv[3], 10) || 250;
const PORT        = parseInt(process.argv[4], 10) || 80;
const HOST        = process.argv[5]               || 'localhost';
const ENDPOINT    = '/api/instance';
const TIMEOUT_MS  = process.argv[6] ? parseInt(process.argv[6], 10) * 1000 : 30000;

// High-capacity HTTP agent configured for 2,000 concurrent sockets
const agent = new http.Agent({
  keepAlive: true,
  maxSockets: Math.max(CONCURRENCY, 2000),
  maxFreeSockets: 512,
  timeout: TIMEOUT_MS,
});

// ── ANSI Formatting ───────────────────────────────────────────────────────────
const RESET   = '\x1b[0m';
const BOLD    = '\x1b[1m';
const DIM     = '\x1b[2m';
const GREEN   = '\x1b[32m';
const CYAN    = '\x1b[36m';
const YELLOW  = '\x1b[33m';
const RED     = '\x1b[31m';
const MAGENTA = '\x1b[35m';
const BLUE    = '\x1b[34m';
const WHITE   = '\x1b[97m';

const COLORS = [CYAN, GREEN, YELLOW, MAGENTA, BLUE, WHITE];
const instanceColors = {};
let colorIndex = 0;

function getColor(instance) {
  if (!instanceColors[instance]) {
    instanceColors[instance] = COLORS[colorIndex++ % COLORS.length];
  }
  return instanceColors[instance];
}

// ── Percentile Calculation ────────────────────────────────────────────────────
function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const index = Math.ceil((p / 100) * arr.length) - 1;
  return arr[Math.max(0, Math.min(index, arr.length - 1))];
}

// ── Execute Single User Request ───────────────────────────────────────────────
function sendUserRequest(userId) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const req = http.request(
      {
        host: HOST,
        port: PORT,
        path: ENDPOINT,
        method: 'GET',
        agent,
        headers: {
          'X-User-Id': `student-${userId}`,
          'Accept': 'application/json',
          'Connection': 'keep-alive',
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          const duration = Date.now() - startTime;
          try {
            const data = JSON.parse(body);
            if (res.statusCode === 200 && data.instance) {
              resolve({
                ok: true,
                statusCode: res.statusCode,
                instance: data.instance,
                pid: data.pid,
                ms: duration,
                userId,
              });
            } else {
              resolve({
                ok: false,
                statusCode: res.statusCode,
                instance: data.instance || `HTTP_${res.statusCode}`,
                error: data.message || `HTTP ${res.statusCode}`,
                ms: duration,
                userId,
              });
            }
          } catch (e) {
            resolve({
              ok: false,
              statusCode: res.statusCode,
              instance: 'PARSE_ERROR',
              error: 'Invalid JSON',
              ms: duration,
              userId,
            });
          }
        });
      },
    );

    req.on('error', (err) => {
      resolve({
        ok: false,
        statusCode: 0,
        instance: 'CONN_ERR',
        error: err.message,
        ms: Date.now() - startTime,
        userId,
      });
    });

    req.setTimeout(TIMEOUT_MS, () => {
      req.destroy();
      resolve({
        ok: false,
        statusCode: 408,
        instance: 'TIMEOUT',
        error: `Timed out after ${TIMEOUT_MS}ms`,
        ms: TIMEOUT_MS,
        userId,
      });
    });

    req.end();
  });
}

// ── Main Load Test Runner ─────────────────────────────────────────────────────
async function run() {
  console.log('');
  console.log(`${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${CYAN}║${WHITE}     CodeGoAI — 2,000 Simultaneous Users Load Balancer Test       ${CYAN}║${RESET}`);
  console.log(`${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════════╝${RESET}`);
  console.log(`  ${DIM}Target Endpoint :${RESET} ${BOLD}http://${HOST}:${PORT}${ENDPOINT}${RESET}`);
  console.log(`  ${DIM}Total Users     :${RESET} ${BOLD}${TOTAL_USERS.toLocaleString()}${RESET} simulated distinct students`);
  console.log(`  ${DIM}Concurrency     :${RESET} ${BOLD}${CONCURRENCY}${RESET} simultaneous in-flight connections`);
  console.log(`  ${DIM}Algorithm       :${RESET} ${BOLD}least_conn${RESET} (NGINX upstream across 4 API nodes)`);
  console.log(`  ${DIM}Timeout         :${RESET} ${TIMEOUT_MS / 1000}s per request`);
  console.log('');

  console.log(`${YELLOW}⚡ Initiating load test with ${TOTAL_USERS} requests...${RESET}`);

  const results = [];
  const startOverall = Date.now();
  let completed = 0;
  let inFlight = 0;
  let nextUserIndex = 1;

  // Live progress ticker
  const progressInterval = setInterval(() => {
    const elapsedSec = (Date.now() - startOverall) / 1000;
    const currentRps = elapsedSec > 0 ? (completed / elapsedSec).toFixed(1) : 0;
    const pct = Math.round((completed / TOTAL_USERS) * 100);
    const bar = '█'.repeat(Math.round(pct / 4)).padEnd(25);
    process.stdout.write(`\r  ${CYAN}[${bar}] ${pct}%${RESET} | Completed: ${completed}/${TOTAL_USERS} | In-Flight: ${inFlight} | RPS: ${currentRps}  `);
  }, 150);

  // Concurrency pool worker
  await new Promise((resolve) => {
    function launchNext() {
      if (completed >= TOTAL_USERS) {
        clearInterval(progressInterval);
        process.stdout.write('\r' + ' '.repeat(90) + '\r');
        return resolve();
      }

      while (inFlight < CONCURRENCY && nextUserIndex <= TOTAL_USERS) {
        const uId = nextUserIndex++;
        inFlight++;
        sendUserRequest(uId).then((res) => {
          results.push(res);
          inFlight--;
          completed++;
          launchNext();
        });
      }
    }

    launchNext();
  });

  const totalDurationMs = Date.now() - startOverall;
  const durationSec = totalDurationMs / 1000;
  const rps = (results.length / durationSec).toFixed(1);

  // ── Analyze Results ─────────────────────────────────────────────────────────
  const instanceCounts = {};
  const statusCodes = {};
  const latencies = [];
  let successful = 0;
  let failed = 0;

  for (const r of results) {
    statusCodes[r.statusCode] = (statusCodes[r.statusCode] || 0) + 1;
    latencies.push(r.ms);
    if (r.ok) {
      successful++;
      instanceCounts[r.instance] = (instanceCounts[r.instance] || 0) + 1;
    } else {
      failed++;
    }
  }

  latencies.sort((a, b) => a - b);
  const minLatency = latencies[0] || 0;
  const maxLatency = latencies[latencies.length - 1] || 0;
  const sumLatency = latencies.reduce((sum, v) => sum + v, 0);
  const avgLatency = (sumLatency / latencies.length).toFixed(1);
  const p50 = percentile(latencies, 50);
  const p90 = percentile(latencies, 90);
  const p95 = percentile(latencies, 95);
  const p99 = percentile(latencies, 99);

  // ── Print Report ────────────────────────────────────────────────────────────
  console.log(`${BOLD}${WHITE}══════════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}${GREEN}✔ Load Test Finished in ${durationSec.toFixed(2)}s (${rps} req/sec)${RESET}`);
  console.log(`${BOLD}${WHITE}══════════════════════════════════════════════════════════════════${RESET}`);
  console.log('');

  console.log(`${BOLD}1. Traffic Distribution Across Clustered Instances:${RESET}`);
  const instances = Object.keys(instanceCounts).sort();
  const idealShare = successful > 0 ? successful / 4 : 0;
  let maxDeviation = 0;

  for (const inst of instances) {
    const count = instanceCounts[inst];
    const pct = successful > 0 ? ((count / successful) * 100).toFixed(1) : 0;
    const col = getColor(inst);
    const bar = '█'.repeat(Math.round(pct / 2.5)).padEnd(40);
    const deviation = idealShare > 0 ? Math.abs(((count - idealShare) / idealShare) * 100).toFixed(1) : 0;
    if (parseFloat(deviation) > maxDeviation) maxDeviation = parseFloat(deviation);

    console.log(`  ${col}${BOLD}${inst.padEnd(16)}${RESET} ${col}${bar}${RESET} ${BOLD}${String(count).padStart(5)}${RESET} req (${pct}%) [dev: ±${deviation}%]`);
  }

  console.log('');
  console.log(`${BOLD}2. Latency & Performance Breakdown:${RESET}`);
  console.log(`  ${DIM}Min Latency   :${RESET} ${minLatency} ms`);
  console.log(`  ${DIM}Avg Latency   :${RESET} ${avgLatency} ms`);
  console.log(`  ${DIM}Median (p50)  :${RESET} ${p50} ms`);
  console.log(`  ${DIM}90th % (p90)  :${RESET} ${p90} ms`);
  console.log(`  ${DIM}95th % (p95)  :${RESET} ${p95} ms`);
  console.log(`  ${DIM}99th % (p99)  :${RESET} ${p99} ms`);
  console.log(`  ${DIM}Max Latency   :${RESET} ${maxLatency} ms`);
  console.log('');

  console.log(`${BOLD}3. HTTP Status Codes:${RESET}`);
  for (const [code, count] of Object.entries(statusCodes)) {
    const col = code === '200' ? GREEN : (code === '429' ? YELLOW : RED);
    console.log(`  ${col}HTTP ${code}${RESET}: ${count} (${((count / results.length) * 100).toFixed(1)}%)`);
  }
  console.log('');

  console.log(`${BOLD}4. Final Load Balancing Verdict:${RESET}`);
  const successRate = ((successful / results.length) * 100).toFixed(1);

  if (successful === TOTAL_USERS && instances.length === 4 && maxDeviation <= 25) {
    console.log(`  ${GREEN}${BOLD}✔ EXCELLENT: 100% success rate (${successful}/${TOTAL_USERS})!${RESET}`);
    console.log(`  ${GREEN}All 4 backend instances shared the 2,000-user load evenly under least_conn (max deviation: ±${maxDeviation}%).${RESET}`);
  } else if (successful >= TOTAL_USERS * 0.95 && instances.length >= 3) {
    console.log(`  ${YELLOW}${BOLD}✔ PASSED: ${successRate}% success rate (${successful}/${TOTAL_USERS}) across ${instances.length} instances.${RESET}`);
  } else {
    console.log(`  ${RED}${BOLD}✗ FAILED: ${failed} requests failed. Success rate: ${successRate}%. Check logs.${RESET}`);
  }
  console.log(`${BOLD}${WHITE}══════════════════════════════════════════════════════════════════${RESET}`);
  console.log('');

  // Close agent sockets
  agent.destroy();
}

run().catch((err) => {
  console.error(`\n${RED}Fatal error during load test: ${err.message}${RESET}`);
  process.exit(1);
});
