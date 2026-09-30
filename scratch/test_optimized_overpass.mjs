import https from 'https';

async function testOptimizedOverpass() {
  const lat = 28.6139;
  const lon = 77.2090;
  const radius = 3000;

  // Ultra-lightweight Overpass QL without recursion
  const query = `[out:json][timeout:8];
(
  node["amenity"~"^(hospital|clinic|pharmacy|fire_station|police|shelter)$"](around:${radius},${lat},${lon});
);
out 20;`;

  const servers = [
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter'
  ];

  for (const s of servers) {
    try {
      console.log(`Querying ${s}...`);
      const postData = 'data=' + encodeURIComponent(query);
      const url = new URL(s);
      const res = await new Promise((resolve, reject) => {
        const req = https.request(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData),
            'User-Agent': 'DRISHTI-Disaster-Management/1.0',
            'Origin': 'http://localhost:5173'
          },
          timeout: 7000
        }, (r) => {
          let data = '';
          r.on('data', chunk => data += chunk);
          r.on('end', () => resolve({ status: r.statusCode, data }));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        req.write(postData);
        req.end();
      });

      console.log(`Server ${s} Status:`, res.status);
      if (res.status === 200) {
        const json = JSON.parse(res.data);
        console.log(`Success! Elements count: ${json.elements.length}`);
        json.elements.slice(0, 5).forEach(e => {
          console.log(`- [${e.tags?.amenity}] ${e.tags?.name || 'Unnamed'} (lat: ${e.lat}, lon: ${e.lon})`);
        });
        break; // found working
      }
    } catch (e) {
      console.log(`Server ${s} failed:`, e.message);
    }
  }
}

testOptimizedOverpass();
