const http = require('http');
const https = require('https');
const parse = require('csv-parse');
const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const content = {
  metadata: {
    title: "Brother's Paired"
  }
};

setInterval(() => {
  getData()
    .then(parseData)
    .then(getImageUrls)
    .then((data) => {
      content.data = mapData(data);
    })
}, 3000);

getData()
  .then(parseData)
  .then(getImageUrls)
  .then((data) => {
    content.data = mapData(data);
    return createServer((req, res) => {
      console.log(req.url);
      res.setHeader('content-type', 'text/html;charset=uts-8');
      fs.readFile(path.join(__dirname,'index.handlebars'), (err, file) => {
        const template = Handlebars.compile(file.toString());
        res.end(template(content));
      });
    });
  })
  .then(() => {
    console.log('Server is listening');
  });

function getRedirect(id) {
  return new Promise((resolve, reject) => {
    https.get(`https://drive.google.com/thumbnail?id=${id}`, (res) => {
      const src = res.headers.location.slice(0, -5);
      res.on('readable', res.read);
      res.on('end', () => resolve(src))
    });
  });
}

function getImageUrls(data) {
  const listOfImageIds = data.map((entry) => {
    return Promise.all(entry[3].split(',').map((id) => getRedirect(id)));
  });
  return Promise.all(listOfImageIds).then((images) => {
    images.forEach((image, index) => {
      data[index][3] = image;
    });
    return data;
  });
}

function getData() {
  return new Promise((resolve, reject) => {
    https.get('https://docs.google.com/spreadsheets/d/13QMtkW79KuynkVpSdGXoeSE2iMv48PHwGZFdF5oApFY/export?format=csv&id=13QMtkW79KuynkVpSdGXoeSE2iMv48PHwGZFdF5oApFY&gid=0', (res) => {
      let csvBuffer = [];
      res
      .on('data', (data) => csvBuffer.push(data))
      .on('end', () => resolve(csvBuffer.join('').toString()))
    });
  });
}

function parseData(data) {
  return new Promise((resolve, reject) => {
    parse(data, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

function createServer(requestHandler) {
  return new Promise((resolve, reject) => {
    http.createServer(requestHandler)
      .on('clientError', (err, socket) => {
        socket.end();
        reject(err);
      })
      .listen(1337, resolve);
  });
}

function mapData(data) {
  return data.map((entry) => {
    return {
      timestamp: entry[0],
      title: entry[1],
      body: entry[2],
      images: entry[3]
    };
  });
}
