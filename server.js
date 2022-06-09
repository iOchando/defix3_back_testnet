const fs = require('fs');
const https = require('https');
const express = require('express');
const morgan = require('morgan');
const { dbConnect } = require('./config/postgres')
const app = express(),
      bodyParser = require("body-parser");

// Certificate
const privateKey = fs.readFileSync('/etc/letsencrypt/live/defix3.com/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/defix3.com/cert.pem', 'utf8');
const ca = fs.readFileSync('/etc/letsencrypt/live/defix3.com/chain.pem', 'utf8');

const credentials = {
	key: privateKey,
	cert: certificate,
	ca: ca
};

const cors = require('cors');

require('dotenv').config()

app.use(cors({
  origin: '*'
}));

// Starting both http & https servers
const httpsServer = https.createServer(credentials, app);

dbConnect()

app.use(bodyParser.json());
app.use(express.static(process.cwd() + '/my-app/dist'));
app.use(morgan('dev'))

app.use('/api/v1', require('./app/routes'))


httpsServer.listen(3070, () => {
	console.log('HTTPS Server running on port 3070');
});

