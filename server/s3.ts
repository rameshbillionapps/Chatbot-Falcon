import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

const BUCKET = process.env.S3_BUCKET || "lead-management-473873806984-ap-south-1-an";
const REGION = process.env.S3_REGION || "ap-south-1";

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _client;
}

export function isS3Configured(): boolean {
  return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}

export async function uploadCardImageToS3(filePath: string, mimeType: string): Promise<string> {
  const key = `visiting-cards/${path.basename(filePath)}`;
  const buffer = fs.readFileSync(filePath);

  await getClient().send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  }));

  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}
