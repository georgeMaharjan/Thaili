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
import java.util.List;
import java.util.ArrayList;
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
    static final Pattern AMOUNT = MoneyNotificationText.AMOUNT;
    // An actual code, not the "Never share your OTP" footer real bank alerts carry.
    static final Pattern OTP = MoneyNotificationText.OTP;
    private static WeakReference<ThailiNotificationListener> active = new WeakReference<>(null);

    @Override
    public void onListenerConnected() {
        active = new WeakReference<>(this);
        readLog(getSharedPreferences(PREFS, Context.MODE_PRIVATE), System.currentTimeMillis());
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
        // An amount alone is a promo ("win Rs. 10,000"); keep only money that moved in or out.
        if (rules != null && !Pattern.compile(rules.optString("credit", "(?!)"), Pattern.CASE_INSENSITIVE).matcher(normalized).find()
            && !Pattern.compile(rules.optString("debit", "(?!)"), Pattern.CASE_INSENSITIVE).matcher(normalized).find()) return;
        long at = sbn.getNotification().when > 0 ? sbn.getNotification().when : sbn.getPostTime();
        String identity = sbn.getPackageName() + "|" + sbn.getKey() + "|" + at + "|" + body;
        if (occurrence > 0) identity += "|occurrence:" + occurrence;
        String id = UUID.nameUUIDFromBytes(identity.getBytes(StandardCharsets.UTF_8)).toString();
        synchronized (ThailiNotificationListener.class) {
            try {
                JSONArray all = readLog(p, System.currentTimeMillis());
                for (int i = 0; i < all.length(); i++) if (id.equals(all.getJSONObject(i).optString("id"))) return;
                all.put(new JSONObject().put("id", id).put("pkg", sbn.getPackageName()).put("body", body)
                    .put("at", at).put("receivedAt", System.currentTimeMillis()));
                JSONArray kept = recent(all, System.currentTimeMillis());
                p.edit().putString("log", kept.toString()).apply();
            } catch (JSONException ignored) {
                // A corrupt log is dropped rather than crash the listener.
                p.edit().remove("log").apply();
            }
        }
        ThailiPlugin.moneyNotification();
        Capture.onMessage(this, c, normalized, at);
    }
    private static JSONArray recent(JSONArray all, long now) throws JSONException {
        List<JSONObject> items = new ArrayList<>();
        for (int i = 0; i < all.length(); i++) items.add(all.getJSONObject(i));
        JSONArray kept = new JSONArray();
        for (JSONObject item : NotificationRetention.keep(items, now,
                n -> n.optLong("at", 0), n -> n.optLong("receivedAt", n.optLong("at", 0)))) kept.put(item);
        return kept;
    }

    /** Pruning on capture/read/connection avoids an unbounded private raw-message archive. */
    static JSONArray readLog(SharedPreferences prefs, long now) {
        synchronized (ThailiNotificationListener.class) {
            try {
                JSONArray all = new JSONArray(prefs.getString("log", "[]"));
                JSONArray kept = recent(all, now);
                if (kept.length() != all.length()) prefs.edit().putString("log", kept.toString()).apply();
                return kept;
            } catch (JSONException ignored) {
                prefs.edit().remove("log").apply();
                return new JSONArray();
            }
        }
    }

}
