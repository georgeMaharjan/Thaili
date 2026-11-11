package com.george.thaili;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.provider.Telephony;
import android.telephony.SmsMessage;
import java.util.LinkedHashMap;
import java.util.Map;
import org.json.JSONObject;

/** A bank SMS arriving while Thaili is closed: hand it to Capture to decide on a review nudge. */
public class SmsReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context ctx, Intent intent) {
        if (!Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(intent.getAction())) return;
        JSONObject c = Capture.config(ctx);
        // A long SMS arrives in parts; join them per sender.
        Map<String, StringBuilder> bodies = new LinkedHashMap<>();
        long at = System.currentTimeMillis();
        for (SmsMessage m : Telephony.Sms.Intents.getMessagesFromIntent(intent)) {
            String sender = m.getDisplayOriginatingAddress();
            if (Capture.bankForSender(c, sender) == null) continue; // Do not request an unselected sender’s body.
            bodies.computeIfAbsent(sender, k -> new StringBuilder()).append(m.getMessageBody());
            at = m.getTimestampMillis();
        }
        for (Map.Entry<String, StringBuilder> e : bodies.entrySet()) {
            if (Capture.bankForSender(c, e.getKey()) != null) {
                ThailiPlugin.moneyNotification(); // Import foreground SMS as promptly as app alerts.
                Capture.onMessage(ctx, c, e.getValue().toString(), at);
            }
        }
    }
}
