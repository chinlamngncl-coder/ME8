package com.ubitron.bwccompanion.proof;

import android.accessibilityservice.AccessibilityService;
import android.util.Log;
import android.view.KeyEvent;
import android.view.accessibility.AccessibilityEvent;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class SosInterceptorService extends AccessibilityService {
    private static final String TAG = "BWC_Service";
    private static final String DEVICE_ID = "34020000001329000009";
    private static final String SERVER_BASE_URL = "http://192.168.1.38:3988";
    private static final String TOKEN = "me8-companion-test-token";
    private static final long SOS_DEBOUNCE_MS = 2500L;

    private long lastSosAt = 0L;

    @Override
    protected boolean onKeyEvent(KeyEvent event) {
        int keyCode = event.getKeyCode();
        int action = event.getAction();

        Log.i(TAG, "Key event keyCode=" + keyCodeName(keyCode)
                + " action=" + actionName(action)
                + " repeat=" + event.getRepeatCount());

        if (keyCode == KeyEvent.KEYCODE_F4) {
            if (action == KeyEvent.ACTION_DOWN && event.getRepeatCount() == 0) {
                long now = System.currentTimeMillis();
                if (now - lastSosAt >= SOS_DEBOUNCE_MS) {
                    lastSosAt = now;
                    Log.i(TAG, "SOS F4 intercepted - posting to ME8");
                    sendSosToBackend();
                } else {
                    Log.i(TAG, "SOS F4 ignored by debounce");
                }
            }

            return true;
        }

        if (isMediaProofKey(keyCode)) {
            if (action == KeyEvent.ACTION_DOWN && event.getRepeatCount() == 0) {
                String buttonName = mediaButtonName(keyCode);
                Log.i(TAG, buttonName + " sniffed - posting to ME8 and passing to vendor app");
                sendButtonEventToBackend(keyCodeName(keyCode), buttonName + "_PRESSED");
            }

            return false;
        }

        return super.onKeyEvent(event);
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        // Not used for this proof. Hardware key events arrive through onKeyEvent.
    }

    @Override
    public void onInterrupt() {
        Log.w(TAG, "Accessibility service interrupted");
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        Log.i(TAG, "BWC companion F4 proof service connected");
    }

    private static boolean isMediaProofKey(int keyCode) {
        return keyCode == KeyEvent.KEYCODE_F1
                || keyCode == KeyEvent.KEYCODE_F2
                || keyCode == KeyEvent.KEYCODE_F3
                || keyCode == KeyEvent.KEYCODE_F7;
    }

    private static String mediaButtonName(int keyCode) {
        if (keyCode == KeyEvent.KEYCODE_F1) return "BUTTON_F1";
        if (keyCode == KeyEvent.KEYCODE_F2) return "BUTTON_F2";
        if (keyCode == KeyEvent.KEYCODE_F3) return "BUTTON_F3";
        if (keyCode == KeyEvent.KEYCODE_F7) return "BUTTON_F7";
        return "UNKNOWN_MEDIA_BTN";
    }

    private static String keyCodeName(int keyCode) {
        if (keyCode == KeyEvent.KEYCODE_F1) return "KEYCODE_F1";
        if (keyCode == KeyEvent.KEYCODE_F2) return "KEYCODE_F2";
        if (keyCode == KeyEvent.KEYCODE_F3) return "KEYCODE_F3";
        if (keyCode == KeyEvent.KEYCODE_F4) return "KEYCODE_F4";
        if (keyCode == KeyEvent.KEYCODE_F7) return "KEYCODE_F7";
        return String.valueOf(keyCode);
    }

    private static String actionName(int action) {
        if (action == KeyEvent.ACTION_DOWN) return "ACTION_DOWN";
        if (action == KeyEvent.ACTION_UP) return "ACTION_UP";
        if (action == KeyEvent.ACTION_MULTIPLE) return "ACTION_MULTIPLE";
        return String.valueOf(action);
    }

    private void sendSosToBackend() {
        String body = "{"
                + "\"deviceId\":\"" + jsonEscape(DEVICE_ID) + "\","
                + "\"button\":\"KEYCODE_F4\","
                + "\"action\":\"ACTION_DOWN\","
                + "\"source\":\"android-accessibility\""
                + "}";
        postJsonAsync("/api/bwc-companion/sos-trigger", body, "SOS");
    }

    private void sendButtonEventToBackend(String button, String eventName) {
        String body = "{"
                + "\"deviceId\":\"" + jsonEscape(DEVICE_ID) + "\","
                + "\"button\":\"" + jsonEscape(button) + "\","
                + "\"action\":\"ACTION_DOWN\","
                + "\"event\":\"" + jsonEscape(eventName) + "\","
                + "\"source\":\"android-accessibility\""
                + "}";
        postJsonAsync("/api/bwc-companion/button-event", body, eventName);
    }

    private void postJsonAsync(final String path, final String body, final String label) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                HttpURLConnection conn = null;
                try {
                    URL url = new URL(SERVER_BASE_URL + path);
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setConnectTimeout(2500);
                    conn.setReadTimeout(2500);
                    conn.setDoOutput(true);
                    conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                    conn.setRequestProperty("Authorization", "Bearer " + TOKEN);

                    byte[] bytes = body.getBytes("UTF-8");
                    conn.setFixedLengthStreamingMode(bytes.length);

                    OutputStream os = conn.getOutputStream();
                    os.write(bytes);
                    os.flush();
                    os.close();

                    int code = conn.getResponseCode();
                    Log.i(TAG, label + " POST result HTTP " + code);
                } catch (Exception err) {
                    Log.e(TAG, label + " POST failed: " + err.getMessage(), err);
                } finally {
                    if (conn != null) conn.disconnect();
                }
            }
        }, "bwc-button-post").start();
    }

    private void sendTelemetryToBackend(String eventName) {
        sendButtonEventToBackend(eventName.replace("_PRESSED", "").replace("BUTTON_", "KEYCODE_"), eventName);
    }

    private static String jsonEscape(String value) {
        if (value == null) return "";
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
