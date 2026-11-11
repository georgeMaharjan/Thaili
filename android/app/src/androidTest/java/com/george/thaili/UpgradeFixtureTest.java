package com.george.thaili;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import android.content.Context;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
@androidx.test.filters.SdkSuppress(minSdkVersion = 33)
public class UpgradeFixtureTest {
    @Test public void prepareLegacyFixture() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertTrue("Fixture seeding requires the isolated synthetic package", context.getPackageName().endsWith(".devicetest"));
        try (DeviceWeb app = new DeviceWeb()) {
            app.requireFixtureOrEmpty();
            String now = java.time.Instant.now().toString();
            String before = java.time.Instant.now().minusSeconds(3600).toString();
            JSONObject nabil = new JSONObject().put("key","nabil").put("base","Nabil Bank").put("name","Nabil Bank · 4821").put("short","Nabil").put("type","Bank · SMS").put("opening",1000).put("openedAt",before).put("acct","4821").put("dot","red").put("packages",new JSONArray());
            JSONObject cash = new JSONObject().put("key","cash").put("base","Cash").put("name","Cash").put("type","Manual entry").put("opening",200).put("dot","green");
            JSONObject tx = new JSONObject().put("id","device-fixture-legacy").put("src","nabil").put("m","DEVICE TEST TEA").put("amt",100.5).put("dir","debit").put("ch","Manual").put("cat","food").put("rem","Synthetic device test").put("at",now);
            JSONObject snapshot = new JSONObject().put("user",new JSONObject().put("name",DeviceWeb.MARKER).put("phone","+9779800000000").put("createdAt",before))
                .put("sources",new JSONArray().put(nabil).put(cash)).put("roles",new JSONObject().put("nabil","spending").put("cash","spending"))
                .put("tx",new JSONArray().put(tx)).put("rules",new JSONArray()).put("goals",new JSONArray().put(new JSONObject().put("id","device-fixture-goal").put("name","Device test goal").put("target",500)))
                .put("prefs",new JSONObject().put("setupComplete",true).put("appLock",false).put("notifMode","Off").put("lang","EN").put("theme","light").put("syncRaw",true).put("picked",new JSONArray().put("food").put("grocery").put("transport")));
            JSONObject empty = new JSONObject().put("user",JSONObject.NULL).put("sources",new JSONArray()).put("roles",new JSONObject()).put("tx",new JSONArray()).put("rules",new JSONArray()).put("goals",new JSONArray()).put("prefs",new JSONObject());
            JSONObject deleted = new JSONObject().put("sources",new JSONObject()).put("tx",new JSONObject()).put("rules",new JSONObject()).put("goals",new JSONObject());
            app.putRecord(new JSONObject().put("version",1).put("snapshot",snapshot).put("baseline",empty).put("deleted",deleted).put("revision",1).put("owner",JSONObject.NULL).put("uncertain",false));
            app.reload(); app.text("View accounts");
            app.text("1,100");
            app.tapText("View accounts"); app.text("899.50");
            app.tap("button[aria-label=Home]"); app.text("View accounts");
            assertEquals(1,app.record().getJSONObject("snapshot").getJSONArray("tx").length());
            app.screenshot("device-legacy-schema-baseline.png");
        }
    }
}
