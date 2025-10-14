'use server';
/**
 * @fileOverview A flow for uploading files to Google Drive using a service account.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { google } from 'googleapis';
import { Readable } from 'stream';

const a = 1;

const FileUploadInputSchema = z.object({
  fileDataUri: z.string().describe("The file to upload, as a data URI."),
  fileName: z.string().describe("The name of the file."),
  mimeType: z.string().describe("The MIME type of the file."),
});

const FileUploadOutputSchema = z.object({
  id: z.string().describe("The ID of the uploaded file in Google Drive."),
  webViewLink: z.string().describe("A link to view the file in the browser."),
  name: z.string().describe("The name of the file."),
});

export type FileUploadInput = z.infer<typeof FileUploadInputSchema>;
export type FileUploadOutput = z.infer<typeof FileUploadOutputSchema>;

async function getGoogleAuth() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON environment variable not set.');
  }
  const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const jwtClient = new google.auth.JWT(
    serviceAccountKey.client_email,
    undefined,
    serviceAccountKey.private_key,
    ['https://www.googleapis.com/auth/drive.file']
  );
  await jwtClient.authorize();
  return jwtClient;
}

const uploadFileFlow = ai.defineFlow(
  {
    name: 'uploadFileToDriveFlow',
    inputSchema: FileUploadInputSchema,
    outputSchema: FileUploadOutputSchema,
  },
  async (input) => {
    if (!process.env.GOOGLE_DRIVE_FOLDER_ID) {
      throw new Error('GOOGLE_DRIVE_FOLDER_ID environment variable not set.');
    }
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    
    const auth = await getGoogleAuth();
    const drive = google.drive({ version: 'v3', auth });

    const buffer = Buffer.from(input.fileDataUri.split(',')[1], 'base64');
    const stream = Readable.from(buffer);

    const fileMetadata = {
      name: input.fileName,
      parents: [folderId],
    };
    
    const media = {
      mimeType: input.mimeType,
      body: stream,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink, name',
    });

    const file = response.data;
    if (!file.id || !file.webViewLink || !file.name) {
      throw new Error('File upload failed to return necessary data.');
    }
    
    // Make the file publicly accessible
    await drive.permissions.create({
        fileId: file.id,
        requestBody: {
            role: 'reader',
            type: 'anyone'
        }
    });

    return {
      id: file.id,
      webViewLink: file.webViewLink,
      name: file.name,
    };
  }
);


export async function uploadFileToDrive(input: FileUploadInput): Promise<FileUploadOutput> {
    return uploadFileFlow(input);
}
