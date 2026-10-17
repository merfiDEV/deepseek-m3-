package com.deepseek.chat.patch;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;

/**
 * Точка входа. Android создаёт этот ContentProvider при старте процесса,
 * до любой Activity. Здесь инициализируем патч и показываем уведомление.
 */
public class PatchInit extends ContentProvider {
    private static Context sContext;

    public static Context appContext() {
        return sContext;
    }

    @Override
    public boolean onCreate() {
        try {
            sContext = getContext();
            PatchNotifier.show(sContext);
        } catch (Throwable t) {
        }
        return true;
    }

    @Override public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) { return null; }
    @Override public String getType(Uri uri) { return null; }
    @Override public Uri insert(Uri uri, ContentValues values) { return null; }
    @Override public int delete(Uri uri, String selection, String[] selectionArgs) { return 0; }
    @Override public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) { return 0; }
}
