package com.george.thaili;

import android.Manifest;
import android.app.Notification;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.os.Process;
import android.os.UserHandle;
import android.service.notification.StatusBarNotification;
import androidx.core.app.NotificationManagerCompat;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
@androidx.test.filters.SdkSuppress(minSdkVersion = 33)
public class PrivacyDeviceTest {
    private Context context;
    @Before public void syntheticOnly() throws Exception {
        try (DeviceWeb app = new DeviceWeb()) { app.requireFixtureOrEmpty(); }
        context = InstrumentationRegistry.getInstrumentation().getTargetContext();
    }
    @Test public void releaseIsPrivateWithoutCapturePermissions() throws Exception {
        assertEquals("1.4.1",context.getPackageManager().getPackageInfo(context.getPackageName(),0).versionName);
        assertEquals(0, context.getApplicationInfo().flags & ApplicationInfo.FLAG_ALLOW_BACKUP);
        assertEquals(0, context.getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE);
        assertEquals(PackageManager.PERMISSION_DENIED,context.checkSelfPermission(Manifest.permission.READ_SMS));
        assertEquals(PackageManager.PERMISSION_DENIED,context.checkSelfPermission(Manifest.permission.RECEIVE_SMS));
        try (DeviceWeb app = new DeviceWeb()) {
            assertEquals("SMS_PERMISSION_REQUIRED", app.async("window.Capacitor.nativePromise('Thaili','readSms',{sinceMs:0,senders:{nabil:'^NABIL$'}}).then(()=>{throw new Error('Permission denial was treated as success');},error=>error.code)"));
        }
        assertFalse(NotificationManagerCompat.getEnabledListenerPackages(context).contains(context.getPackageName()));
        try { Class.forName("com.google.firebase.messaging.FirebaseMessaging"); fail("Unused Firebase is still packaged"); }
        catch (ClassNotFoundException expected) { }
    }
    @Test public void selectedSmsUsesAndroidSqliteWithoutReadingTheRealInbox() {
        try (SQLiteDatabase db = SQLiteDatabase.create(null)) {
            db.execSQL("CREATE TABLE sms (_id INTEGER, address TEXT, body TEXT, date INTEGER)");
            db.execSQL("INSERT INTO sms VALUES (1,'NABIL','NPR 100 debited',1000),(2,'PERSON','private fixture',1000),(3,'NIC_ASIA','NPR 200 debited',1000)");
            db.execSQL("INSERT INTO sms VALUES (?,?,?,?)", new Object[]{4,"NABIL' OR 1=1 --","fixture injection",1000});
            List<String> requested = new ArrayList<>(); int[] reads = {0};
            SmsInboxReader.Source source = new SmsInboxReader.Source() {
                public List<String> senderAddresses(long since) {
                    List<String> result = new ArrayList<>();
                    try(Cursor cursor=db.query("sms",new String[]{"address"},"date >= ?",new String[]{String.valueOf(since)},null,null,null)) {
                        while(cursor.moveToNext())result.add(cursor.getString(0));
                    } return result;
                }
                public List<SmsInboxReader.Message> messages(long since,List<String> addresses) {
                    reads[0]++;requested.addAll(addresses);String[] args=new String[addresses.size()+1];args[0]=String.valueOf(since);
                    for(int i=0;i<addresses.size();i++)args[i+1]=addresses.get(i);
                    List<SmsInboxReader.Message> result=new ArrayList<>();
                    try(Cursor cursor=db.query("sms",new String[]{"_id","date","address","body"},SmsInboxReader.selection(addresses.size()),args,null,null,null)) {
                        while(cursor.moveToNext())result.add(new SmsInboxReader.Message(cursor.getLong(0),cursor.getLong(1),cursor.getString(2),cursor.getString(3)));
                    } return result;
                }
            };
            assertEquals(List.of("NABIL"),SmsInboxReader.senders(source,0,List.of(Pattern.compile("^NABIL$"))));
            assertEquals(0,reads[0]);
            assertEquals(1,SmsInboxReader.read(source,0,List.of(Pattern.compile("^NABIL$"))).size());
            assertEquals(List.of("NABIL"),requested);
            assertTrue(SmsInboxReader.read(source,0,List.of()).isEmpty());assertEquals(1,reads[0]);
        }
    }
    static class FixtureListener extends ThailiNotificationListener {
        void attach(Context context) { attachBaseContext(context); }
    }
    @Test public void syntheticNotificationsFilterReplayAndExpireOnTheDevice() throws Exception {
        SharedPreferences prefs=context.getSharedPreferences(Capture.PREFS,Context.MODE_PRIVATE);
        String originalConfig=prefs.getString("config",null), originalLog=prefs.getString("log",null);
        try {
            Context testContext=InstrumentationRegistry.getInstrumentation().getContext();
            JSONObject config=new JSONObject(new String(testContext.getAssets().open("device-capture-rules.json").readAllBytes(),StandardCharsets.UTF_8));
            config.put("smsSelectionVersion",1);
            prefs.edit().putString("config",config.toString()).putString("log","[]").commit();
            FixtureListener listener=new FixtureListener();listener.attach(context);
            long now=System.currentTimeMillis();
            StatusBarNotification first=notification("com.george.thaili.synthetic.bank",1,"NPR 100 has been debited from A/C XXXX4821. Merchant: DEVICE FIXTURE",now);
            listener.onNotificationPosted(first);listener.onNotificationPosted(first);
            listener.onNotificationPosted(notification("com.george.thaili.unselected",2,"NPR 200 has been debited",now));
            listener.onNotificationPosted(notification("com.george.thaili.synthetic.bank",3,"OTP is 123456 for NPR 200",now));
            JSONArray log=ThailiNotificationListener.readLog(prefs,now);
            assertEquals("One matching fixture, no duplicates, OTPs or unrelated apps",1,log.length());
            JSONArray aged=new JSONArray();
            aged.put(new JSONObject().put("at",now-NotificationRetention.WINDOW_MS-1).put("receivedAt",now).put("body","EXPIRED DEVICE FIXTURE"));
            for(int i=0;i<510;i++)aged.put(new JSONObject().put("id","fixture-"+i).put("at",now).put("receivedAt",now));
            prefs.edit().putString("log",aged.toString()).commit();
            JSONArray kept=ThailiNotificationListener.readLog(prefs,now);
            assertEquals(500,kept.length());assertEquals("fixture-10",kept.getJSONObject(0).getString("id"));
            assertEquals(500,new JSONArray(prefs.getString("log","[]")).length());
        } finally {
            SharedPreferences.Editor edit=prefs.edit();
            if(originalConfig==null)edit.remove("config");else edit.putString("config",originalConfig);
            if(originalLog==null)edit.remove("log");else edit.putString("log",originalLog);
            edit.commit();
        }
    }
    private StatusBarNotification notification(String pkg,int id,String body,long now) {
        Notification notification=new Notification.Builder(context,"device-fixture").setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle("Synthetic device test").setContentText(body).setWhen(now).build();
        return new StatusBarNotification(pkg,pkg,id,"device-fixture",Process.myUid(),Process.myPid(),0,notification,UserHandle.getUserHandleForUid(Process.myUid()),now);
    }
}
