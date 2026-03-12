const http = require('http');
http.get('http://localhost:3001/output.html', (resp) => {
  let data = '';
  resp.on('data', (c) => data += c);
  resp.on('end', () => console.log(data.slice(0, 500)));
});
