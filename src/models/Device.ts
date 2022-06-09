import { Document, Model, model, Schema } from 'mongoose';
import { ObjectIdOrDocument } from '../@types';
import { schemaToJSON } from '../lib/mongoose-middleware/schemaToJSON';
import { User } from './User';

export interface Device extends Document {
  token: string;
  platform: 'ios' | 'android';
  user: ObjectIdOrDocument<User>;
  createdAt: Date;
  updatedAt: Date;
}

export const DeviceSchema = new Schema(
  {
    platform: { type: String },
    token: { type: String },
    user: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  {
    versionKey: false,
    timestamps: true
  }
);

DeviceSchema.method('toJSON', schemaToJSON);

DeviceSchema.set('toObject', { virtuals: true });
DeviceSchema.set('toJSON', { virtuals: true });

export const DeviceModel: Model<Device> = model<Device>('Device', DeviceSchema);
