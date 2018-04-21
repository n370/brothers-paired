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

const handlers = {
  clientError (err, socket) {
    socket.end();
    reject(err);
  },
  request (req, res) {
    console.log(req.url);
    res.setHeader('content-type', 'text/html;charset=uts-8');
    fs.readFile(path.join(__dirname,'index.handlebars'), (err, data) => {
      const template = Handlebars.compile(data.toString());
      res.end(template(content));
    });
  }
};

setInterval(() => {
  getData()
    .then(parseData)
    .then((data) => {
      content.data = data;
    })
}, 1000);

getData()
  .then(parseData)
  .then((data) => {
    content.data = data;
    return createServer(handlers);
  })
  .then(() => {
    console.log('Server is listening');
  });


function getData() {
  return new Promise((resolve, reject) => {
    https.get('https://docs.google.com/spreadsheets/d/13QMtkW79KuynkVpSdGXoeSE2iMv48PHwGZFdF5oApFY/export?format=csv&id=13QMtkW79KuynkVpSdGXoeSE2iMv48PHwGZFdF5oApFY&gid=0', (res) => {
      let csvBuffer = [];
      res
        .on('end', () => resolve(csvBuffer.join('').toString()))
        .on('data', (data) => csvBuffer.push(data))
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

function createServer(handlers) {
  return new Promise((resolve, reject) => {
    http.createServer(handlers.request)
      .on('clientError', handlers.clientError)
      .listen(1337, resolve);
  });
}
