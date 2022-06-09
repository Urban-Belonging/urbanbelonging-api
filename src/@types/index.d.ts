import Mongoose, { Document } from 'mongoose';

export type ObjectIdOrDocument<T extends Document> = T | Mongoose.Types.ObjectId | string;
