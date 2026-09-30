import https from 'https';

const mirrors = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter'
];

async function testMirrors() {
  const query = `[out:json][timeout:15];node["amenity"="hospital"](around:2000,28.6139,77.2090);out 5;`;
  const postData = 'data=' + encodeURIComponent(query);

  for (const mirror of mirrors) {
    console.log(`Testing ${mirror}...`);
    try {
      const url = new URL(mirror);
      const start = Date.now();
      const res = await new Promise((resolve, reject) => {
        const req = https.request(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData),
            'User-Agent': 'DRISHTI-Disaster/1.0',
            'Origin': 'http://localhost:5173'
          },
          timeout: 15000
        }, (r) => {
          let data = '';
          r.on('data', c => data += c);
          r.on('end', () => resolve({ status: r.statusCode, data, elapsed: Date.now() - start }));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        req.write(postData);
        req.end();
      });

      console.log(`Mirror: ${mirror} => Status: ${res.status}, Time: ${res.elapsed}ms`);
      if (res.status === 200) {
        const json = JSON.parse(res.data);
        console.log(`Success! Elements: ${json.elements.length}`);
        if (json.elements[0]) {
          console.log(`First element: ${json.elements[0].tags?.name || 'Unnamed'} (lat ${json.elements[0].lat}, lon ${json.elements[0].lon})`);
        }
      }
    } catch (e) {
      console.log(`Mirror ${mirror} error: ${e.message}`);
    }
  }
}

testMirrors();
