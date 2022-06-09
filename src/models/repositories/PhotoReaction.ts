import Debug from 'debug';
import { FilterQuery } from 'mongoose';
import { ModelRepositories } from '.';
import { ReactionAnswer } from '../../lib/prompts';
import { PhotoReaction, PhotoReactionModel } from '../PhotoReaction';

const debug = Debug('PhotoReaction');

export async function create(options: { answers: ReactionAnswer[]; photo: string; createdBy: string }) {
  debug(`Creating PhotoReaction with params `, options);

  const photo = await ModelRepositories.Photo.assertExists(options.photo);

  const photoReaction = await PhotoReactionModel.create({
    prompts: photo.reactionPrompts,
    answers: options.answers,
    photo: options.photo,
    createdBy: options.createdBy,
    event: photo.event
  });

  debug(`Successfully created PhotoReaction document with ID "${photoReaction._id}"`);

  return photoReaction;
}

export async function listForPhoto(photoId: string, userId?: string) {
  await ModelRepositories.Photo.assertExists(photoId);

  const query: FilterQuery<PhotoReaction> = {
    photo: photoId
  };

  if (userId) {
    query.createdBy = userId;
  }

  const reactions = await PhotoReactionModel.find(query);

  return reactions;
}

export async function listForEvent(eventId: string, userId?: string) {
  await ModelRepositories.PhotoEvent.assertExists(eventId);

  const query: FilterQuery<PhotoReaction> = {
    event: eventId
  };

  if (userId) {
    query.createdBy = userId;
  }

  const reactions = await PhotoReactionModel.find(query);

  return reactions;
}

export async function destroyForPhoto(photoId: string) {
  return await PhotoReactionModel.deleteMany({
    photo: photoId
  });
}
