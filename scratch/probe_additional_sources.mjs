import https from 'https';
import http from 'http';

const candidateEndpoints = [
  // A. NDMA SACHET
  { name: 'NDMA SACHET Home', url: 'https://sachet.ndma.gov.in/' },
  { name: 'NDMA SACHET CAP Feed', url: 'https://sachet.ndma.gov.in/cap_feed' },
  { name: 'NDMA SACHET RSS', url: 'https://sachet.ndma.gov.in/rss' },
  { name: 'NDMA SACHET API Current Alerts', url: 'https://sachet.ndma.gov.in/api/alerts' },
  { name: 'NDMA SACHET Public Alerts', url: 'https://sachet.ndma.gov.in/feed' },

  // B. CWC / India-WRIS / Flood
  { name: 'CWC Flood Forecast Portal', url: 'https://ffs.india-water.gov.in/' },
  { name: 'CWC FFS API stations', url: 'https://ffs.india-water.gov.in/ffs/api/stations' },
  { name: 'India WRIS Home', url: 'https://indiawris.gov.in/wris/' },
  { name: 'India WRIS API river stations', url: 'https://indiawris.gov.in/api/v1/river' },

  // C. OpenStreetMap / Overpass
  { 
    name: 'Overpass API Interpreter (Main)', 
    url: 'https://overpass-api.de/api/interpreter?data=[out:json][timeout:10];node(around:5000,28.6139,77.2090)["amenity"="hospital"];out%20body%205;' 
  },
  { 
    name: 'Overpass API Kumi Mirror', 
    url: 'https://overpass.kumi.systems/api/interpreter?data=[out:json][timeout:10];node(around:5000,28.6139,77.2090)["amenity"="hospital"];out%20body%205;' 
  },

  // D. Routing (OSRM)
  { 
    name: 'OSRM Public Demo Driving', 
    url: 'https://router.project-osrm.org/route/v1/driving/77.2090,28.6139;77.2190,28.6239?overview=full&geometries=geojson' 
  },

  // E. INCOIS
  { name: 'INCOIS Home', url: 'https://incois.gov.in/' },
  { name: 'INCOIS Warnings RSS', url: 'https://incois.gov.in/portal/rss.jsp' },
  { name: 'INCOIS Ocean State Forecast', url: 'https://incois.gov.in/portal/osf/osf.jsp' },
  { name: 'INCOIS Tsunami Warning Feed', url: 'https://incois.gov.in/tsunami/rss.xml' },

  // F. MOSDAC / ISRO Additional Products
  { name: 'MOSDAC Home', url: 'https://mosdac.gov.in/' },
  { name: 'MOSDAC Live Server Products', url: 'https://mosdac.gov.in/live/' },
  { name: 'MOSDAC INSAT-3DS Catalog', url: 'https://mosdac.gov.in/data-access' },

  // G. Terrain / Elevation
  { 
    name: 'Open-Meteo Elevation API', 
    url: 'https://api.open-meteo.com/v1/elevation?latitude=28.6139&longitude=77.2090' 
  },
  { 
    name: 'Bhuvan Elevation WMS', 
    url: 'https://bhuvan-app1.nrsc.gov.in/bhuvan2d/bhuvan/bhuvan2d.php' 
  }
];

function probeUrl(target) {
  return new Promise((resolve) => {
    const urlObj = new URL(target.url);
    const client = urlObj.protocol === 'https:' ? https : http;
    const req = client.request(
      target.url,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DRISHTI/1.0',
          'Accept': '*/*'
        },
        timeout: 8000
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          if (rawData.length < 500) rawData += chunk;
        });
        res.on('end', () => {
          resolve({
            name: target.name,
            url: target.url,
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            cors: res.headers['access-control-allow-origin'] || 'NONE / NOT SET',
            contentType: res.headers['content-type'] || 'UNKNOWN',
            contentSnippet: rawData.slice(0, 150).replace(/\s+/g, ' '),
            error: null
          });
        });
      }
    );

    req.on('error', (err) => {
      resolve({
        name: target.name,
        url: target.url,
        statusCode: null,
        statusMessage: null,
        cors: 'ERROR',
        contentType: null,
        contentSnippet: null,
        error: err.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        name: target.name,
        url: target.url,
        statusCode: null,
        statusMessage: 'TIMEOUT',
        cors: 'TIMEOUT',
        contentType: null,
        contentSnippet: null,
        error: 'Request timed out after 8s'
      });
    });

    req.end();
  });
}

async function run() {
  console.log('Probing disaster data endpoints...');
  const results = [];
  for (const candidate of candidateEndpoints) {
    process.stdout.write(`Testing: ${candidate.name}... `);
    const res = await probeUrl(candidate);
    results.push(res);
    console.log(`[${res.statusCode || res.statusMessage || 'ERR'}] CORS: ${res.cors}`);
  }

  console.log('\n--- DETAILED SUMMARY ---');
  console.log(JSON.stringify(results, null, 2));
}

run();
