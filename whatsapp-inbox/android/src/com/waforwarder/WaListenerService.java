package com.waforwarder;

import android.app.Notification;
import android.app.Person;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.os.Parcelable;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;

/**
 * Reads WhatsApp notifications and forwards each new message.
 *
 * It only READS the notification. It never opens it, never triggers its
 * actions ("Mark as read" / "Reply") and never dismisses it, so WhatsApp
 * does not send read receipts and the message stays unread on the phone.
 */
public class WaListenerService extends NotificationListenerService {

    private static final List<String> PACKAGES = Arrays.asList("com.whatsapp", "com.whatsapp.w4b");
    private static final String K_SEEN = "seen_ids";
    private static final int MAX_SEEN = 1500;

    private final LinkedHashSet<String> seen = new LinkedHashSet<String>();
    private boolean seenLoaded = false;

    @Override
    public void onListenerConnected() {
        loadSeen();
        Forwarder.flush(this);
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        try {
            handle(sbn);
        } catch (Throwable t) {
            Forwarder.prefs(this).edit().putString(Forwarder.K_LAST, "Read error: " + t).apply();
        }
    }

    private void handle(StatusBarNotification sbn) throws Exception {
        if (sbn == null || !PACKAGES.contains(sbn.getPackageName())) return;
        SharedPreferences p = Forwarder.prefs(this);
        if (!p.getBoolean(Forwarder.K_ENABLED, true)) return;

        Notification n = sbn.getNotification();
        if (n == null) return;
        // Skip the bundle summary ("5 messages from 3 chats") and ongoing ones (calls, backups).
        if ((n.flags & Notification.FLAG_GROUP_SUMMARY) != 0) return;
        if ((n.flags & Notification.FLAG_ONGOING_EVENT) != 0) return;

        Bundle ex = n.extras;
        if (ex == null) return;
        loadSeen();

        String title = str(ex.getCharSequence(Notification.EXTRA_TITLE));
        String convTitle = str(ex.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE));
        boolean isGroup = ex.getBoolean("android.isGroupConversation", false) || !convTitle.isEmpty();
        String chat = !convTitle.isEmpty() ? convTitle : title;
        if (isGroup && !p.getBoolean(Forwarder.K_GROUPS, true)) return;
        if (isExcluded(p.getString(Forwarder.K_EXCLUDE, ""), chat)) return;

        boolean sentAny = false;
        Parcelable[] msgs = ex.getParcelableArray(Notification.EXTRA_MESSAGES);
        if (msgs != null && msgs.length > 0) {
            for (Parcelable item : msgs) {
                if (!(item instanceof Bundle)) continue;
                Bundle m = (Bundle) item;
                String text = str(m.getCharSequence("text"));
                long time = m.getLong("time", sbn.getPostTime());
                String sender = str(m.getCharSequence("sender"));
                if (sender.isEmpty() && Build.VERSION.SDK_INT >= 28) {
                    Object person = m.getParcelable("sender_person");
                    if (person instanceof Person) sender = str(((Person) person).getName());
                }
                // A message without a sender is one the user sent (e.g. a reply from the shade).
                if (sender.isEmpty() || text.isEmpty()) continue;
                if (forward(sbn, chat, sender, text, time, isGroup)) sentAny = true;
            }
        }
        if (msgs == null || msgs.length == 0) {
            String text = str(ex.getCharSequence(Notification.EXTRA_BIG_TEXT));
            if (text.isEmpty()) text = str(ex.getCharSequence(Notification.EXTRA_TEXT));
            if (text.isEmpty() || title.isEmpty()) return;
            if (looksLikeSystemText(title, text)) return;
            String sender = title;
            // Older group format: title is "Group: Sender" or "Sender @ Group".
            if (title.contains(": ") && isGroup) sender = title.substring(title.indexOf(": ") + 2);
            if (forward(sbn, chat, sender, text, sbn.getPostTime(), isGroup)) sentAny = true;
        }
        if (sentAny) saveSeen();
    }

    private boolean forward(StatusBarNotification sbn, String chat, String sender, String text,
                            long time, boolean isGroup) throws Exception {
        String id = Integer.toHexString((chat + "|" + sender + "|" + time + "|" + text).hashCode())
            + "-" + time;
        if (seen.contains(id)) return false;
        seen.add(id);

        JSONObject o = new JSONObject();
        o.put("source", "whatsapp");
        o.put("app", sbn.getPackageName());
        o.put("chat", chat);
        o.put("sender", sender);
        o.put("text", text);
        o.put("is_group", isGroup);
        o.put("timestamp", time);
        o.put("timestamp_iso", iso(time));
        o.put("message_id", id);
        o.put("notification_key", sbn.getKey());
        o.put("device", Build.MANUFACTURER + " " + Build.MODEL);
        Forwarder.enqueue(this, o);
        return true;
    }

    /** Exact, case-insensitive match against the user's list (one chat name per line or comma). */
    private static boolean isExcluded(String list, String chat) {
        if (list == null || list.trim().isEmpty() || chat.isEmpty()) return false;
        String c = chat.trim().toLowerCase();
        for (String item : list.split("[\\n,]")) {
            String t = item.trim().toLowerCase();
            if (!t.isEmpty() && t.equals(c)) return true;
        }
        return false;
    }

    private static boolean looksLikeSystemText(String title, String text) {
        String t = text.toLowerCase();
        return title.equalsIgnoreCase("WhatsApp") && (t.contains("checking for new messages")
            || t.contains("backup")
            // Hebrew-locale WhatsApp system notices ("checking for new messages", "backup")
            || t.contains("\u05d1\u05d5\u05d3\u05e7 \u05d4\u05d5\u05d3\u05e2\u05d5\u05ea \u05d7\u05d3\u05e9\u05d5\u05ea") || t.contains("\u05d2\u05d9\u05d1\u05d5\u05d9"));
    }

    private void loadSeen() {
        if (seenLoaded) return;
        String raw = Forwarder.prefs(this).getString(K_SEEN, "");
        if (raw != null && !raw.isEmpty()) seen.addAll(Arrays.asList(raw.split("\n")));
        seenLoaded = true;
    }

    private void saveSeen() {
        List<String> all = new ArrayList<String>(seen);
        if (all.size() > MAX_SEEN) {
            all = all.subList(all.size() - MAX_SEEN, all.size());
            seen.clear();
            seen.addAll(all);
        }
        StringBuilder sb = new StringBuilder();
        for (String s : all) { if (sb.length() > 0) sb.append('\n'); sb.append(s); }
        Forwarder.prefs(this).edit().putString(K_SEEN, sb.toString()).apply();
    }

    private static String str(CharSequence cs) {
        return cs == null ? "" : cs.toString().trim();
    }

    private static String iso(long t) {
        java.text.SimpleDateFormat f =
            new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX", java.util.Locale.US);
        return f.format(new java.util.Date(t));
    }
}
