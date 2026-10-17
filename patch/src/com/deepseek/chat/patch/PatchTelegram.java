package com.deepseek.chat.patch;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;

/** Открывает Telegram из любого места процесса. */
public class PatchTelegram {
    public static void open() {
        Context ctx = PatchInit.appContext();
        if (ctx == null) return;
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse("https://t.me/Tyta_Zdesyaa777"));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(i);
        } catch (Throwable t) {
            try {
                Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse("tg://resolve?domain=Tyta_Zdesyaa777"));
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(i);
            } catch (Throwable t2) { }
        }
    }
}
