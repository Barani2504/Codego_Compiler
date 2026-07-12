const http = require('http');

const packages = [
  { language: 'python',  version: '3.10.0'  },
  { language: 'node',    version: '18.15.0' },  // 'node', not 'javascript'
  { language: 'java',    version: '15.0.2'  },
  { language: 'gcc',     version: '10.2.0'  },  // 'gcc' handles both C and C++
  { language: 'rscript', version: '4.1.1'   },  // 'rscript', not 'r'
];

function installPackage(pkg) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(pkg);
    const options = {
      hostname: 'localhost',
      port: 2000,
      path: '/api/v2/packages',
      method: 'POST',
      timeout: 300000, // 5 minutes timeout for large downloads
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    console.log(`\nInstalling ${pkg.language} ${pkg.version}...`);
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.language) {
            console.log(`  ✓ Installed: ${json.language} ${json.version}`);
          } else {
            console.log(`  Response: ${data}`);
          }
          resolve(json);
        } catch {
          console.log(`  Response: ${data}`);
          resolve(data);
        }
      });
    });

    req.on('error', (e) => {
      console.error(`  ✗ Error: ${e.message}`);
      reject(e);
    });

    req.write(body);
    req.end();
  });
}

async function main() {
  // First check Piston is reachable
  console.log('Checking Piston is running...');
  try {
    await new Promise((resolve, reject) => {
      http.get('http://localhost:2000/api/v2/runtimes', (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          console.log('✓ Piston is reachable!\n');
          resolve();
        });
      }).on('error', reject);
    });
  } catch (e) {
    console.error('✗ Piston not reachable on localhost:2000 — is Docker running?');
    process.exit(1);
  }

  for (const pkg of packages) {
    try {
      await installPackage(pkg);
      // Give Piston a moment between installs
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.error(`Failed to install ${pkg.language}: ${e.message}`);
    }
  }

  console.log('\n✓ All done! Verifying installed runtimes...');
  http.get('http://localhost:2000/api/v2/runtimes', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const runtimes = JSON.parse(data);
      console.log(`  ${runtimes.length} runtime(s) installed:`);
      runtimes.forEach(r => console.log(`    • ${r.language} ${r.version}`));
    });
  });
}

main();
