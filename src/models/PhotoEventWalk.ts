import { Document, Model, model, Schema, LeanDocument } from 'mongoose';
import { ObjectIdOrDocument } from '../@types';
import { LocationDataPointWithTimestamp } from '../lib/location/types';
import { schemaToJSON } from '../lib/mongoose-middleware/schemaToJSON';
import { Photo } from './Photo';
import { PhotoEvent } from './PhotoEvent';
import { User } from './User';

type PhotoEventWalkStatus = 'pending' | 'in-progress' | 'completed';

export interface PhotoEventWalk extends Document {
  name: string;
  locationData: LocationDataPointWithTimestamp[];
  status: PhotoEventWalkStatus;
  distance: number;
  duration: number;
  startedAt: Date;
  endedAt: Date;
  event: ObjectIdOrDocument<PhotoEvent>;
  createdBy: ObjectIdOrDocument<User>;
  createdAt: Date;
  updatedAt: Date;
}

export type PhotoEventWalkWithPhotos = LeanDocument<
  Omit<PhotoEventWalk, 'locationData'> & {
    photos: Photo[];
  }
>;

export const PhotoEventWalkSchema = new Schema(
  {
    name: { type: String },
    locationData: [
      {
        latitude: String,
        longitude: String,
        timestamp: Date
      }
    ],
    distance: {
      type: Number,
      default: 0
    },
    duration: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      default: 'pending'
    },
    startedAt: {
      type: Date,
      default: null
    },
    endedAt: {
      type: Date,
      default: null
    },
    event: { type: Schema.Types.ObjectId, ref: 'PhotoEvent' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  {
    versionKey: false,
    timestamps: true
  }
);

PhotoEventWalkSchema.method('toJSON', schemaToJSON);

PhotoEventWalkSchema.set('toObject', { virtuals: true });
PhotoEventWalkSchema.set('toJSON', { virtuals: true });

export const PhotoEventWalkModel: Model<PhotoEventWalk> = model<PhotoEventWalk>('PhotoEventWalk', PhotoEventWalkSchema);
