const { google } = require('googleapis');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log("EMAIL =>", process.env.GOOGLE_CLIENT_EMAIL);
console.log("KEY =>", process.env.GOOGLE_PRIVATE_KEY ? "FOUND" : "MISSING");

// Extract credentials from environment variables
const credentials = {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    // Replace literal '\n' characters with actual line breaks for the key to work
    private_key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
};

// Define scopes required for Drive and Sheets APIs
const SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.file'
];

const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES,
});

module.exports = { auth, google };
