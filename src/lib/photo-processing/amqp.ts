import * as amqp from 'amqplib';
import { ResizedPhotoResponse, UploadedPhoto } from './types';
import Debug from 'debug';

const debug = Debug('PhotoProcessing');

const PHOTO_UPLOADED_QUEUE_NAME = 'photo-uploaded';
const PHOTO_RESIZED_QUEUE_NAME = 'photo-resized';

export class PhotoProcessingBroker {
  private connection: amqp.Connection;
  private sendChannel: amqp.Channel;
  private subscriptionChannel: amqp.Channel;
  private resizedHandler: (photo: ResizedPhotoResponse) => Promise<void>;

  public async init() {
    this.connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    this.connection.on('error', this.connectionErrorHandler);
    this.connection.on('close', this.connectionClosedHandler);
    this.connection.on('blocked', this.blockedConnectionHandler);
    this.connection.on('unblocked', this.unblockedConnectionHandler);
    this.subscriptionChannel = await this.connection.createChannel();
    this.sendChannel = await this.connection.createChannel();
  }

  public async sendUploadedPhoto(message: UploadedPhoto) {
    debug(`Sending uploaded photo with ID ${message.id} and URL ${message.imageUrl}`);
    await this.assertQueue(this.sendChannel, PHOTO_UPLOADED_QUEUE_NAME);
    this.sendChannel.sendToQueue(PHOTO_UPLOADED_QUEUE_NAME, Buffer.from(JSON.stringify(message)));
  }

  public async subscribeToResizedPhotos(handler: (photo: ResizedPhotoResponse) => Promise<void>) {
    await this.assertQueue(this.subscriptionChannel, PHOTO_RESIZED_QUEUE_NAME);

    this.resizedHandler = handler;
    this.subscriptionChannel.consume(PHOTO_RESIZED_QUEUE_NAME, async (message) => {
      let didAck = false;
      try {
        if (!message) throw new Error();

        const messagePayload = message.content.toString('utf8');
        debug('Received resized message', messagePayload);

        const parsedMessage = JSON.parse(messagePayload) as ResizedPhotoResponse;

        await this.resizedHandler(parsedMessage);
        this.subscriptionChannel.ack(message);
        didAck = true;
      } catch (err) {
        console.error(`[PhotoProcessingBroker] Error processing message`, err);
      } finally {
        if (!didAck && message) this.subscriptionChannel.ack(message);
      }
    });
  }

  private async assertQueue(channel: amqp.Channel, queue: string) {
    this.assertConnection();
    await channel.assertQueue(queue, { durable: true });
  }

  private assertConnection() {
    if (!this.connection) throw new Error('No active connection');
  }

  private connectionErrorHandler(error: any) {
    console.log(`[PhotoProcessingBroker] A connection error occurred`, error);
  }

  private blockedConnectionHandler(reason: any) {
    console.log(`[PhotoProcessingBroker] Connection blocked, reason:`, reason);
  }

  private unblockedConnectionHandler() {
    console.log(`[PhotoProcessingBroker] Connection unblocked`);
  }

  private connectionClosedHandler() {
    console.log(`[PhotoProcessingBroker] Connection closed`);
  }
}
