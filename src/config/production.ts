const productionConfig: Config = {
  port: 1337,
  mongoHost: process.env.MONGODB_CONNECTION_URI as string,
  corsDomains: [],
  photoUploadS3Bucket: process.env.PHOTO_UPLOAD_BUCKET_NAME as string,
  redisHost: process.env.REDIS_HOST as string,
  sendgridApiKey: process.env.SENDGRID_API_KEY as string,
};

export default productionConfig;
