package com.george.thaili;

import android.Manifest;
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
import java.util.UUID;
import java.nio.charset.StandardCharsets;
import java.lang.ref.WeakReference;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
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
        JSObject r = new JSObject();
        if (BiometricManager.from(getContext()).canAuthenticate(auth) != BiometricManager.BIOMETRIC_SUCCESS) {
            r.put("ok", false);
            r.put("reason", "no-lock");
            call.resolve(r);
            return;
        }
        getActivity().runOnUiThread(() -> {
            BiometricPrompt prompt = new BiometricPrompt((FragmentActivity) getActivity(),
                ContextCompat.getMainExecutor(getContext()),
                new BiometricPrompt.AuthenticationCallback() {
                    @Override
                    public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                        r.put("ok", true);
                        call.resolve(r);
                    }

                    @Override
                    public void onAuthenticationError(int code, CharSequence msg) {
                        r.put("ok", false);
                        r.put("reason", msg.toString());
                        call.resolve(r);
                    }
                    // onAuthenticationFailed = one bad try; the prompt stays up, so nothing to resolve.
                });
            prompt.authenticate(new BiometricPrompt.PromptInfo.Builder()
                .setTitle(call.getString("title", "Unlock Thaili"))
                .setAllowedAuthenticators(auth)
                .build());
        });
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
            JSONArray all = new JSONArray(p.getString("log", "[]"));
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

    /** Bank messages received since sinceMs (epoch ms), newest first. Needs the SMS permission. */
    @PluginMethod
    public void readSms(PluginCall call) {
        JSArray out = new JSArray();
        if (getPermissionState("sms") == PermissionState.GRANTED) {
            String since = String.valueOf(call.getLong("sinceMs", 0L));
            String[] cols = { Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE, Telephony.Sms._ID };
            try (Cursor c = getContext().getContentResolver().query(Telephony.Sms.Inbox.CONTENT_URI, cols,
                    Telephony.Sms.DATE + " >= ?", new String[] { since }, Telephony.Sms.DATE + " DESC")) {
                while (c != null && c.moveToNext()) {
                    String body = c.getString(1);
                    if (body == null) continue;
                    String normalized = MoneyNotificationText.normalize(body);
                    if (!AMOUNT.matcher(normalized).find() || OTP.matcher(normalized).find()) continue;
                    JSObject m = new JSObject();
                    m.put("id", UUID.nameUUIDFromBytes(("sms|" + c.getLong(3) + "|" + c.getLong(2) + "|" + c.getString(0) + "|" + body).getBytes(StandardCharsets.UTF_8)).toString());
                    m.put("sender", c.getString(0));
                    m.put("body", body);
                    m.put("at", c.getLong(2));
                    out.put(m);
                }
            }
        }
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
