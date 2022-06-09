export type PushNotificationType =
  | 'photo-event:contribution:starting'
  | 'photo-event:contribution:ending'
  | 'photo-event:reaction:starting'
  | 'photo-event:reaction:ending'
  | 'photo-event:scheduled:daily-prompt-reminder'
  | 'user-group:invited'
  | 'user-group:custom-message';

export type PushNotificationParams = {
  notificationType: PushNotificationType;
} & (
  | {
      photoEventId: string;
      photoEventTitle: string;
    }
  | {
      userGroupId: string;
      userGroupName: string;
    }
  | {}
);

export interface PushNotification {
  title: string;
  message: string;
  params: PushNotificationParams;
}

export interface PendingPushNotification {
  notificationType: 'photo-event:contribution:starting' | 'photo-event:reaction:starting';
}
