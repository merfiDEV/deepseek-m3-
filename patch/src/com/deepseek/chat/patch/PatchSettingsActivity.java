package com.deepseek.chat.patch;

import android.app.Activity;
import android.os.Bundle;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.view.Gravity;

/**
 * Наш экран настроек. Пока пустой каркас — тут будут настройки патча.
 * Строим layout в коде, чтобы не тащить XML-ресурсы и не конфликтовать с res DeepSeek.
 */
public class PatchSettingsActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER_HORIZONTAL);
        root.setPadding(48, 96, 48, 48);

        TextView title = new TextView(this);
        title.setText("Patch Settings");
        title.setTextSize(22);
        title.setGravity(Gravity.CENTER);
        root.addView(title);

        TextView empty = new TextView(this);
        empty.setText("Nothing to configure yet.");
        empty.setTextSize(16);
        empty.setGravity(Gravity.CENTER);
        empty.setPadding(0, 32, 0, 0);
        root.addView(empty);

        setContentView(root);
    }
}
