package com.george.thaili;

import android.content.Context;
import android.graphics.Bitmap;
import android.os.SystemClock;
import android.view.InputDevice;
import android.view.MotionEvent;
import android.webkit.WebView;
import androidx.test.core.app.ActivityScenario;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.File;
import java.io.FileOutputStream;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONArray;
import org.json.JSONObject;
import static org.junit.Assert.*;

/** Device-only harness. Tests refuse to change any ledger not bearing our synthetic marker. */
final class DeviceWeb implements AutoCloseable {
    static final String MARKER = "Thaili Device Test";
    final ActivityScenario<MainActivity> scenario;
    private WebView web;
    private String appUrl;
    DeviceWeb() throws Exception {
        org.junit.Assume.assumeTrue("Explicit synthetic-device opt-in required",
            "true".equals(InstrumentationRegistry.getArguments().getString("thailiSyntheticDeviceTest")));
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertFalse("Unlock the test phone before running UI tests", ((android.app.KeyguardManager)context.getSystemService(Context.KEYGUARD_SERVICE)).isKeyguardLocked());
        scenario = ActivityScenario.launch(MainActivity.class);
        scenario.onActivity(activity -> { activity.getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON); web = activity.getBridge().getWebView(); });
        waitFor("document.readyState === 'complete' && document.querySelector('button') !== null");
        appUrl = (String) js("return location.href;");
    }
    Object js(String script) throws Exception {
        CountDownLatch done = new CountDownLatch(1);
        AtomicReference<String> value = new AtomicReference<>();
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> web.evaluateJavascript(
            "(()=>{" + script + "})()", result -> { value.set(result); done.countDown(); }));
        assertTrue("WebView evaluation timed out", done.await(10, TimeUnit.SECONDS));
        return new JSONArray("[" + value.get() + "]").get(0);
    }
    void waitFor(String expression) throws Exception {
        long end = SystemClock.elapsedRealtime() + 20000;
        while (SystemClock.elapsedRealtime() < end) {
            if (Boolean.TRUE.equals(js("return Boolean(" + expression + ");"))) return;
            SystemClock.sleep(100);
        }
        fail("Timed out waiting for: " + expression);
    }
    Object async(String expression) throws Exception {
        js("window.__thailiDeviceResult=null; Promise.resolve().then(()=>" + expression + ").then(value=>window.__thailiDeviceResult={value},error=>window.__thailiDeviceResult={error:String(error)});");
        waitFor("window.__thailiDeviceResult !== null");
        JSONObject result = (JSONObject) js("return window.__thailiDeviceResult;");
        assertFalse(result.optString("error"), result.has("error"));
        return result.opt("value");
    }
    JSONObject record() throws Exception {
        Object value = async("new Promise((resolve,reject)=>{const r=indexedDB.open('thaili-local',1);r.onsuccess=()=>{const db=r.result;const t=db.transaction('ledger','readonly');const q=t.objectStore('ledger').get('current');t.oncomplete=()=>{resolve(q.result||null);db.close();};t.onerror=()=>reject(t.error);};r.onerror=()=>reject(r.error);})");
        return value instanceof JSONObject ? (JSONObject) value : null;
    }
    void requireFixtureOrEmpty() throws Exception {
        JSONObject record = record();
        if (record == null) return;
        JSONObject snapshot = record.getJSONObject("snapshot");
        JSONObject user = snapshot.optJSONObject("user");
        if (user == null && snapshot.getJSONArray("sources").length() == 0 && snapshot.getJSONArray("tx").length() == 0 && snapshot.getJSONArray("goals").length() == 0) return;
        assertTrue("Refusing to modify a non-fixture ledger (profile=" + (user!=null) + ", accounts=" + snapshot.getJSONArray("sources").length() + ", transactions=" + snapshot.getJSONArray("tx").length() + ")", user != null && MARKER.equals(user.optString("name")));
    }
    void putRecord(JSONObject record) throws Exception {
        assertTrue("Fixture writes require the isolated package", InstrumentationRegistry.getInstrumentation().getTargetContext().getPackageName().endsWith(".devicetest"));
        requireFixtureOrEmpty();
        // Stop the app's JS/store first so a late capture/save cannot overwrite seeded data.
        CountDownLatch loaded = new CountDownLatch(1);
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> {
            android.webkit.WebViewClient original = web.getWebViewClient();
            web.setWebViewClient(new android.webkit.WebViewClient() {
                @Override public void onPageFinished(WebView view, String url) {
                    view.setWebViewClient(original);
                    loaded.countDown();
                }
            });
            web.loadDataWithBaseURL(appUrl, "<!doctype html><button>Fixture bootstrap</button>", "text/html", "UTF-8", null);
        });
        assertTrue("Fixture bootstrap did not finish loading", loaded.await(20, TimeUnit.SECONDS));
        waitFor("document.body && document.body.innerText.includes('Fixture bootstrap')");
        requireFixtureOrEmpty();
        async("new Promise((resolve,reject)=>{const r=indexedDB.open('thaili-local',1);r.onsuccess=()=>{const db=r.result;const t=db.transaction('ledger','readwrite');t.objectStore('ledger').put(" + record.toString() + ",'current');t.oncomplete=()=>{resolve(true);db.close();};t.onerror=()=>reject(t.error);};r.onerror=()=>reject(r.error);})");
    }
    void reload() throws Exception {
        String token = "reload-" + SystemClock.elapsedRealtime();
        js("window.__thailiReloadToken=" + JSONObject.quote(token) + ";");
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> web.loadUrl(appUrl));
        waitFor("window.__thailiReloadToken!==" + JSONObject.quote(token) + " && document.readyState === 'complete' && document.querySelector('button') !== null");
    }
    void text(String text) throws Exception { waitFor("document.body.innerText.includes(" + JSONObject.quote(text) + ")"); }
    void tap(String selector) throws Exception {
        waitFor("document.querySelector(" + JSONObject.quote(selector) + ") !== null");
        tapExpression("document.querySelector(" + JSONObject.quote(selector) + ")");
    }
    void tapText(String text) throws Exception {
        String finder = "[...document.querySelectorAll('button,label')].find(e=>(e.innerText||'').trim().startsWith(" + JSONObject.quote(text) + "))";
        waitFor(finder + " !== undefined"); tapExpression(finder);
    }
    private void tapExpression(String finder) throws Exception {
        js("(" + finder + ").scrollIntoView({block:'center'});");
        SystemClock.sleep(250);
        JSONObject box = (JSONObject) js("const r=(" + finder + ").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,width:innerWidth};");
        int[] position = new int[2];
        AtomicReference<Float> scale = new AtomicReference<>();
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> { web.getLocationOnScreen(position); scale.set((float)(web.getWidth()/box.optDouble("width"))); });
        float x = position[0] + (float)box.getDouble("x") * scale.get();
        float y = position[1] + (float)box.getDouble("y") * scale.get();
        AtomicReference<Boolean> focused = new AtomicReference<>();
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> focused.set(web.hasWindowFocus()));
        assertEquals("Leave the isolated test app in the foreground", Boolean.TRUE, focused.get());
        long at = SystemClock.uptimeMillis();
        MotionEvent down = MotionEvent.obtain(at,at,MotionEvent.ACTION_DOWN,x,y,0);
        MotionEvent up = MotionEvent.obtain(at,at+60,MotionEvent.ACTION_UP,x,y,0);
        down.setSource(InputDevice.SOURCE_TOUCHSCREEN); up.setSource(InputDevice.SOURCE_TOUCHSCREEN);
        try { InstrumentationRegistry.getInstrumentation().sendPointerSync(down); InstrumentationRegistry.getInstrumentation().sendPointerSync(up); }
        finally { down.recycle(); up.recycle(); }
    }
    void value(String selector, String value) throws Exception {
        String q = JSONObject.quote(selector), v = JSONObject.quote(value);
        assertEquals(Boolean.TRUE, js("const e=document.querySelector("+q+");if(!e)return false;const proto=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,"+v+");e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return true;"));
    }
    void screenshot(String name) throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertFalse("Do not capture the lock screen", ((android.app.KeyguardManager)context.getSystemService(Context.KEYGUARD_SERVICE)).isKeyguardLocked());
        AtomicReference<Boolean> focused = new AtomicReference<>();
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> focused.set(web.hasWindowFocus()));
        assertEquals("Only capture the test app", Boolean.TRUE, focused.get());
        Bitmap bitmap = InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();
        assertNotNull(bitmap);
        try (FileOutputStream out = new FileOutputStream(new File(context.getExternalFilesDir(null), name))) { bitmap.compress(Bitmap.CompressFormat.PNG,100,out); }
        bitmap.recycle();
    }
    @Override public void close() { scenario.close(); }
}
