package com.deepseek.chat.patch;

import android.content.Context;
import android.content.SharedPreferences;

/**
 * Свои SharedPreferences — отдельное хранилище, не пересекается с prefs DeepSeek.
 */
public class PatchPrefs {
    private static final String FILE = "deepseek_patch_prefs";

    public static SharedPreferences get(Context ctx) {
        return ctx.getSharedPreferences(FILE, Context.MODE_PRIVATE);
    }
}
