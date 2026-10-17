package com.deepseek.chat.patch;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

/**
 * Показывает уведомление "Patch Settings". Тап открывает PatchSettingsActivity.
 */
public class PatchNotifier {
    private static final String CHANNEL_ID = "deepseek_patch_channel";
    private static final int NOTIF_ID = 0x44534b01; // "DSK" + 1

    public static void show(Context ctx) {
        if (ctx == null) return;
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(
                CHANNEL_ID, "Patch Settings", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("Settings for patched DeepSeek");
            nm.createNotificationChannel(ch);
        }

        Intent intent = new Intent(ctx, PatchSettingsActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pi = PendingIntent.getActivity(ctx, 0, intent, flags);

        Notification.Builder b;
        if (Build.VERSION.SDK_INT >= 26) {
            b = new Notification.Builder(ctx, CHANNEL_ID);
        } else {
            b = new Notification.Builder(ctx);
        }
        b.setSmallIcon(android.R.drawable.ic_menu_manage)
         .setContentTitle("DeepSeek Patch")
         .setContentText("Tap to open patch settings")
         .setContentIntent(pi)
         .setOngoing(false)
         .setAutoCancel(true);

        try {
            nm.notify(NOTIF_ID, b.build());
        } catch (Throwable t) {
            // POST_NOTIFICATIONS может быть не выдан — игнорируем
        }
    }
}
