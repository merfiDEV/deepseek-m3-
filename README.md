# deepseek-m3-

Патч для DeepSeek Android (v2.6.2): собственный экран настроек + обход PairIP LicenseCheck.

## Что делает

1. Обходит PairIP LicenseCheck (`com.pairip.licensecheck.LicenseClient`): методы
   `checkLicense` и `initializeLicenseCheck` нейтрализуются (smali -> `return-void`).
2. Добавляет свой модуль `com.deepseek.chat.patch`:
   - `PatchInit` — ContentProvider, точка входа при старте процесса.
   - `PatchNotifier` — показывает уведомление "Patch Settings".
   - `PatchSettingsActivity` — свой экран настроек (пока каркас).
   - `PatchPrefs` — отдельные SharedPreferences.

Существующий код DeepSeek не изменяется: патч вставляется как новый dex
(`classes{N+1}.dex`) и новые записи в `AndroidManifest.xml`.

## Сборка

```
node patch/patcher.js build \
  --apk-in apk/base.apk \
  --apk-out apk/patched.apk \
  --workdir patch/work \
  --src patch/src
```

Требования: JDK (javac/keytool), apktool, d8, zipalign, apksigner.

## Установка

Сплиты переподписываются тем же keystore (`patch/release.keystore`), затем:

```
adb install-multiple -r apk/patched.apk apk/resigned/split_config.*.apk
```

## Структура

- `patch/src/com/deepseek/chat/patch/` — исходники Java
- `patch/patcher.js` — сборка/инъекция/подпись
- `patch/smali_patch.js` — нейтрализация PairIP
- `patch/release.keystore` — ключ подписи (alias `deepseekpatch`)
