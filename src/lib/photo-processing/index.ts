import { Photo } from '../../models/Photo';
import { ModelRepositories } from '../../models/repositories';
import { PhotoProcessingBroker } from './amqp';
import { ResizedPhotoResponse } from './types';

const broker = new PhotoProcessingBroker();

async function processResizedPhoto(resizeResponse: ResizedPhotoResponse) {
  await ModelRepositories.Photo.updateThumbnails(resizeResponse.id, resizeResponse.thumbnails);
}

export const PhotoProcessing = {
  async init() {
    await broker.init();
    broker.subscribeToResizedPhotos(processResizedPhoto);
  },
  async addToResizeQueue(photo: Photo) {
    await broker.sendUploadedPhoto({
      id: photo.id,
      imageUrl: photo.imageUrl
    });
  }
};
