import https from 'https';

async function testCapFeed() {
  console.log('--- Testing /CapFeed on NDMA Sachet ---');
  try {
    const res = await new Promise((resolve, reject) => {
      https.get('https://sachet.ndma.gov.in/CapFeed', {
        headers: {
          'Origin': 'http://localhost:5173',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DRISHTI/1.0'
        }
      }, (r) => {
        let data = '';
        r.on('data', chunk => { if (data.length < 2000) data += chunk; });
        r.on('end', () => resolve({
          status: r.statusCode,
          headers: r.headers,
          bodySnippet: data.slice(0, 300)
        }));
      }).on('error', reject);
    });

    console.log(`CapFeed status: ${res.status}`);
    console.log(`CapFeed CORS: ${res.headers['access-control-allow-origin'] || 'NONE / NOT SET'}`);
    console.log(`Content-Type: ${res.headers['content-type']}`);
    console.log(`Snippet: ${res.bodySnippet}`);
  } catch (e) {
    console.log('CapFeed error:', e.message);
  }
}

async function testIncoisDetails() {
  console.log('\n--- Testing INCOIS details ---');
  const urls = [
    'https://incois.gov.in/portal/datainfo/mb.jsp',
    'https://incois.gov.in/portal/osf/osf.jsp',
    'https://incois.gov.in/tsunami/bulletins.jsp',
    'https://incois.gov.in/site/index.jsp'
  ];
  for (const u of urls) {
    try {
      const res = await new Promise((resolve) => {
        https.get(u, {
          headers: { 'Origin': 'http://localhost:5173', 'User-Agent': 'DRISHTI/1.0' },
          timeout: 6000
        }, (r) => {
          resolve({ status: r.statusCode, cors: r.headers['access-control-allow-origin'] || 'NONE' });
        }).on('error', (err) => resolve({ status: 'ERR', error: err.message }));
      });
      console.log(`INCOIS ${u}: ${res.status}, CORS: ${res.cors}`);
    } catch (e) {
      console.log(`INCOIS ${u} err:`, e.message);
    }
  }
}

async function testCwcDetails() {
  console.log('\n--- Testing CWC / FFS details ---');
  const urls = [
    'https://ffs.india-water.gov.in/ffs/api/public/data',
    'https://ffs.india-water.gov.in/rest/api/station',
    'https://indiawris.gov.in/wris/'
  ];
  for (const u of urls) {
    try {
      const res = await new Promise((resolve) => {
        https.get(u, {
          headers: { 'Origin': 'http://localhost:5173', 'User-Agent': 'DRISHTI/1.0' },
          timeout: 6000
        }, (r) => {
          resolve({ status: r.statusCode, cors: r.headers['access-control-allow-origin'] || 'NONE' });
        }).on('error', (err) => resolve({ status: 'ERR', error: err.message }));
      });
      console.log(`CWC ${u}: ${res.status}, CORS: ${res.cors}`);
    } catch (e) {
      console.log(`CWC ${u} err:`, e.message);
    }
  }
}

async function run() {
  await testCapFeed();
  await testIncoisDetails();
  await testCwcDetails();
}

run();
