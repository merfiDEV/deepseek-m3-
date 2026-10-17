package com.deepseek.chat.patch;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * Наш экран настроек. Кнопка "Разработчик мода" открывает Telegram.
 * Layout строится в коде, чтобы не тащить XML-ресурсы.
 */
public class PatchSettingsActivity extends Activity {
    private static final String TG_URL = "https://t.me/Tyta_Zdesyaa777";

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

        Button devButton = new Button(this);
        devButton.setText("Разработчик мода");
        devButton.setOnClickListener(v -> {
            try {
                Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(TG_URL));
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(i);
            } catch (Throwable t) {
                // Telegram/браузер недоступен
            }
        });
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.topMargin = 64;
        root.addView(devButton, lp);

        setContentView(root);
    }
}
