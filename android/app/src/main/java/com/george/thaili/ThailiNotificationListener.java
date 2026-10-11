package com.george.thaili;

import android.app.Notification;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import java.util.regex.Pattern;
import java.lang.ref.WeakReference;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.HashMap;
import java.util.Map;
import android.os.Handler;
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
    static final Pattern AMOUNT = MoneyNotificationText.AMOUNT;
    // An actual code, not the "Never share your OTP" footer real bank alerts carry.
    static final Pattern OTP = MoneyNotificationText.OTP;
    private static WeakReference<ThailiNotificationListener> active = new WeakReference<>(null);

    @Override
    public void onListenerConnected() {
        active = new WeakReference<>(this);
        captureActive();
    }

    @Override
    public void onListenerDisconnected() {
        active.clear();
    }

    static void refresh() {
        ThailiNotificationListener listener = active.get();
        if (listener != null) new Handler(listener.getMainLooper()).post(listener::captureActive);
    }

    private void captureActive() {
        try {
            StatusBarNotification[] notifications = getActiveNotifications();
            if (notifications != null) for (StatusBarNotification notification : notifications) onNotificationPosted(notification);
        } catch (SecurityException ignored) { /* Access may have just been revoked. */ }
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || (sbn.getNotification().flags & Notification.FLAG_GROUP_SUMMARY) != 0) return;
        SharedPreferences p = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        JSONObject c = Capture.config(this);
        JSONObject pkgs = c.optJSONObject("packages");
        if (pkgs == null || !pkgs.has(sbn.getPackageName())) return;
        Bundle x = sbn.getNotification().extras;
        Map<String, Integer> occurrences = new HashMap<>();
        for (String body : MoneyNotificationText.bodies(x.getCharSequence(Notification.EXTRA_TITLE),
                x.getCharSequence(Notification.EXTRA_BIG_TEXT), x.getCharSequence(Notification.EXTRA_TEXT),
                x.getCharSequenceArray(Notification.EXTRA_TEXT_LINES))) {
            int occurrence = occurrences.getOrDefault(body, 0);
            occurrences.put(body, occurrence + 1);
            keep(sbn, c, p, body, occurrence);
        }
    }

    private void keep(StatusBarNotification sbn, JSONObject c, SharedPreferences p, String body, int occurrence) {
        String normalized = MoneyNotificationText.normalize(body);
        if (!AMOUNT.matcher(normalized).find() || OTP.matcher(normalized).find()) return;
        JSONObject rules = c.optJSONObject("notification");
        if (rules != null && Pattern.compile(rules.optString("ignore", "(?!)"), Pattern.CASE_INSENSITIVE).matcher(normalized).find()) return;
        long at = sbn.getNotification().when > 0 ? sbn.getNotification().when : sbn.getPostTime();
        String identity = sbn.getPackageName() + "|" + sbn.getKey() + "|" + at + "|" + body;
        if (occurrence > 0) identity += "|occurrence:" + occurrence;
        String id = UUID.nameUUIDFromBytes(identity.getBytes(StandardCharsets.UTF_8)).toString();
        synchronized (ThailiNotificationListener.class) {
            try {
                JSONArray all = new JSONArray(p.getString("log", "[]"));
                for (int i = 0; i < all.length(); i++) if (id.equals(all.getJSONObject(i).optString("id"))) return;
                all.put(new JSONObject().put("id", id).put("pkg", sbn.getPackageName()).put("body", body)
                    .put("at", at).put("receivedAt", System.currentTimeMillis()));
                JSONArray kept = new JSONArray();
                for (int i = Math.max(0, all.length() - KEEP); i < all.length(); i++) kept.put(all.get(i));
                p.edit().putString("log", kept.toString()).apply();
            } catch (JSONException ignored) {
                // A corrupt log is dropped rather than crash the listener.
                p.edit().remove("log").apply();
            }
        }
        ThailiPlugin.moneyNotification();
        Capture.onMessage(this, c, normalized, at);
    }
}
