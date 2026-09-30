import { fetchNdmaAlerts, parseCapAlert, SACHET_SEVERITY_LEVELS } from '../frontend/src/services/ndmaAlertService.js';
import { fetchIncoisBulletins } from '../frontend/src/services/incoisService.js';
import { getElevation } from '../frontend/src/services/terrainService.js';
import { evaluateWaterExposure, EXPOSURE_LEVELS } from '../frontend/src/services/waterExposureService.js';
import { calculateRoute } from '../frontend/src/services/routingService.js';
import { fetchNearbyFacilities } from '../frontend/src/services/nearbyServicesService.js';
import { getMosdacProducts, MOSDAC_ADDITIONAL_PRODUCTS } from '../frontend/src/services/mosdacProductService.js';

async function runAllTests() {
  console.log('====================================================');
  console.log('TESTING ALL NEW DRISHTI DISASTER SERVICE ADAPTERS');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, name) {
    total++;
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`);
    }
  }

  // 1. NDMA Alert Service
  console.log('--- 1. NDMA SACHET ALERT SERVICE ---');
  const ndma = await fetchNdmaAlerts();
  assert(ndma.source.includes('NDMA SACHET'), 'NDMA source name is correct');
  assert(ndma.liveStatus === 'SOURCE_UNAVAILABLE' || ndma.liveStatus === 'LIVE', 'NDMA liveStatus is valid');
  assert(Array.isArray(ndma.alerts), 'NDMA alerts array returned');
  assert(ndma.provenance.includes('NDMA SACHET'), 'NDMA provenance badge text correct');
  assert(SACHET_SEVERITY_LEVELS.EXTREME.badgeLabel === 'RED WARNING', 'SACHET severity color not reinterpreted');

  // Test parser
  const sampleCap = parseCapAlert({
    identifier: 'TEST-001',
    headline: 'High Wind Warning',
    severity: 'Severe',
    areaDesc: 'Odisha Coastal Belt'
  });
  assert(sampleCap.severityMeta.badgeLabel === 'ORANGE ALERT', 'CAP parser preserves official orange alert');
  assert(sampleCap.provenance.includes('NDMA SACHET'), 'Parsed CAP item has explicit provenance');

  // 2. INCOIS Service
  console.log('\n--- 2. INCOIS SERVICE ---');
  const incois = await fetchIncoisBulletins();
  assert(incois.source.includes('INCOIS'), 'INCOIS source name is correct');
  assert(incois.liveStatus === 'SOURCE_UNAVAILABLE' || incois.liveStatus === 'LIVE', 'INCOIS liveStatus is valid');
  assert(Array.isArray(incois.bulletins), 'INCOIS bulletins array returned');
  assert(incois.provenance.includes('INCOIS'), 'INCOIS provenance badge text correct');

  // 3. Terrain Service (Open-Meteo DEM)
  console.log('\n--- 3. TERRAIN / ELEVATION SERVICE ---');
  const elevation = await getElevation(28.6139, 77.2090);
  assert(elevation.elevationMeters != null, `Elevation returned: ${elevation.elevationMeters}m`);
  assert(elevation.provenance.includes('ELEVATION DATA SOURCE'), 'Elevation provenance correct');

  // 4. Water Exposure Service
  console.log('\n--- 4. WATER EXPOSURE SERVICE ---');
  const inlandExp = await evaluateWaterExposure({ lat: 28.6139, lon: 77.2090, name: 'Delhi Hospital' });
  assert(['LOW', 'MODERATE', 'HIGH', 'UNKNOWN'].includes(inlandExp.level), `Inland exposure valid level: ${inlandExp.level}`);
  assert(!inlandExp.badgeText.includes('SAFE'), 'Strict rule: NEVER calls a facility SAFE');

  const cycloneExp = await evaluateWaterExposure(
    { lat: 21.8, lon: 88.2, name: 'Sunderbans Health Post' },
    { operatingMode: 'DISASTER', currentScenario: { id: 'remal' } }
  );
  assert(cycloneExp.level === 'HIGH', 'Facility in Remal inundation arc correctly classified as HIGH');
  assert(cycloneExp.badgeText === 'WATER EXPOSURE: HIGH', 'Water exposure badge text exact');
  assert(cycloneExp.provenance.includes('CYCLONE REMAL'), 'Disaster mode inundation provenance exact');

  // Test missing coordinates fallback
  const unknownExp = await evaluateWaterExposure({ lat: null, lon: null });
  assert(unknownExp.level === 'UNKNOWN', 'Missing coords fallback to UNKNOWN');
  assert(unknownExp.badgeText === 'WATER EXPOSURE: UNKNOWN', 'Exact badge text WATER EXPOSURE: UNKNOWN');

  // 5. Routing Service (OSRM)
  console.log('\n--- 5. ROUTING SERVICE (OSRM) ---');
  const route = await calculateRoute(
    { lat: 28.6139, lon: 77.2090 },
    { lat: 28.6250, lon: 77.2150, name: 'Target Center' }
  );
  assert(route.success === true, 'Route calculation succeeded');
  assert(route.distanceKm > 0, `Route distance: ${route.distanceKm} km (${route.distanceFormatted})`);
  assert(route.durationMinutes > 0, `Route ETA: ${route.durationFormatted}`);
  assert(Array.isArray(route.coordinates) && route.coordinates.length > 0, `Route Leaflet coordinates count: ${route.coordinates.length}`);
  assert(route.provenance.includes('OSRM') || route.provenance.includes('DERIVED'), 'Route provenance correct');

  // 6. Nearby Response Services (OpenStreetMap / Overpass)
  console.log('\n--- 6. NEARBY RESPONSE SERVICES (OPENSTREETMAP) ---');
  const nearby = await fetchNearbyFacilities({
    latitude: 28.6139,
    longitude: 77.2090,
    radiusMeters: 3000
  });
  assert(nearby.status === 'SUCCESS' || nearby.status === 'SOURCE_UNAVAILABLE', `Nearby query status: ${nearby.status}`);
  if (nearby.status === 'SUCCESS') {
    assert(nearby.facilities.length > 0, `Real facilities found: ${nearby.facilities.length}`);
    const first = nearby.facilities[0];
    assert(first.name && first.name.length > 0, `First facility: ${first.name}`);
    assert(first.category && ['HOSPITAL', 'SHELTER', 'FIRE', 'POLICE', 'EMERGENCY'].includes(first.category), `Category: ${first.category}`);
    assert(first.distanceKm >= 0, `Distance: ${first.distanceFormatted}`);
    assert(first.waterExposure && !first.waterExposure.badgeText.includes('SAFE'), 'Water exposure attached and strictly NEVER SAFE');
    assert(first.source === 'OpenStreetMap', 'Source is OpenStreetMap');
    assert(first.provenance === 'OPENSTREETMAP INFRASTRUCTURE', 'Provenance is OPENSTREETMAP INFRASTRUCTURE');
  }

  // 7. MOSDAC Products Service
  console.log('\n--- 7. MOSDAC ADDITIONAL PRODUCTS ---');
  const mosdacProds = getMosdacProducts();
  assert(Array.isArray(mosdacProds) && mosdacProds.length >= 5, `MOSDAC products catalog count: ${mosdacProds.length}`);
  const qpe = mosdacProds.find(p => p.id === 'QPE_RAINFALL');
  assert(qpe && qpe.parameter.includes('Rainfall'), 'QPE / Rainfall product present');
  const amv = mosdacProds.find(p => p.id === 'AMV_WINDS');
  assert(amv && amv.parameter.includes('Wind'), 'AMV atmospheric motion winds present');
  const sst = mosdacProds.find(p => p.id === 'SST_OCEAN');
  assert(sst && sst.parameter.includes('Sea Surface Temperature'), 'SST ocean product present');

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed}/${total} ASSERTIONS PASSED (${Math.round((passed/total)*100)}%)`);
  console.log('====================================================');
}

runAllTests().catch(console.error);
