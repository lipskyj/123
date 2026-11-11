package com.waforwarder;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Sends message payloads to the configured webhook.
 * Failed sends are kept in a small persistent queue and retried later.
 * Nothing here ever touches WhatsApp itself, so messages stay unread.
 */
public final class Forwarder {
    static final String PREFS = "wa_forwarder";
    static final String K_URL = "webhook_url";
    static final String K_SECRET = "secret";
    static final String K_ENABLED = "enabled";
    static final String K_QUEUE = "queue";
    static final String K_SENT = "sent_count";
    static final String K_LAST = "last_status";
    static final String K_GROUPS = "forward_groups";
    static final String K_EXCLUDE = "exclude_chats";
    private static final int MAX_QUEUE = 500;

    private static final ExecutorService EXEC = Executors.newSingleThreadExecutor();

    private Forwarder() {}

    static SharedPreferences prefs(Context c) {
        return c.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    /** Queue a payload and try to flush the queue on a background thread. */
    static void enqueue(final Context ctx, final JSONObject payload) {
        final Context app = ctx.getApplicationContext();
        EXEC.execute(new Runnable() {
            @Override public void run() {
                synchronized (Forwarder.class) {
                    JSONArray q = readQueue(app);
                    q.put(payload);
                    while (q.length() > MAX_QUEUE) q.remove(0);
                    writeQueue(app, q);
                }
                flushNow(app);
            }
        });
    }

    /** Retry everything in the queue on a background thread. */
    static void flush(final Context ctx) {
        final Context app = ctx.getApplicationContext();
        EXEC.execute(new Runnable() {
            @Override public void run() { flushNow(app); }
        });
    }

    static int queueSize(Context ctx) {
        return readQueue(ctx).length();
    }

    private static void flushNow(Context ctx) {
        SharedPreferences p = prefs(ctx);
        String url = p.getString(K_URL, "");
        if (url == null || url.trim().isEmpty()) {
            p.edit().putString(K_LAST, "No webhook URL set").apply();
            return;
        }
        String secret = p.getString(K_SECRET, "");
        while (true) {
            JSONObject item;
            synchronized (Forwarder.class) {
                JSONArray q = readQueue(ctx);
                if (q.length() == 0) return;
                item = q.optJSONObject(0);
                if (item == null) { q.remove(0); writeQueue(ctx, q); continue; }
            }
            String err = post(url.trim(), secret, item);
            if (err != null) {
                p.edit().putString(K_LAST, "Error: " + err + " (" + now() + ")").apply();
                return; // keep it queued, retry later
            }
            synchronized (Forwarder.class) {
                JSONArray q = readQueue(ctx);
                if (q.length() > 0) q.remove(0);
                writeQueue(ctx, q);
            }
            p.edit()
                .putLong(K_SENT, p.getLong(K_SENT, 0) + 1)
                .putString(K_LAST, "Sent OK (" + now() + ")")
                .apply();
        }
    }

    /** @return null on success, otherwise an error description. */
    static String post(String url, String secret, JSONObject body) {
        HttpURLConnection conn = null;
        try {
            conn = (HttpURLConnection) new URL(url).openConnection();
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(20000);
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            if (secret != null && !secret.isEmpty()) {
                conn.setRequestProperty("X-Webhook-Secret", secret);
            }
            byte[] bytes = body.toString().getBytes("UTF-8");
            conn.setFixedLengthStreamingMode(bytes.length);
            OutputStream os = conn.getOutputStream();
            os.write(bytes);
            os.close();
            int code = conn.getResponseCode();
            InputStream is = code >= 400 ? conn.getErrorStream() : conn.getInputStream();
            if (is != null) {
                byte[] buf = new byte[1024];
                while (is.read(buf) > 0) { /* drain */ }
                is.close();
            }
            if (code >= 200 && code < 300) return null;
            return "HTTP " + code;
        } catch (Exception e) {
            return e.getClass().getSimpleName() + ": " + e.getMessage();
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private static JSONArray readQueue(Context ctx) {
        try {
            return new JSONArray(prefs(ctx).getString(K_QUEUE, "[]"));
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    private static void writeQueue(Context ctx, JSONArray q) {
        prefs(ctx).edit().putString(K_QUEUE, q.toString()).commit();
    }

    private static String now() {
        return new java.text.SimpleDateFormat("dd/MM HH:mm:ss", java.util.Locale.US)
            .format(new java.util.Date());
    }
}
