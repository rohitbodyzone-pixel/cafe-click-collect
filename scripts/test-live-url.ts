import https from 'https';

const url = 'https://rohitbodyzone-pixel.github.io/cafe-click-collect/';

async function checkUrl() {
  console.log(`Testing Live URL: ${url}`);
  try {
    const res = await fetch(url, { redirect: 'follow' });
    console.log(`HTTP Status: ${res.status} ${res.statusText}`);
    console.log(`Content-Type: ${res.headers.get('content-type')}`);
    const text = await res.text();
    console.log(`HTML Payload Length: ${text.length} bytes`);
    console.log(`Contains Root Element: ${text.includes('id="root"')}`);
    if (res.status === 200 && text.includes('id="root"')) {
      console.log(`✓ PRODUCTION URL IS REACHABLE OVER HTTPS WITH VALID SSL!`);
    } else {
      console.error(`❌ Unexpected response content or status code.`);
    }
  } catch (err: any) {
    console.error(`❌ Connection failed:`, err.message);
  }
}

checkUrl();
