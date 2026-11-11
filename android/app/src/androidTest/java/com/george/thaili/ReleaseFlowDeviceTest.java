package com.george.thaili;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.os.Environment;
import android.os.SystemClock;
import android.provider.MediaStore;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.FixMethodOrder;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.MethodSorters;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
@androidx.test.filters.SdkSuppress(minSdkVersion = 33)
@FixMethodOrder(MethodSorters.NAME_ASCENDING)
public class ReleaseFlowDeviceTest {
    @Test public void a_legacyLedgerLoadsAndConsentPersists() throws Exception {
        Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
        try(DeviceWeb app=new DeviceWeb()) {
            app.requireFixtureOrEmpty(); app.text("View accounts");
            assertTrue("This flow must run in the isolated test package", context.getPackageName().endsWith(".devicetest"));
            app.text("1,100");
            JSONObject original=app.record().getJSONObject("snapshot");
            assertEquals(DeviceWeb.MARKER,original.getJSONObject("user").getString("name"));
            assertEquals(2,original.getJSONArray("sources").length());assertEquals(1,original.getJSONArray("tx").length());
            assertEquals("device-fixture-legacy",original.getJSONArray("tx").getJSONObject(0).getString("id"));
            assertEquals(100.5,original.getJSONArray("tx").getJSONObject(0).getDouble("amt"),0);
            assertEquals(1,original.getJSONArray("goals").length());
            app.tap("button[aria-label='Profile and settings']");app.tapText("Bank SMS access"); app.text("SMS permission"); app.text("Allow SMS permission above first.");
            app.waitFor("document.querySelector('[role=switch]').getAttribute('aria-checked')==='false'");
            assertEquals(0,Capture.config(context).getJSONObject("senders").length());
            app.tap("button[role=switch]");
            app.waitFor("document.querySelector('[role=switch]').getAttribute('aria-checked')==='true'");
            waitSender(context,true);
            app.reload();app.text("View accounts");
            assertEquals("nabil",app.record().getJSONObject("snapshot").getJSONObject("prefs").getJSONArray("smsBanks").getString(0));
            app.tap("button[aria-label='Profile and settings']");app.tapText("Bank SMS access");app.tap("button[role=switch]");waitSender(context,false);
            app.tap("button[aria-label=Back]");app.text("Thaili transaction alerts");
            app.tapText("Privacy policy");app.text("SMS: choose banks first");
            assertEquals(Boolean.TRUE,app.js("return document.documentElement.scrollWidth<=innerWidth+1;"));
            app.screenshot("device-privacy-en.png");
            app.tap("button[aria-label=Back]");app.text("Bank SMS access");app.tapText("नेपाली");
            app.tapText("गोपनीयता नीति");app.text("SMS: पहिले बैंक छान्नुहोस्");app.screenshot("device-privacy-np.png");
            app.tap("button[aria-label=Back]");app.tapText("EN");app.text("Bank SMS access");
            assertEquals(1,app.record().getJSONObject("snapshot").getJSONArray("tx").length());
        }
    }
    private void waitSender(Context context,boolean enabled) throws Exception {
        long end=SystemClock.elapsedRealtime()+10000;
        while(SystemClock.elapsedRealtime()<end) {
            JSONObject senders=Capture.config(context).optJSONObject("senders");
            if(senders!=null && senders.has("nabil")==enabled)return;
            SystemClock.sleep(100);
        }fail("Native capture did not follow SMS consent");
    }
    @Test public void b_manualExpensePersistsAfterReload() throws Exception {
        try(DeviceWeb app=new DeviceWeb()) {
            app.requireFixtureOrEmpty();app.text("View accounts");
            app.tap("button[aria-label='Quick add']");app.text("New transaction");
            app.value("input[aria-label=Amount]","25.50");app.value("textarea","DEVICE TEST MANUAL");
            app.waitFor("document.querySelector('button[type=submit]').disabled===false");
            app.tap("button[type=submit]");app.text("Expense saved");app.reload();app.text("View accounts");
            JSONArray tx=app.record().getJSONObject("snapshot").getJSONArray("tx");
            assertEquals(2,tx.length());boolean found=false;
            for(int i=0;i<tx.length();i++)if("DEVICE TEST MANUAL".equals(tx.getJSONObject(i).optString("m"))) {
                assertEquals(25.5,tx.getJSONObject(i).getDouble("amt"),0);found=true;
            }assertTrue(found);app.text("1,074");app.screenshot("device-manual-persistence.png");
        }
    }
    @Test public void c_nativeExportAndRestoreRoundTrip() throws Exception {
        Instrumentation instrumentation=InstrumentationRegistry.getInstrumentation();
        Context context=instrumentation.getTargetContext();
        ContentValues values=new ContentValues();values.put(MediaStore.MediaColumns.DISPLAY_NAME,"thaili-device-test-v1.4.json");
        values.put(MediaStore.MediaColumns.MIME_TYPE,"application/json");
        values.put(MediaStore.MediaColumns.RELATIVE_PATH,Environment.DIRECTORY_DOWNLOADS+"/Thaili device test");
        Uri uri=context.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,values);assertNotNull(uri);
        JSONObject before;
        try(DeviceWeb app=new DeviceWeb()) {
            app.requireFixtureOrEmpty();app.text("View accounts");
            before=app.record();
            Instrumentation.ActivityMonitor save=instrumentation.addMonitor(fileIntent(Intent.ACTION_CREATE_DOCUMENT),new Instrumentation.ActivityResult(Activity.RESULT_OK,new Intent().setData(uri)),true);
            try {
                app.tap("button[aria-label='Profile and settings']");app.tapText("Export all data");app.text("All data saved to the backup file");
                assertEquals(1,save.getHits());
            } finally {instrumentation.removeMonitor(save);}
            JSONObject exported;
            try(InputStream in=context.getContentResolver().openInputStream(uri)) { assertNotNull(in);exported=new JSONObject(new String(in.readAllBytes(),StandardCharsets.UTF_8)); }
            assertEquals("thaili",exported.getString("app"));assertEquals(2,exported.getJSONObject("data").getJSONArray("tx").length());
            String data=exported.getJSONObject("data").toString();
            byte[] hash=java.security.MessageDigest.getInstance("SHA-256").digest(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder digest=new StringBuilder();for(byte b:hash)digest.append(String.format(java.util.Locale.ROOT,"%02x",b));
            assertEquals(exported.getString("checksum"),digest.toString());
        }
        // Start a fresh Activity after the native document result before resetting the fixture.
        try(DeviceWeb app=new DeviceWeb()) {
            app.requireFixtureOrEmpty();app.text("View accounts");
            JSONObject empty=new JSONObject(before.toString());
            JSONObject snapshot=empty.getJSONObject("snapshot");
            snapshot.put("user",JSONObject.NULL).put("sources",new JSONArray()).put("tx",new JSONArray()).put("rules",new JSONArray()).put("goals",new JSONArray()).put("roles",new JSONObject()).put("prefs",new JSONObject());
            // Only the marked synthetic ledger is reset. Existing user data is never cleared.
            app.putRecord(empty);app.reload();app.text("Get started");
            Instrumentation.ActivityMonitor pick=instrumentation.addMonitor(fileIntent(Intent.ACTION_GET_CONTENT),new Instrumentation.ActivityResult(Activity.RESULT_OK,new Intent().setData(uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)),true);
            try {
                app.tapText("Restore from a backup");app.text("Restored 2 transactions and 2 accounts");assertEquals(1,pick.getHits());
            } finally {instrumentation.removeMonitor(pick);}
            app.text("View accounts");JSONObject restored=app.record().getJSONObject("snapshot");
            assertEquals(before.getJSONObject("snapshot").getJSONArray("tx").toString(),restored.getJSONArray("tx").toString());
            assertEquals(before.getJSONObject("snapshot").getJSONArray("sources").toString(),restored.getJSONArray("sources").toString());
            assertEquals(1,restored.getJSONArray("goals").length());app.screenshot("device-restored-ledger.png");
        }
    }
    private IntentFilter fileIntent(String action) throws Exception {
        IntentFilter filter = new IntentFilter(action);
        filter.addDataType("*/*"); filter.addCategory(Intent.CATEGORY_OPENABLE); filter.addCategory(Intent.CATEGORY_DEFAULT);
        return filter;
    }

}
