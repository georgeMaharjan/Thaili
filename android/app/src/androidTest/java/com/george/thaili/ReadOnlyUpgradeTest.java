package com.george.thaili;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

/** Compares hashes only: never edits or exports an existing financial ledger. */
@RunWith(AndroidJUnit4.class)
@androidx.test.filters.SdkSuppress(minSdkVersion = 33)
public class ReadOnlyUpgradeTest {
    @Test public void verifyFinancialDataSurvivesUpdate() throws Exception {
        String phase=InstrumentationRegistry.getArguments().getString("upgradePhase");
        org.junit.Assume.assumeTrue("Explicit read-only upgrade phase required", "before".equals(phase)||"after".equals(phase));
        SharedPreferences checks=InstrumentationRegistry.getInstrumentation().getTargetContext().getSharedPreferences("readonly-upgrade-check",Context.MODE_PRIVATE);
        try(DeviceWeb app=new DeviceWeb()) {
            app.text("View accounts");
            JSONObject record=app.record();assertNotNull(record);
            JSONObject snapshot=new JSONObject(record.getJSONObject("snapshot").toString());
            snapshot.remove("prefs");
            JSONArray sources=snapshot.getJSONArray("sources");
            for(int i=0;i<sources.length();i++)sources.getJSONObject(i).remove("packages");
            byte[] bytes=MessageDigest.getInstance("SHA-256").digest(canonical(snapshot).getBytes(StandardCharsets.UTF_8));
            StringBuilder digest=new StringBuilder();for(byte b:bytes)digest.append(String.format(java.util.Locale.ROOT,"%02x",b));
            if("before".equals(phase))assertTrue("Could not persist the private comparison hash",checks.edit().putString("financialDigest",digest.toString()).commit());
            else {
                String baseline=checks.getString("financialDigest",null);
                assertNotNull("Run the before phase before verifying an update",baseline);
                assertEquals("Existing financial data changed during the update",baseline,digest.toString());
            }
            Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
            assertEquals(android.content.pm.PackageManager.PERMISSION_DENIED,context.checkSelfPermission(android.Manifest.permission.READ_SMS));
            assertFalse(androidx.core.app.NotificationManagerCompat.getEnabledListenerPackages(context).contains(context.getPackageName()));
        }
    }
    private String canonical(Object value) throws Exception {
        if(value instanceof JSONObject) {
            JSONObject object=(JSONObject)value;ArrayList<String> keys=new ArrayList<>();for(Iterator<String> it=object.keys();it.hasNext();)keys.add(it.next());Collections.sort(keys);
            ArrayList<String> fields=new ArrayList<>();for(String key:keys)fields.add(JSONObject.quote(key)+":"+canonical(object.get(key)));
            return "{"+String.join(",",fields)+"}";
        }
        if(value instanceof JSONArray) {ArrayList<String> items=new ArrayList<>();JSONArray array=(JSONArray)value;for(int i=0;i<array.length();i++)items.add(canonical(array.get(i)));return "["+String.join(",",items)+"]";}
        return value instanceof String?JSONObject.quote((String)value):String.valueOf(value);
    }
}
