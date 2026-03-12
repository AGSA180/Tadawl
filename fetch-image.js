import https from 'https';

function fetchUrl(url) {
  https.get(url, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      console.log('Redirecting to:', res.headers.location);
      fetchUrl(res.headers.location);
      return;
    }
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      const match = data.match(/<meta property="og:image" content="([^"]+)"/i);
      if (match) {
        console.log('og:image:', match[1]);
      } else {
        const imgMatch = data.match(/<img[^>]+src="([^"]+)"/i);
        console.log('first img:', imgMatch ? imgMatch[1] : 'none');
      }
    });
  }).on('error', (err) => {
    console.log("Error: " + err.message);
  });
}

fetchUrl('https://sl.bing.net/b2IL6TzPQg8');
