import https from 'https';

async function testOverpassFacilities() {
  const lat = 28.6139; // New Delhi sample
  const lon = 77.2090;
  const radius = 5000;

  const query = `[out:json][timeout:15];
(
  node["amenity"="hospital"](around:${radius},${lat},${lon});
  node["amenity"="clinic"](around:${radius},${lat},${lon});
  node["amenity"="fire_station"](around:${radius},${lat},${lon});
  node["amenity"="police"](around:${radius},${lat},${lon});
  node["amenity"="shelter"](around:${radius},${lat},${lon});
);
out body 30;
>;
out skel qt;`;

  const postData = 'data=' + encodeURIComponent(query);
  const url = new URL('https://overpass-api.de/api/interpreter');

  const res = await new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'DRISHTI-Disaster-Management-System/1.0',
        'Origin': 'http://localhost:5173'
      },
      timeout: 10000
    }, (r) => {
      let data = '';
      r.on('data', chunk => data += chunk);
      r.on('end', () => resolve({ status: r.statusCode, data }));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });

  console.log('Status:', res.status);
  const json = JSON.parse(res.data);
  console.log('Total elements:', json.elements.length);
  const categories = {};
  json.elements.forEach(el => {
    const cat = el.tags?.amenity || 'other';
    categories[cat] = (categories[cat] || 0) + 1;
  });
  console.log('Categories breakdown:', categories);
  console.log('Sample hospital:', json.elements.find(e => e.tags?.amenity === 'hospital'));
}

testOverpassFacilities().catch(console.error);
