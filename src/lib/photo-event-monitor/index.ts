import Debug from 'debug';
import { PhotoEventModel } from '../../models/PhotoEvent';
import { getActiveCollaborationPeriods } from '../../models/repositories/PhotoEvent';
import Push from '../push';
import type { PendingPushNotification } from '../push/types';
import { PhotoEventCache } from './cache';

const debug = Debug('PhotoEventMonitor');

const TIMER_INTERVAL = 10000;

export default class PhotoEventMonitor {
  private timer: NodeJS.Timeout;
  private timeOfLastCheck: Date;

  constructor() {
    this.start();
  }

  public start() {
    // Start immediately
    this.timer = setTimeout(this.run, 0);
  }

  private async run() {
    const loop = async () => {
      let now = new Date();

      if (this.timeOfLastCheck) {
        now = new Date(this.timeOfLastCheck.valueOf() + TIMER_INTERVAL);
      }

      const eventsWithPendingPushNotifications = await PhotoEventModel.find({
        'pendingPushNotifications.1': {
          $exists: true
        }
      });

      if (eventsWithPendingPushNotifications.length > 0) {
        debug(`Found ${eventsWithPendingPushNotifications.length} photo events with pending push notifications`);
      }

      // @todo better batching of multiple pushes
      for (const photoEvent of eventsWithPendingPushNotifications) {
        debug(`Event starts ${photoEvent.contributionPeriodStartsAt} now: ${now}`);

        const activePeriods = getActiveCollaborationPeriods(photoEvent, now);
        const stillPendingNotifications: PendingPushNotification[] = [];

        for (const pendingPushNotification of photoEvent.pendingPushNotifications) {
          switch (pendingPushNotification.notificationType) {
            case 'photo-event:contribution:starting':
              if (activePeriods.isInContributionPeriod || activePeriods.isAfterContributionPeriod) {
                debug(`[${pendingPushNotification.notificationType}] Sending push for event ${photoEvent.id}`);
                await Push.sendToGroup(photoEvent.group as string, {
                  title: `${photoEvent.name} is starting, add your photos now!`,
                  message: 'Add your photo',
                  params: {
                    notificationType: pendingPushNotification.notificationType,
                    photoEventId: photoEvent.id,
                    photoEventTitle: photoEvent.name
                  }
                });
              } else {
                stillPendingNotifications.push(pendingPushNotification);
              }
              break;
            case 'photo-event:reaction:starting':
              if (activePeriods.isInReactionPeriod || activePeriods.isAfterReactionPeriod) {
                debug(`[${pendingPushNotification.notificationType}] Sending push for event ${photoEvent.id}`);
                await Push.sendToGroup(photoEvent.group as string, {
                  title: `${photoEvent.name} is ready for your reaction`,
                  message: 'Add your reaction to other photos',
                  params: {
                    notificationType: pendingPushNotification.notificationType,
                    photoEventId: photoEvent.id,
                    photoEventTitle: photoEvent.name
                  }
                });
              } else {
                stillPendingNotifications.push(pendingPushNotification);
              }
              break;
            default:
              stillPendingNotifications.push(pendingPushNotification);
              break;
          }
        }

        await photoEvent.updateOne({
          pendingPushNotifications: stillPendingNotifications
        });

        if (!PhotoEventCache.has(photoEvent._id)) await PhotoEventCache.add(photoEvent);
      }

      this.timeOfLastCheck = now;
      this.timer = setTimeout(loop, TIMER_INTERVAL);
    };

    loop();
  }

  destroy() {
    clearTimeout(this.timer);
  }
}
