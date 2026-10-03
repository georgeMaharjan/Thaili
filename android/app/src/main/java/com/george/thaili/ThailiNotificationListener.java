package com.george.thaili;

import android.app.Notification;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Keeps money notifications from the bank and wallet apps the user added as accounts
 * (the package → account map comes from the web layer via ThailiPlugin.setCapture). Runs while
 * Thaili is closed; the app reads the log on its next catch-up and parses it like SMS,
 * and Capture may nudge "Review this transaction" right away.
 * Nothing from any other app is kept.
 */
public class ThailiNotificationListener extends NotificationListenerService {
    static final String PREFS = Capture.PREFS;
    private static final int KEEP = 500; // ponytail: newest 500 only; the app reads them within a day or two anyway
    static final Pattern AMOUNT = Pattern.compile("(?i)(NPR|Rs\\.?)\\s*[\\d,]+");
    // An actual code, not the "Never share your OTP" footer real bank alerts carry.
    static final Pattern OTP = Pattern.compile("(?i)(OTP|one[- ]?time password|verification code|code)\\W{0,4}(is\\W{0,3})?\\d{4,8}\\b");

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        SharedPreferences p = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        JSONObject c = Capture.config(this);
        JSONObject pkgs = c.optJSONObject("packages");
        if (pkgs == null || !pkgs.has(sbn.getPackageName())) return;
        Bundle x = sbn.getNotification().extras;
        CharSequence title = x.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence big = x.getCharSequence(Notification.EXTRA_BIG_TEXT);
        CharSequence text = big != null ? big : x.getCharSequence(Notification.EXTRA_TEXT);
        String body = ((title == null ? "" : title + "\n") + (text == null ? "" : text)).trim();
        if (!AMOUNT.matcher(body).find() || OTP.matcher(body).find()) return;
        synchronized (ThailiNotificationListener.class) {
            try {
                JSONArray all = new JSONArray(p.getString("log", "[]"));
                all.put(new JSONObject().put("pkg", sbn.getPackageName()).put("body", body).put("at", sbn.getPostTime()));
                JSONArray kept = new JSONArray();
                for (int i = Math.max(0, all.length() - KEEP); i < all.length(); i++) kept.put(all.get(i));
                p.edit().putString("log", kept.toString()).apply();
            } catch (JSONException ignored) {
                // A corrupt log is dropped rather than crash the listener.
                p.edit().remove("log").apply();
            }
        }
        Capture.onMessage(this, c, body, sbn.getPostTime());
    }
}
