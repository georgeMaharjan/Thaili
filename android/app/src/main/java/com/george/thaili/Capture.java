package com.george.thaili;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import java.util.Iterator;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * "Review this transaction" while Thaili is closed. The patterns come from the web layer
 * (src/lib/sms.ts nativeRules, sent through ThailiPlugin.setCapture) so the sender, wording
 * and rule checks match what the app itself will import. The app still does the real import
 * on its next catch-up; this only decides whether to nudge.
 */
final class Capture {
    static final String PREFS = "thaili_notifications";
    private static final String CHANNEL = "review";

    private Capture() {}

    static JSONObject config(Context ctx) {
        try {
            return new JSONObject(ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("config", "{}"));
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    private static Pattern re(String src) {
        return Pattern.compile(src, Pattern.CASE_INSENSITIVE);
    }

    /** The account key for an SMS sender ID, or null when it isn't one of the user's banks. */
    static String bankForSender(JSONObject c, String sender) {
        JSONObject senders = c.optJSONObject("senders");
        if (senders == null || sender == null) return null;
        for (Iterator<String> it = senders.keys(); it.hasNext(); ) {
            String k = it.next();
            if (re(senders.optString(k)).matcher(sender.trim()).find()) return k;
        }
        return null;
    }

    /** A new money message from one of the user's accounts: notify if it's a spend no rule will file. */
    static void onMessage(Context ctx, JSONObject c, String body, long at) {
        if (!c.optBoolean("notify") || body == null) return;
        try {
            if (re(c.getString("notTxn")).matcher(body).find()) return;
            String dir = null;
            JSONArray txn = c.getJSONArray("txn");
            for (int i = 0; i < txn.length() && dir == null; i++) {
                JSONArray t = txn.getJSONArray(i);
                if (re(t.getString(0)).matcher(body).find()) dir = t.getString(1);
            }
            // Wallet/bank app wording ("Fund transfer of NPR 500 … is successful") rarely matches the
            // SMS sentences; the app parses those with the generic notification rules, so nudge on them too.
            JSONObject n = c.optJSONObject("notification");
            if (dir == null && n != null && !re(n.getString("ignore")).matcher(body).find()) {
                if (re(n.getString("credit")).matcher(body).find()) dir = "credit";
                else if (re(n.getString("debit")).matcher(body).find()) dir = "debit";
            }
            if (!"debit".equals(dir)) return; // only spends need a category
            Matcher a = re(c.getString("amount")).matcher(body);
            if (!a.find() && (n == null || !(a = re(n.getString("amount")).matcher(body)).find())) return;
            String amt = a.group(1);
            for (int g = 2; amt == null && g <= a.groupCount(); g++) amt = a.group(g);
            Matcher r = re(c.getString("remark")).matcher(body);
            String rem = r.find() ? (r.group(1) != null ? r.group(1) : r.group(2)) : null;
            if (rem != null && re(c.getString("wallets")).matcher(rem).find()) return; // a wallet load: a transfer
            String hay = body.toUpperCase().replaceAll("[^A-Z0-9&]+", " ");
            JSONArray rules = c.optJSONArray("rules");
            for (int i = 0; rules != null && i < rules.length(); i++) {
                String kw = rules.optString(i);
                if (!kw.isEmpty() && hay.contains(kw)) return; // a rule files it
            }
            post(ctx, "NPR " + amt, rem == null ? null : rem.trim(), at);
        } catch (Exception ignored) {
            // A bad pattern from an older app version must never crash the receiver.
        }
    }

    private static void post(Context ctx, String amount, String remark, long at) {
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && nm.getNotificationChannel(CHANNEL) == null) {
            nm.createNotificationChannel(new NotificationChannel(CHANNEL, "Spends to review", NotificationManager.IMPORTANCE_DEFAULT));
        }
        // SMS and the bank app's own notification for one spend share an id, so only one shows.
        int id = (amount + (at / 180000)).hashCode();
        Intent open = new Intent(ctx, MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP)
            .putExtra("thailiOpen", "review").putExtra("at", at);
        PendingIntent tap = PendingIntent.getActivity(ctx, id, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        String text = remark == null || remark.isEmpty() ? amount : amount + " · " + remark;
        try {
            NotificationManagerCompat.from(ctx).notify(id, new NotificationCompat.Builder(ctx, CHANNEL)
                .setSmallIcon(R.drawable.ic_stat_thaili)
                .setContentTitle("Review this transaction")
                .setContentText(text)
                .setContentIntent(tap)
                .setAutoCancel(true)
                .build());
        } catch (SecurityException ignored) {
            // Notifications not allowed: the spend still waits in Needs review.
        }
    }
}
