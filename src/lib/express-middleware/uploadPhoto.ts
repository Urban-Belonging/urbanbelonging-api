import * as aws from 'aws-sdk';
import { Request } from 'express';
import * as multer from 'multer';
import * as multerS3 from 'multer-s3';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import config from '../../config';

const endpoint = new aws.Endpoint('ams3.digitaloceanspaces.com');
const s3 = new aws.S3({
  endpoint,
  credentials: new aws.Credentials({
    accessKeyId: process.env.SPACES_CDN_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.SPACES_CDN_SECRET_ACCESS_KEY as string
  })
});

export const handlePhotoUpload = multer({
  storage: multerS3({
    s3,
    bucket: config.photoUploadS3Bucket,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    acl: 'public-read',
    metadata: (req, file, cb) => {
      cb(null, {
        fieldName: file.fieldname
      });
    },
    key: (req: Request, file, cb) => {
      cb(null, `${uuid()}${path.extname(file.originalname)}`);
    }
  })
});
