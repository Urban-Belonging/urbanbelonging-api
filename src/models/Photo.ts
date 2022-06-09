import { Document, LeanDocument, Model, model, Schema } from 'mongoose';
import { ObjectIdOrDocument } from '../@types';
import { AnnotationAnswer, AnnotationPrompt, ReactionPrompt } from '../lib/prompts';
import { PhotoEvent } from './PhotoEvent';
import { PhotoReaction } from './PhotoReaction';
import { User } from './User';

export type PhotoLocationData = {
  latitude: string;
  longitude: string;
} | null;

export interface Photo extends Document {
  imageUrl: string;
  thumbnails: Thumbnail[];
  locationData: PhotoLocationData;
  exifData: any | null;
  event: ObjectIdOrDocument<PhotoEvent>;
  reactionPrompts: ReactionPrompt[];
  annotationPrompts: AnnotationPrompt[];
  annotationAnswers: AnnotationAnswer[];
  reactions?: PhotoReaction[];
  createdBy: ObjectIdOrDocument<User>;
  createdAt: Date;
  updatedAt: Date;
}

export type PhotoWithUserReactionStatus = LeanDocument<Omit<Photo, 'exifData'>> & {
  hasReacted: boolean;
};

export type LeanPhoto = LeanDocument<Photo>;
export type LeanPhotoWithoutId = Omit<LeanPhoto, '_id'>;

export const PhotoSchema = new Schema(
  {
    imageUrl: { type: String },
    thumbnails: [{ size: Number, url: String }],
    locationData: {
      type: {
        latitude: String,
        longitude: String
      },
      default: null
    },
    exifData: {
      type: Schema.Types.Mixed,
      default: null
    },

    // Prompts
    reactionPrompts: [
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
        },
        canAddCustomTag: {
          type: Boolean
        }
      }
    ],
    annotationPrompts: [
      {
        promptType: {
          type: String
        },
        answerType: {
          type: String
        },
        message: {
          type: String
        },
        canAddCustomTag: {
          type: Boolean
        }
      }
    ],
    annotationAnswers: [
      {
        singleChoiceAnswer: { type: String, default: null },
        multipleChoiceAnswer: { type: [String], default: null },
        sliderAnswer: { type: Number, default: 3 },
        answerType: {
          type: String
        }
      }
    ],

    event: { type: Schema.Types.ObjectId, ref: 'PhotoEvent' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  {
    versionKey: false,
    timestamps: true
  }
);

PhotoSchema.virtual('reactions', {
  ref: 'PhotoReaction',
  localField: '_id',
  foreignField: 'photo'
});

// @TODO add indexes directly to DB
// PhotoSchema.index({
//   createdBy: 1,
//   group: 1
// });

// PhotoSchema.index({
//   group: 1
// });

// PhotoSchema.index({
//   event: 1
// });

// PhotoSchema.index({
//   createdBy: 1
// });

export function photoToJSON(photo: Photo) {
  const obj = photo.toObject() as Omit<LeanDocument<Photo>, 'exifData'> & {
    exifData?: any | null;
  };

  obj.id = obj._id;
  delete obj._id;
  delete obj.exifData;

  return obj;
}

PhotoSchema.method('toJSON', function (this: Photo) {
  return photoToJSON(this);
});

PhotoSchema.set('toObject', { virtuals: true });
PhotoSchema.set('toJSON', { virtuals: true });

export const PhotoModel: Model<Photo> = model<Photo>('Photo', PhotoSchema);
