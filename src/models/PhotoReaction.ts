import { Document, Model, model, Schema } from 'mongoose';
import { ObjectIdOrDocument } from '../@types';
import { schemaToJSON } from '../lib/mongoose-middleware/schemaToJSON';
import { ReactionAnswer, ReactionPrompt } from '../lib/prompts';
import { Photo } from './Photo';
import { PhotoEvent } from './PhotoEvent';
import { User } from './User';

export interface PhotoReaction extends Document {
  answers: ReactionAnswer[];
  prompts: ReactionPrompt[];
  photo: ObjectIdOrDocument<Photo>;
  event: ObjectIdOrDocument<PhotoEvent>;
  createdBy: ObjectIdOrDocument<User>;
  createdAt: Date;
  updatedAt: Date;
}

export const PhotoReactionSchema = new Schema(
  {
    answers: [
      {
        singleChoiceAnswer: { type: String, default: null },
        multipleChoiceAnswer: { type: [String], default: null },
        sliderAnswer: { type: Number, default: 3 },
        answerType: {
          type: String
        }
      }
    ],
    prompts: [
      {
        promptType: {
          type: String
        },
        annotationPromptType: {
          type: String
        },
        answerType: {
          type: String
        },
        message: {
          type: String
        }
      }
    ],
    photo: { type: Schema.Types.ObjectId, ref: 'Photo' },
    event: { type: Schema.Types.ObjectId, ref: 'PhotoEvent' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  {
    versionKey: false,
    timestamps: true
  }
);

PhotoReactionSchema.method('toJSON', schemaToJSON);

PhotoReactionSchema.set('toObject', { virtuals: true });
PhotoReactionSchema.set('toJSON', { virtuals: true });

export const PhotoReactionModel: Model<PhotoReaction> = model<PhotoReaction>('PhotoReaction', PhotoReactionSchema);
