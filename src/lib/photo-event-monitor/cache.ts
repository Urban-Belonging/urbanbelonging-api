import { PhotoEvent } from '../../models/PhotoEvent';
import { ModelRepositories } from '../../models/repositories';

const cache = new Map<string, PhotoEvent>();

// @TODO Add redis
export const PhotoEventCache = {
  async add(photoEvent: PhotoEvent): Promise<void> {
    cache.set(photoEvent._id.toString(), photoEvent);
  },

  async has(id: string) {
    return cache.has(id);
  },

  async get(id: string): Promise<PhotoEvent> {
    let photoEvent = cache.get(id);

    if (!photoEvent) {
      const result = await ModelRepositories.PhotoEvent.get(id);
      this.add(result);
      return result;
    }

    return photoEvent;
  }
};
