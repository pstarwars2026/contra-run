const path = require('path');
const { pathToFileURL } = require('url');

const GAME_URL = pathToFileURL(path.join(__dirname, 'index.html')).href;

module.exports = { GAME_URL };
