const https = require('https');

const options = {
  hostname: 'asq-asset-api-ckdtfzgqdggjcedv.southindia-01.azurewebsites.net',
  port: 443,
  path: '/api/dashboard',
  method: 'GET',
  headers: {
    'Accept': 'application/json, text/plain, */*',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyIiwiZW1haWwiOiJzbnRoLmFtbXVAZ21haWwuY29tIiwidGVuYW50SWQiOm51bGwsInJvbGUiOiJUZW5hbnQgQWRtaW4iLCJpYXQiOjE3ODIzMzI1MzMsImV4cCI6MTc4MjQxODkzM30.hK0NC37UTNMQtAUepAQ_AGIol4dMVCkF7ThvKB9Dyc0',
    'Origin': 'https://assetmgmt.asquaretech.in',
    'User-Agent': 'Mozilla/5.0'
  }
};

const req = https.request(options, res => {
  let data = '';
  console.log('Status Code:', res.statusCode);

  res.on('data', chunk => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      console.log('Response:', JSON.parse(data));
    } catch (e) {
      console.log('Raw Response:', data);
    }
  });
});

req.on('error', error => {
  console.error('Error:', error);
});

req.end();
