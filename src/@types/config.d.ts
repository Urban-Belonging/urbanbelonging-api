declare interface Config {
  port: number;
  mongoHost: string;
  corsDomains: string[];
  photoUploadS3Bucket: string;
  redisHost: string;
  sendgridApiKey: string
}
