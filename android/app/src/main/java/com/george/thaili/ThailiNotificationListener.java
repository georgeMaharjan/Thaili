package com.george.thaili;

import android.service.notification.NotificationListenerService;

/**
 * Declared so Thaili appears in Android's "Notification access" list and the user
 * can grant it. Reading wallet notifications (eSewa, Khalti, IME Pay) comes next;
 * until then it receives nothing and does nothing.
 */
public class ThailiNotificationListener extends NotificationListenerService {}
