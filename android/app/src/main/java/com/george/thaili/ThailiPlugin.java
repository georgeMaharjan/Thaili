package com.george.thaili;

import android.Manifest;
import android.app.Activity;
import android.app.KeyguardManager;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.view.HapticFeedbackConstants;
import android.provider.Settings;
import android.provider.Telephony;
import java.util.regex.Pattern;
import java.util.HashSet;
import java.util.Set;
import java.util.ArrayList;
import java.util.List;
import java.util.Iterator;
import java.util.UUID;
import java.nio.charset.StandardCharsets;
import java.io.OutputStream;
import androidx.activity.result.ActivityResult;
import java.lang.ref.WeakReference;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;
import androidx.lifecycle.Lifecycle;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import android.content.Context;
import android.content.SharedPreferences;

/** Device access the web layer can't reach: SMS permission, notification access, installed apps. */
@CapacitorPlugin(
    name = "Thaili",
    permissions = { @Permission(alias = "sms", strings = { Manifest.permission.READ_SMS, Manifest.permission.RECEIVE_SMS }) }
)
public class ThailiPlugin extends Plugin {
    private static WeakReference<ThailiPlugin> active = new WeakReference<>(null);

    static void moneyNotification() {
        ThailiPlugin plugin = active.get();
        if (plugin != null) plugin.notifyListeners("moneyNotification", new JSObject());
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject r = new JSObject();
        r.put("sms", getPermissionState("sms") == PermissionState.GRANTED);
        r.put("notifications", NotificationManagerCompat.getEnabledListenerPackages(getContext()).contains(getContext().getPackageName()));
        call.resolve(r);
    }

    /** Shows Android's SMS dialog. Once the user has denied it twice Android stops showing it; the result then just reads false. */
    @PluginMethod
    public void requestSms(PluginCall call) {
        if (getPermissionState("sms") == PermissionState.GRANTED) status(call);
        else requestPermissionForAlias("sms", call, "smsResult");
    }

    @PermissionCallback
    private void smsResult(PluginCall call) {
        status(call);
    }

    /** Android's own "Save as" screen: the user picks where the backup goes (Downloads by default), so it outlives the app. */
    @PluginMethod
    public void saveFile(PluginCall call) {
        // Android keeps the call's options in the saved activity state while "Save as" is open, and that
        // state is capped near 1 MB: a real backup crashed the app. Park the text in a private file instead.
        try (OutputStream out = new java.io.FileOutputStream(pendingBackup())) {
            out.write(call.getString("text", "").getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            call.reject("Couldn't prepare the backup file", e);
            return;
        }
        call.getData().remove("text");
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/json");
        intent.putExtra(Intent.EXTRA_TITLE, call.getString("name", "thaili-backup.json"));
        startActivityForResult(call, intent, "saveFileResult");
    }

    @ActivityCallback
    private void saveFileResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        JSObject r = new JSObject();
        Uri uri = result.getData() == null ? null : result.getData().getData();
        java.io.File pending = pendingBackup();
        if (result.getResultCode() != Activity.RESULT_OK || uri == null) { pending.delete(); r.put("saved", false); call.resolve(r); return; }
        try (java.io.InputStream in = new java.io.FileInputStream(pending);
             OutputStream out = getContext().getContentResolver().openOutputStream(uri, "wt")) {
            if (out == null) throw new java.io.IOException("No output stream");
            byte[] buf = new byte[65536];
            for (int n; (n = in.read(buf)) > 0; ) out.write(buf, 0, n);
            r.put("saved", true);
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Couldn't write the backup file", e);
        } finally {
            pending.delete();
        }
    }

    private java.io.File pendingBackup() {
        return new java.io.File(getContext().getCacheDir(), "pending-backup.json");
    }

    /** Notification access has no dialog — it's a system settings page. Android 11+ opens straight to Thaili's switch. */
    @PluginMethod
    public void openNotificationAccess(PluginCall call) {
        Intent i;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            i = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS);
            i.putExtra(Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME,
                new ComponentName(getContext(), ThailiNotificationListener.class).flattenToString());
        } else {
            i = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
        }
        getActivity().startActivity(i);
        call.resolve();
    }

    /** App info page — the only place a user can take a granted permission back. */
    @PluginMethod
    public void openAppSettings(PluginCall call) {
        Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", getContext().getPackageName(), null));
        getActivity().startActivity(i);
        call.resolve();
    }

    /**
     * Fingerprint / face with the phone's PIN, pattern or password as fallback (spec §19).
     * Resolves { ok }; ok is false when cancelled or when the phone has no screen lock at all.
     */
    @PluginMethod
    public void authenticate(PluginCall call) {
        // BIOMETRIC_STRONG | DEVICE_CREDENTIAL is unsupported on Android 9-10.
        int auth = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
            ? BiometricManager.Authenticators.BIOMETRIC_STRONG
            : BiometricManager.Authenticators.BIOMETRIC_WEAK) | BiometricManager.Authenticators.DEVICE_CREDENTIAL;
        FragmentActivity activity = getActivity();
        if (activity == null) {
            authResult(call, false, "not-ready");
            return;
        }
        activity.runOnUiThread(() -> {
            // AndroidX silently returns without a callback after onSaveInstanceState.
            // Always complete that request, so the web Unlock gate can retry on resume.
            if (activity.isFinishing() || activity.isDestroyed()
                    || !activity.getLifecycle().getCurrentState().isAtLeast(Lifecycle.State.RESUMED)
                    || activity.getSupportFragmentManager().isStateSaved()) {
                authResult(call, false, "not-ready");
                return;
            }
            KeyguardManager keyguard = (KeyguardManager) activity.getSystemService(Context.KEYGUARD_SERVICE);
            if (keyguard == null || !keyguard.isDeviceSecure()) {
                authResult(call, false, "no-lock");
                return;
            }
            if (BiometricManager.from(activity).canAuthenticate(auth) != BiometricManager.BIOMETRIC_SUCCESS) {
                authResult(call, false, "unavailable");
                return;
            }
            try {
                BiometricPrompt prompt = new BiometricPrompt(activity,
                    ContextCompat.getMainExecutor(getContext()),
                    new BiometricPrompt.AuthenticationCallback() {
                        @Override
                        public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                            authResult(call, true, null);
                        }

                        @Override
                        public void onAuthenticationError(int code, CharSequence msg) {
                            boolean cancelled = code == BiometricPrompt.ERROR_CANCELED
                                || code == BiometricPrompt.ERROR_USER_CANCELED
                                || code == BiometricPrompt.ERROR_NEGATIVE_BUTTON;
                            authResult(call, false, cancelled ? "cancelled" : msg.toString());
                        }
                        // One bad try leaves the prompt open; only terminal callbacks resolve.
                    });
                prompt.authenticate(new BiometricPrompt.PromptInfo.Builder()
                    .setTitle(call.getString("title", "Unlock Thaili"))
                    .setAllowedAuthenticators(auth)
                    .build());
            } catch (RuntimeException error) {
                authResult(call, false, "unavailable");
            }
        });
    }

    private void authResult(PluginCall call, boolean ok, String reason) {
        JSObject r = new JSObject();
        r.put("ok", ok);
        if (reason != null) r.put("reason", reason);
        call.resolve(r);
    }

    // Messages with an amount and no OTP. Which sender counts and which wording is a transaction
    // is decided in src/lib/sms.ts, so the rules live in one place.
    private static final Pattern AMOUNT = ThailiNotificationListener.AMOUNT;
    private static final Pattern OTP = ThailiNotificationListener.OTP;

    /**
     * What background capture needs from the app: account senders and apps, the transaction
     * wording, the user's rule keywords, and whether to notify. See Capture and sms.ts nativeRules.
     */
    @PluginMethod
    public void setCapture(PluginCall call) {
        call.getData().put("smsSelectionVersion", 1);
        getContext().getSharedPreferences(Capture.PREFS, Context.MODE_PRIVATE)
            .edit().putString("config", call.getData().toString()).apply();
        ThailiNotificationListener.refresh();
        call.resolve();
    }

    // A tapped "Review this transaction" opens the app with thailiOpen; the web layer listens for "open".
    @Override
    public void load() {
        active = new WeakReference<>(this);
        if (getActivity() != null) openFrom(getActivity().getIntent());
    }

    @Override
    protected void handleOnDestroy() {
        if (active.get() == this) active.clear();
        super.handleOnDestroy();
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        openFrom(intent);
    }

    private void openFrom(Intent intent) {
        if (intent == null || intent.getStringExtra("thailiOpen") == null) return;
        JSObject o = new JSObject();
        o.put("open", intent.getStringExtra("thailiOpen"));
        o.put("at", intent.getLongExtra("at", 0L));
        intent.removeExtra("thailiOpen");
        notifyListeners("open", o, true); // kept until the web layer subscribes (cold start)
    }

    /** Kept money notifications posted since sinceMs, as { pkg, body, at }. */
    @PluginMethod
    public void readNotifications(PluginCall call) {
        long since = call.getLong("sinceMs", 0L);
        SharedPreferences p = getContext().getSharedPreferences(ThailiNotificationListener.PREFS, Context.MODE_PRIVATE);
        JSArray out = new JSArray();
        try {
            JSONArray all = ThailiNotificationListener.readLog(p, System.currentTimeMillis());
            for (int i = 0; i < all.length(); i++) {
                JSONObject n = all.getJSONObject(i);
                if (n.optLong("receivedAt", n.getLong("at")) >= since) out.put(n);
            }
        } catch (JSONException ignored) {
            // Unreadable log: nothing to give back; the listener resets it on the next write.
        }
        JSObject r = new JSObject();
        r.put("notifications", out);
        call.resolve(r);
    }

    private List<Pattern> selectedSmsSenders(PluginCall call) {
        List<Pattern> patterns = new ArrayList<>();
        JSONObject senders = call.getData().optJSONObject("senders");
        if (senders != null) for (Iterator<String> keys = senders.keys(); keys.hasNext();) {
            patterns.add(Pattern.compile(senders.optString(keys.next(), "(?!)"), Pattern.CASE_INSENSITIVE));
        }
        return patterns; // Missing/empty selection means no inbox access.
    }

    private SmsInboxReader.Source smsInbox() {
        return new SmsInboxReader.Source() {
            public List<String> senderAddresses(long since) {
                List<String> addresses = new ArrayList<>();
                // Discovery never requests BODY, DATE or message IDs.
                try (Cursor c = getContext().getContentResolver().query(Telephony.Sms.Inbox.CONTENT_URI,
                        new String[] { Telephony.Sms.ADDRESS }, Telephony.Sms.DATE + " >= ?",
                        new String[] { String.valueOf(since) }, null)) {
                    while (c != null && c.moveToNext()) addresses.add(c.getString(0));
                }
                return addresses;
            }

            public List<SmsInboxReader.Message> messages(long since, List<String> addresses) {
                List<SmsInboxReader.Message> messages = new ArrayList<>();
                for (int offset = 0; offset < addresses.size(); offset += 100) {
                    List<String> batch = addresses.subList(offset, Math.min(offset + 100, addresses.size()));
                    String[] args = new String[batch.size() + 1];
                    args[0] = String.valueOf(since);
                    for (int i = 0; i < batch.size(); i++) args[i + 1] = batch.get(i);
                    try (Cursor c = getContext().getContentResolver().query(Telephony.Sms.Inbox.CONTENT_URI,
                            new String[] { Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE, Telephony.Sms._ID },
                            SmsInboxReader.selection(batch.size()), args, Telephony.Sms.DATE + " DESC")) {
                        while (c != null && c.moveToNext()) messages.add(new SmsInboxReader.Message(
                            c.getLong(3), c.getLong(2), c.getString(0), c.getString(1)));
                    }
                }
                messages.sort((a, b) -> Long.compare(b.at, a.at));
                return messages;
            }
        };
    }

    /** Recognized sender names for discovery. No SMS message body is queried. */
    @PluginMethod
    public void readSmsSenders(PluginCall call) {
        JSArray names = new JSArray();
        try {
            if (getPermissionState("sms") == PermissionState.GRANTED) {
                for (String sender : SmsInboxReader.senders(smsInbox(), call.getLong("sinceMs", 0L), selectedSmsSenders(call))) names.put(sender);
            }
            JSObject r = new JSObject(); r.put("senders", names); call.resolve(r);
        } catch (RuntimeException error) { call.reject("Unable to read SMS sender names", error); }
    }

    /** Only selected bank sender bodies are queried. OTP/amount filtering then applies locally. */
    @PluginMethod
    public void readSms(PluginCall call) {
        if (getPermissionState("sms") != PermissionState.GRANTED) {
            call.reject("SMS permission is required to read selected bank messages", "SMS_PERMISSION_REQUIRED");
            return;
        }
        JSArray out = new JSArray();
        try {
            for (SmsInboxReader.Message message : SmsInboxReader.read(smsInbox(), call.getLong("sinceMs", 0L), selectedSmsSenders(call))) {
                String body = message.body;
                if (body == null) continue;
                String normalized = MoneyNotificationText.normalize(body);
                if (!AMOUNT.matcher(normalized).find() || OTP.matcher(normalized).find()) continue;
                JSObject m = new JSObject();
                m.put("id", UUID.nameUUIDFromBytes(("sms|" + message.id + "|" + message.at + "|" + message.sender + "|" + body).getBytes(StandardCharsets.UTF_8)).toString());
                m.put("sender", message.sender);
                m.put("body", body);
                m.put("at", message.at);
                out.put(m);
            }
        } catch (RuntimeException error) { call.reject("Unable to read selected bank messages", error); return; }
        JSObject r = new JSObject();
        r.put("messages", out);
        call.resolve(r);
    }

    /**
     * Tap tick. Samsung One UI mutes WebView / @capacitor/haptics feedback, so drive the
     * vibrator with the system's predefined click (felt whenever system vibration is on).
     */
    @PluginMethod
    public void tap(PluginCall call) {
        Vibrator vib = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
            ? ((VibratorManager) getContext().getSystemService(android.content.Context.VIBRATOR_MANAGER_SERVICE)).getDefaultVibrator()
            : (Vibrator) getContext().getSystemService(android.content.Context.VIBRATOR_SERVICE);
        if (vib != null && vib.hasVibrator() && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            vib.vibrate(VibrationEffect.createPredefined(VibrationEffect.EFFECT_TICK));
        } else {
            getBridge().getWebView().performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP);
        }
        call.resolve();
    }

    /** Discover launchable apps, including banks/wallets whose package names we don't know yet. */
    @PluginMethod
    public void installedApps(PluginCall call) {
        JSArray found = new JSArray();
        PackageManager pm = getContext().getPackageManager();
        Intent launcher = new Intent(Intent.ACTION_MAIN);
        launcher.addCategory(Intent.CATEGORY_LAUNCHER);
        Set<String> seen = new HashSet<>();
        try {
            for (ResolveInfo info : pm.queryIntentActivities(launcher, 0)) {
                if (info.activityInfo == null || !info.activityInfo.applicationInfo.enabled) continue;
                String pkg = info.activityInfo.packageName;
                if (pkg.equals(getContext().getPackageName()) || !seen.add(pkg)) continue;
                CharSequence label = info.activityInfo.applicationInfo.loadLabel(pm);
                JSObject app = new JSObject();
                app.put("pkg", pkg);
                app.put("label", label == null ? pkg : label.toString());
                found.put(app);
            }
        } catch (RuntimeException e) {
            call.reject("Unable to read installed apps", e);
            return;
        }
        JSObject r = new JSObject();
        r.put("apps", found);
        call.resolve(r);
    }
}
