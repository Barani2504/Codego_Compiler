(async () => {
  // Simulate what execution.service.ts now does for JS questions
  const code = `function is_multiply_prime(a) {
  const primes = [];
  for (let i = 2; i < a; i++) {
    let isPrime = true;
    for (let j = 2; j < i; j++) if (i % j === 0) { isPrime = false; break; }
    if (isPrime) primes.push(i);
  }
  for (let i = 0; i < primes.length; i++)
    for (let j = i; j < primes.length; j++)
      for (let k = j; k < primes.length; k++)
        if (primes[i] * primes[j] * primes[k] === a) return true;
  return false;
}`;

  const tests = [
    { input: JSON.stringify([30]), expectedOutput: JSON.stringify(true) },
    { input: JSON.stringify([15]), expectedOutput: JSON.stringify(true) },
    { input: JSON.stringify([3]),  expectedOutput: JSON.stringify(false) },
  ];

  for (const tc of tests) {
    const parsedArgs = JSON.parse(tc.input);
    const fnMatch = code.match(/^function\s+(\w+)\s*\(/m);
    const fnName = fnMatch[1];
    const finalCode = `${code}\n\nconst __args = ${JSON.stringify(parsedArgs)};\nconst __result = ${fnName}(...__args);\nprocess.stdout.write(JSON.stringify(__result) + '\\n');`;

    const res = await fetch('http://127.0.0.1:2000/api/v2/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: 'javascript',
        version: '18.15.0',
        files: [{ name: 'main.js', content: finalCode }],
        stdin: '',
        run_timeout: 10000,
      })
    });
    const result = await res.json();
    const actual = (result.run.stdout || '').trim();
    const passed = actual === tc.expectedOutput;
    console.log(`input=${tc.input} expected=${tc.expectedOutput} actual=${actual} => ${passed ? '✅ PASS' : '❌ FAIL'}`);
  }
})();
