import { google } from 'googleapis';
import fs from 'fs';

async function testDriveAccess() {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'path/to/service-account-key.json', // 👈 Replace with your key file path
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  const drive = google.drive({ version: 'v3', auth });

  // 🧠 Test 1: List a few files
  const list = await drive.files.list({
    pageSize: 5,
    fields: 'files(id, name, parents)',
  });
  console.log('Files visible to service account:', list.data.files);

  // 🧠 Test 2: Try uploading a small file to shared folder
  const fileMetadata = {
    name: 'drive_test.txt',
    parents: ['YOUR_SHARED_FOLDER_ID'], // 👈 Replace with folder ID you shared
  };

  const media = {
    mimeType: 'text/plain',
    body: fs.createReadStream('drive-test.js'),
  };

  try {
    const res = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: 'id, name',
    });
    console.log('✅ Uploaded successfully:', res.data);
  } catch (err) {
    console.error('❌ Upload failed:', err.errors || err.message);
  }
}

testDriveAccess();
