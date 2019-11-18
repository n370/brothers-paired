const http = require('http');
const https = require('https');
const parse = require('csv-parse');
const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const tableUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSQJo_XKznZYWQtlDE6iGr5r7QcIpgnhYcdt5llHHiYrVmQMyrsIqvO20MfaxkvPO08D0OYdybjshx4/pub?gid=0&single=true&output=csv';
const content = {
    metadata: {
        title: "Brother's Paired"
    }
};

Handlebars.registerHelper('date', function(timestamp) {
    return new Date(parseInt(timestamp)).toString();
});

setInterval(() => {
    getData()
        .then(parseData)
        .then(getImageUrls)
        .then((data) => {
            content.data = mapData(data);
        })
        .catch(console.error);
}, 3000);

getData()
    .then(parseData)
    .then(getImageUrls)
    .then((data) => {
        content.data = mapData(data);
        return createServer((req, res) => {
            console.log(req.url);
            res.setHeader('content-type', 'text/html;charset=uts-8');
            fs.readFile(path.join(__dirname, 'index.handlebars'), (err, file) => {
                if (err) { throw err; }
                const template = Handlebars.compile(file.toString());
                res.end(template(content));
            });
        });
    })
    .then(() => {
        console.log('Server is listening');
    })
    .catch(console.error);

function getRedirect(id) {
    return new Promise((resolve, reject) => {
        https.get(`https://drive.google.com/thumbnail?id=${id}`, (res) => {
            res.on('readable', res.read);
            if (res.headers.location) {
                const src = res.headers.location.slice(0, -5);
                res.on('end', () => resolve(src))
            } else {
                res.on('end', () => reject(null))
            }
        });
    });
}

function getImageUrls(data) {
    const listOfImageIds = data.map((entry) => {
        const redirectIdsList = entry[3]
            .split(',')
            .filter((id) => id.length > 0)
            .map((id) => getRedirect(id));
        return Promise.all(redirectIdsList);
    });

    return Promise.all(listOfImageIds).then((images) => {
        images.forEach((image, index) => {
            data[index][3] = image;
        });
        return data;
    })
}

function getData() {
    return new Promise((resolve, reject) => {
        https.get(tableUrl, (res) => {
            const csvBuffer = [];
            res
                .on('data', (data) => {
                    csvBuffer.push(data);
                })
                .on('end', () => {
                    resolve(csvBuffer.join('').toString())
                });
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
            .on('error', (err, socket) => {
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
