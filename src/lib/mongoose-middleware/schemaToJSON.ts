import { Document } from 'mongoose';

export const schemaToJSON = function (this: Document) {
  const obj = this.toObject();

  obj.id = obj._id;
  delete obj._id;

  return obj;
};
