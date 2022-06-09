export interface UploadedPhoto {
  id: string;
  imageUrl: string;
}

export interface ResizedPhotoResponse {
  id: string;
  thumbnails: Thumbnail[];
}
