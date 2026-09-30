import https from 'https';

// Test Overpass with proper POST and GET
async function testOverpass() {
  console.log('--- Testing Overpass API ---');
  const query = `[out:json][timeout:15];
(
  node["amenity"="hospital"](around:3000,28.6139,77.2090);
  node["amenity"="police"](around:3000,28.6139,77.2090);
  node["amenity"="fire_station"](around:3000,28.6139,77.2090);
);
out body 10;
>;
out skel qt;`;

  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];

  for (const ep of endpoints) {
    try {
      const url = new URL(ep);
      const postData = 'data=' + encodeURIComponent(query);
      const res = await new Promise((resolve, reject) => {
        const req = https.request(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData),
            'User-Agent': 'DRISHTI-Disaster-System/1.0 (https://github.com/drishti)',
            'Origin': 'http://localhost:5173'
          },
          timeout: 10000
        }, (r) => {
          let data = '';
          r.on('data', chunk => data += chunk);
          r.on('end', () => resolve({
            status: r.statusCode,
            headers: r.headers,
            body: data
          }));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        req.write(postData);
        req.end();
      });

      console.log(`Endpoint ${ep}: Status ${res.status}`);
      console.log(`CORS: ${res.headers['access-control-allow-origin']}`);
      if (res.status === 200) {
        const parsed = JSON.parse(res.body);
        console.log(`Elements returned: ${parsed.elements ? parsed.elements.length : 0}`);
        if (parsed.elements && parsed.elements.length > 0) {
          console.log('Sample element:', JSON.stringify(parsed.elements[0].tags));
        }
      }
    } catch (e) {
      console.log(`Endpoint ${ep} failed:`, e.message);
    }
  }
}

// Test Open-Meteo Elevation with Origin
async function testElevation() {
  console.log('\n--- Testing Open-Meteo Elevation ---');
  try {
    const url = 'https://api.open-meteo.com/v1/elevation?latitude=28.6139&longitude=77.2090';
    const res = await new Promise((resolve, reject) => {
      const req = https.request(url, {
        method: 'GET',
        headers: {
          'Origin': 'http://localhost:5173',
          'User-Agent': 'DRISHTI/1.0'
        }
      }, (r) => {
        let data = '';
        r.on('data', chunk => data += chunk);
        r.on('end', () => resolve({
          status: r.statusCode,
          headers: r.headers,
          body: data
        }));
      });
      req.on('error', reject);
      req.end();
    });
    console.log(`Status: ${res.status}, CORS: ${res.headers['access-control-allow-origin']}`);
    console.log(`Body: ${res.body}`);
  } catch (e) {
    console.log('Elevation failed:', e.message);
  }
}

// Inspect Sachet Next.js build manifests or endpoints
async function inspectSachet() {
  console.log('\n--- Inspecting NDMA Sachet ---');
  try {
    const res = await new Promise((resolve, reject) => {
      https.get('https://sachet.ndma.gov.in/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }, (r) => {
        let data = '';
        r.on('data', chunk => data += chunk);
        r.on('end', () => resolve({
          status: r.statusCode,
          headers: r.headers,
          body: data
        }));
      }).on('error', reject);
    });

    console.log(`Sachet Home status: ${res.status}`);
    console.log(`Sachet CORS: ${res.headers['access-control-allow-origin'] || 'NONE'}`);
    
    // Look for script tags, API routes, or data paths
    const scripts = [...res.body.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m => m[1]);
    console.log(`Found ${scripts.length} script tags:`, scripts.slice(0, 5));

    // Look for API endpoints in HTML
    const apiMatches = [...res.body.matchAll(/(?:api|\/cap|\/feed|\/alert)[^"'\s<>]+/gi)].map(m => m[0]);
    console.log('API-like strings in HTML:', [...new Set(apiMatches)].slice(0, 10));
  } catch (e) {
    console.log('Sachet inspect failed:', e.message);
  }
}

async function run() {
  await testOverpass();
  await testElevation();
  await inspectSachet();
}

run();
