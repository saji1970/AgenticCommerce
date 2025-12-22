// Simple script to download Expo default assets
const https = require('https');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'assets');

// Ensure assets directory exists
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const assets = {
  'icon.png': 'https://github.com/expo/expo/raw/main/templates/expo-template-blank/assets/icon.png',
  'adaptive-icon.png': 'https://github.com/expo/expo/raw/main/templates/expo-template-blank/assets/adaptive-icon.png',
  'splash.png': 'https://github.com/expo/expo/raw/main/templates/expo-template-blank/assets/splash.png',
  'favicon.png': 'https://github.com/expo/expo/raw/main/templates/expo-template-blank/assets/favicon.png'
};

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        https.get(response.headers.location, (res) => {
          res.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log(`Downloaded: ${path.basename(dest)}`);
            resolve();
          });
        }).on('error', reject);
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`Downloaded: ${path.basename(dest)}`);
          resolve();
        });
      }
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function downloadAssets() {
  console.log('Downloading Expo default assets...');

  for (const [filename, url] of Object.entries(assets)) {
    const dest = path.join(assetsDir, filename);
    try {
      await downloadFile(url, dest);
    } catch (error) {
      console.error(`Failed to download ${filename}:`, error.message);
    }
  }

  console.log('Done!');
}

downloadAssets();
