import http from 'http';

function checkFrontend() {
  http.get('http://localhost:5173/', (res) => {
    console.log('Frontend Dev Server Status:', res.statusCode);
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('HTML Length:', data.length);
      console.log('Contains DRISHTI title:', data.includes('DRISHTI'));
      console.log('Title tag snippet:', data.match(/<title>.*?<\/title>/)?.[0]);
    });
  }).on('error', (err) => {
    console.error('Frontend Dev Server Error:', err.message);
  });
}

checkFrontend();
