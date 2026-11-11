package com.waforwarder;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.ColorStateList;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.RippleDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.provider.Settings;
import android.text.InputType;
import android.text.TextUtils;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.widget.CompoundButton;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONObject;

/**
 * Single screen, built in code (the app ships no layout files).
 * Hero status, setup checklist, preferences, connection details and tools.
 * Nothing here touches WhatsApp or its notifications, so messages stay unread.
 */
public class MainActivity extends Activity {

    // ---- palette (light / dark) ----
    private int cBg, cCard, cInk, cMuted, cLine, cField, cPrimary, cPrimarySoft, cOk, cOkSoft,
        cWarn, cWarnSoft, cRipple;
    private static final int HERO_A = 0xFF0B7A45, HERO_B = 0xFF1DB660;
    /** Where the "Created by" credit links. */
    private static final String CREATOR_URL = "https://www.linkedin.com/in/ben-rotenberg/";

    private EditText urlField;
    private EditText secretField;
    private EditText excludeField;
    private Switch enabledSw;
    private Switch groupsSw;

    private TextView heroPill, heroDetail;
    private TextView statSent, statQueue, statLast;
    private StepRow stepServer, stepAccess, stepBattery;
    private TextView restrictedHint;
    private LinearLayout connFields;
    private TextView connSummary, connToggle;
    private boolean connOpen;
    private boolean binding;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable ticker = new Runnable() {
        @Override public void run() { refreshStatus(); handler.postDelayed(this, 4000); }
    };

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        setupPalette();
        styleWindow();
        SharedPreferences p = Forwarder.prefs(this);

        LinearLayout page = new LinearLayout(this);
        page.setOrientation(LinearLayout.VERTICAL);
        page.setLayoutDirection(View.LAYOUT_DIRECTION_LTR);
        page.setBackgroundColor(cBg);
        page.setClipChildren(false);

        page.addView(buildHero());

        LinearLayout body = new LinearLayout(this);
        body.setOrientation(LinearLayout.VERTICAL);
        body.setPadding(dp(16), 0, dp(16), dp(28));
        body.setClipChildren(false);
        body.setClipToPadding(false);
        page.addView(body);

        // Stats card overlaps the hero a little.
        LinearLayout stats = card();
        LinearLayout.LayoutParams slp = matchWrap();
        slp.topMargin = -dp(28);
        stats.setLayoutParams(slp);
        stats.addView(buildStats());
        body.addView(stats);

        // Setup checklist.
        body.addView(sectionTitle("Setup"));
        LinearLayout steps = card();
        steps.setPadding(0, dp(4), 0, dp(4));
        stepServer = new StepRow(1, "Connect to server", new View.OnClickListener() {
            @Override public void onClick(View v) { setConnOpen(true); urlField.requestFocus(); }
        });
        stepAccess = new StepRow(2, "Notification access", new View.OnClickListener() {
            @Override public void onClick(View v) {
                startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS));
            }
        });
        stepBattery = new StepRow(3, "Run in background", new View.OnClickListener() {
            @Override public void onClick(View v) { askBattery(); }
        });
        steps.addView(stepServer.root);
        steps.addView(divider());
        steps.addView(stepAccess.root);
        restrictedHint = startText();
        restrictedHint.setText("Option greyed out (\"Restricted setting\")? Settings → Apps → WA Forwarder → ⋮ → "
            + "\"Allow restricted settings\", then come back and tap step 2 again.");
        restrictedHint.setTextSize(13);
        restrictedHint.setTextColor(cInk);
        restrictedHint.setLineSpacing(0, 1.15f);
        restrictedHint.setBackground(round(cWarnSoft, dp(10)));
        restrictedHint.setPadding(dp(12), dp(10), dp(12), dp(10));
        LinearLayout.LayoutParams hlp = matchWrap();
        hlp.setMargins(dp(16), 0, dp(16), dp(12));
        restrictedHint.setLayoutParams(hlp);
        steps.addView(restrictedHint);
        steps.addView(divider());
        steps.addView(stepBattery.root);
        body.addView(steps);

        // Preferences.
        body.addView(sectionTitle("Preferences"));
        LinearLayout prefs = card();
        prefs.setPadding(0, dp(4), 0, dp(14));
        enabledSw = new Switch(this);
        groupsSw = new Switch(this);
        prefs.addView(switchRow(enabledSw, "Forwarding on", "Turn off to pause forwarding",
            p.getBoolean(Forwarder.K_ENABLED, true)));
        prefs.addView(divider());
        prefs.addView(switchRow(groupsSw, "Group messages", "Also forward messages sent in groups",
            p.getBoolean(Forwarder.K_GROUPS, true)));
        prefs.addView(divider());
        LinearLayout ex = padded(dp(16), dp(12), dp(16), 0);
        ex.addView(rowTitle("Chats to skip"));
        ex.addView(rowSub("One chat or group name per line, exactly as shown in WhatsApp"));
        excludeField = field("e.g. My Bank\nSchool parents", false);
        excludeField.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_MULTI_LINE);
        excludeField.setSingleLine(false);
        excludeField.setMinLines(3);
        excludeField.setGravity(Gravity.TOP | Gravity.START);
        excludeField.setText(p.getString(Forwarder.K_EXCLUDE, ""));
        ex.addView(excludeField);
        ex.addView(primaryButton("Save", new View.OnClickListener() {
            @Override public void onClick(View v) { save(); toast("Saved ✓"); refreshStatus(); }
        }, true));
        prefs.addView(ex);
        body.addView(prefs);

        // Connection details.
        body.addView(sectionTitle("Connection details"));
        LinearLayout conn = card();
        conn.setPadding(dp(16), dp(14), dp(16), dp(16));
        LinearLayout head = new LinearLayout(this);
        head.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout headText = new LinearLayout(this);
        headText.setOrientation(LinearLayout.VERTICAL);
        headText.addView(rowTitle("Server"));
        connSummary = rowSub("");
        connSummary.setTextDirection(View.TEXT_DIRECTION_LOCALE);
        headText.addView(connSummary);
        head.addView(headText, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        connToggle = textButton("Edit", new View.OnClickListener() {
            @Override public void onClick(View v) { setConnOpen(!connOpen); }
        });
        head.addView(connToggle);
        conn.addView(head);

        connFields = new LinearLayout(this);
        connFields.setOrientation(LinearLayout.VERTICAL);
        TextView tip = startText();
        tip.setText("The easy way: open your personal setup link on this phone and tap "
            + "\"Set up the app automatically\". The details fill in by themselves.");
        tip.setTextSize(13);
        tip.setTextColor(cInk);
        tip.setLineSpacing(0, 1.15f);
        tip.setBackground(round(cPrimarySoft, dp(10)));
        tip.setPadding(dp(12), dp(10), dp(12), dp(10));
        LinearLayout.LayoutParams tlp = matchWrap();
        tlp.topMargin = dp(12);
        connFields.addView(tip, tlp);
        connFields.addView(fieldLabel("Server URL"));
        urlField = field("https://...", true);
        urlField.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        urlField.setText(p.getString(Forwarder.K_URL, ""));
        connFields.addView(urlField);
        connFields.addView(fieldLabel("Personal key"));
        secretField = field("in_...", true);
        secretField.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        secretField.setText(p.getString(Forwarder.K_SECRET, ""));
        connFields.addView(secretField);
        connFields.addView(primaryButton("Save connection", new View.OnClickListener() {
            @Override public void onClick(View v) {
                save(); toast("Saved ✓"); setConnOpen(false); refreshStatus();
            }
        }, true));
        conn.addView(connFields);
        body.addView(conn);
        setConnOpen(TextUtils.isEmpty(p.getString(Forwarder.K_URL, "")));

        // Tools.
        body.addView(sectionTitle("Test & maintenance"));
        LinearLayout tools = card();
        tools.setPadding(dp(16), dp(16), dp(16), dp(16));
        tools.addView(primaryButton("Send test message", new View.OnClickListener() {
            @Override public void onClick(View v) { save(); sendTest(); }
        }, false));
        View gap = new View(this);
        tools.addView(gap, new LinearLayout.LayoutParams(1, dp(10)));
        tools.addView(secondaryButton("Retry stuck messages", new View.OnClickListener() {
            @Override public void onClick(View v) {
                Forwarder.flush(MainActivity.this); toast("Retrying...");
                handler.postDelayed(new Runnable() { @Override public void run() { refreshStatus(); } }, 2500);
            }
        }));
        body.addView(tools);

        TextView foot = new TextView(this);
        foot.setText("🔒  Messages are read from the notification only. They are never opened or marked as read.");
        foot.setTextSize(12);
        foot.setTextColor(cMuted);
        foot.setGravity(Gravity.CENTER);
        foot.setPadding(dp(8), dp(20), dp(8), 0);
        body.addView(foot);
        TextView ver = new TextView(this);
        String vn = versionName();
        ver.setText(TextUtils.isEmpty(vn) ? "WA Forwarder" : "WA Forwarder · version " + vn);
        ver.setTextSize(11);
        ver.setTextColor(cMuted);
        ver.setGravity(Gravity.CENTER);
        ver.setPadding(0, dp(4), 0, 0);
        body.addView(ver);
        TextView credit = new TextView(this);
        credit.setText("Created by Ben Rotenberg");
        credit.setTextSize(13);
        credit.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        credit.setTextColor(cPrimary);
        credit.setGravity(Gravity.CENTER);
        credit.setPadding(dp(12), dp(8), dp(12), dp(8));
        credit.setBackground(ripple(round(Color.TRANSPARENT, dp(16))));
        credit.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) {
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW,
                        Uri.parse(CREATOR_URL)));
                } catch (Exception e) {
                    toast("No browser found");
                }
            }
        });
        LinearLayout.LayoutParams clp = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        clp.gravity = Gravity.CENTER_HORIZONTAL;
        clp.topMargin = dp(2);
        body.addView(credit, clp);

        ScrollView sv = new ScrollView(this);
        sv.setFillViewport(true);
        sv.setVerticalScrollBarEnabled(false);
        sv.setBackgroundColor(cBg);
        sv.addView(page);
        setContentView(sv);
        applyConfigLink(getIntent());
    }

    // ------------------------------------------------------------------ hero & stats

    private View buildHero() {
        LinearLayout hero = new LinearLayout(this);
        hero.setOrientation(LinearLayout.VERTICAL);
        GradientDrawable g = new GradientDrawable(GradientDrawable.Orientation.TL_BR, new int[]{HERO_A, HERO_B});
        g.setCornerRadii(new float[]{0, 0, 0, 0, dp(28), dp(28), dp(28), dp(28)});
        hero.setBackground(g);
        hero.setPadding(dp(20), dp(26) + statusBarHeight(), dp(20), dp(52));

        LinearLayout top = new LinearLayout(this);
        top.setGravity(Gravity.CENTER_VERTICAL);
        FrameLayout logoWrap = new FrameLayout(this);
        logoWrap.setBackground(round(0x33FFFFFF, dp(16)));
        logoWrap.setPadding(dp(4), dp(4), dp(4), dp(4));
        ImageView logo = new ImageView(this);
        int logoId = getResources().getIdentifier("app_logo", "drawable", getPackageName());
        if (logoId != 0) logo.setImageResource(logoId);
        logoWrap.addView(logo, new FrameLayout.LayoutParams(dp(44), dp(44)));
        top.addView(logoWrap);

        LinearLayout titles = new LinearLayout(this);
        titles.setOrientation(LinearLayout.VERTICAL);
        titles.setPadding(dp(14), 0, dp(14), 0);
        TextView t = startText();
        t.setText("WA Forwarder");
        t.setTextSize(22);
        t.setTypeface(Typeface.create("sans-serif-medium", Typeface.BOLD));
        t.setTextColor(Color.WHITE);
        titles.addView(t);
        TextView st = startText();
        st.setText("WhatsApp to Claude, no blue ticks");
        st.setTextSize(14);
        st.setTextColor(0xE6FFFFFF);
        titles.addView(st);
        top.addView(titles, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        hero.addView(top);

        heroPill = new TextView(this);
        heroPill.setTextSize(14);
        heroPill.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        heroPill.setPadding(dp(14), dp(7), dp(14), dp(7));
        LinearLayout.LayoutParams plp = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        plp.topMargin = dp(22);
        plp.gravity = Gravity.START;
        hero.addView(heroPill, plp);

        heroDetail = startText();
        heroDetail.setTextSize(14);
        heroDetail.setTextColor(0xEBFFFFFF);
        heroDetail.setLineSpacing(0, 1.15f);
        heroDetail.setPadding(dp(2), dp(10), dp(2), 0);
        hero.addView(heroDetail);
        return hero;
    }

    private View buildStats() {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        LinearLayout row = new LinearLayout(this);
        row.setPadding(0, dp(16), 0, dp(12));
        statSent = statNumber();
        statQueue = statNumber();
        row.addView(statCell(statSent, "Forwarded"), new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        View sep = new View(this);
        sep.setBackgroundColor(cLine);
        row.addView(sep, new LinearLayout.LayoutParams(dp(1), ViewGroup.LayoutParams.MATCH_PARENT));
        row.addView(statCell(statQueue, "Queued"), new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        box.addView(row);
        box.addView(divider());
        statLast = startText();
        statLast.setTextSize(13);
        statLast.setTextColor(cMuted);
        statLast.setPadding(dp(16), dp(10), dp(16), dp(12));
        statLast.setGravity(Gravity.START);
        box.addView(statLast);
        return box;
    }

    private TextView statNumber() {
        TextView n = new TextView(this);
        n.setTextSize(26);
        n.setTypeface(Typeface.create("sans-serif-medium", Typeface.BOLD));
        n.setTextColor(cInk);
        n.setGravity(Gravity.CENTER);
        return n;
    }

    private View statCell(TextView number, String label) {
        LinearLayout c = new LinearLayout(this);
        c.setOrientation(LinearLayout.VERTICAL);
        c.setGravity(Gravity.CENTER_HORIZONTAL);
        c.addView(number);
        TextView l = new TextView(this);
        l.setText(label);
        l.setTextSize(13);
        l.setTextColor(cMuted);
        l.setGravity(Gravity.CENTER);
        c.addView(l);
        return c;
    }

    // ------------------------------------------------------------------ setup steps

    /** One row of the setup checklist: badge, title/subtitle, action chip. */
    private final class StepRow {
        final LinearLayout root;
        final TextView badge, title, sub, action;
        final String num;

        StepRow(int n, String t, View.OnClickListener onClick) {
            num = String.valueOf(n);
            root = new LinearLayout(MainActivity.this);
            root.setGravity(Gravity.CENTER_VERTICAL);
            root.setPadding(dp(16), dp(14), dp(16), dp(14));
            root.setBackground(ripple(null));
            root.setOnClickListener(onClick);

            badge = new TextView(MainActivity.this);
            badge.setText(String.valueOf(n));
            badge.setGravity(Gravity.CENTER);
            badge.setTextSize(15);
            badge.setTypeface(Typeface.create("sans-serif-medium", Typeface.BOLD));
            root.addView(badge, new LinearLayout.LayoutParams(dp(34), dp(34)));

            LinearLayout texts = new LinearLayout(MainActivity.this);
            texts.setOrientation(LinearLayout.VERTICAL);
            texts.setPadding(dp(14), 0, dp(10), 0);
            title = rowTitle(t);
            sub = rowSub("");
            texts.addView(title);
            texts.addView(sub);
            root.addView(texts, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));

            action = new TextView(MainActivity.this);
            action.setTextSize(13);
            action.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
            action.setPadding(dp(12), dp(6), dp(12), dp(6));
            root.addView(action);
        }

        void set(boolean done, String subText, String actionText) {
            sub.setText(subText);
            if (done) {
                badge.setText("✓");
                badge.setTextColor(Color.WHITE);
                badge.setBackground(oval(cOk));
                action.setVisibility(View.GONE);
            } else {
                badge.setText(num);
                badge.setTextColor(cWarn);
                badge.setBackground(ring(cWarnSoft, cWarn));
                action.setVisibility(View.VISIBLE);
                action.setText(actionText);
                action.setTextColor(Color.WHITE);
                action.setBackground(round(cPrimary, dp(20)));
            }
        }
    }

    // ------------------------------------------------------------------ deep link & status

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        applyConfigLink(intent);
    }

    /** waforwarder://config?url=...&secret=... from the server's setup page. */
    private void applyConfigLink(Intent intent) {
        if (intent == null || intent.getData() == null) return;
        Uri u = intent.getData();
        if (!"waforwarder".equals(u.getScheme()) || !"config".equals(u.getHost())) return;
        String url = u.getQueryParameter("url");
        String secret = u.getQueryParameter("secret");
        if (url == null || !(url.startsWith("https://") || url.startsWith("http://"))) {
            toast("Invalid setup link");
            return;
        }
        urlField.setText(url);
        secretField.setText(secret == null ? "" : secret);
        binding = true;
        enabledSw.setChecked(true);
        binding = false;
        save();
        setConnOpen(false);
        toast("Setup saved ✓");
        refreshStatus();
    }

    @Override
    protected void onResume() {
        super.onResume();
        handler.removeCallbacks(ticker);
        handler.post(ticker);
    }

    @Override
    protected void onPause() {
        handler.removeCallbacks(ticker);
        super.onPause();
    }

    private void refreshStatus() {
        SharedPreferences p = Forwarder.prefs(this);
        String url = p.getString(Forwarder.K_URL, "");
        boolean configured = !TextUtils.isEmpty(url) && !TextUtils.isEmpty(p.getString(Forwarder.K_SECRET, ""));
        boolean access = hasListenerAccess();
        boolean battery = true;
        if (Build.VERSION.SDK_INT >= 23) {
            PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
            battery = pm != null && pm.isIgnoringBatteryOptimizations(getPackageName());
        }
        boolean enabled = p.getBoolean(Forwarder.K_ENABLED, true);
        long sent = p.getLong(Forwarder.K_SENT, 0);
        int queue = Forwarder.queueSize(this);
        String last = p.getString(Forwarder.K_LAST, "");

        stepServer.set(configured, configured ? host(url) : "Open your personal setup link", "Set up");
        stepAccess.set(access, access ? "The app sees new notifications" : "Lets the app read messages from notifications", "Allow");
        stepBattery.set(battery, battery ? "Battery optimization is off for this app" : "So Android doesn't stop it", "Allow");
        restrictedHint.setVisibility(access ? View.GONE : View.VISIBLE);

        int missing = (configured ? 0 : 1) + (access ? 0 : 1) + (battery ? 0 : 1);
        if (!configured || !access) {
            pill("●  Setup incomplete", 0xFFFFF4D6, 0xFF8A5300);
            heroDetail.setText(missing == 1 ? "One more step and you're done." : missing + " quick steps left below.");
        } else if (!enabled) {
            pill("❚❚  Forwarding paused", 0x33FFFFFF, Color.WHITE);
            heroDetail.setText("New messages are not forwarded until you turn it back on.");
        } else {
            pill("●  Active · forwarding", Color.WHITE, 0xFF0B7A45);
            heroDetail.setText(battery ? "Every new message reaches Claude within seconds."
                : "Active. Turn off battery optimization so it isn't stopped.");
        }

        statSent.setText(String.valueOf(sent));
        statQueue.setText(String.valueOf(queue));
        statQueue.setTextColor(queue > 0 ? cWarn : cInk);
        boolean err = last.startsWith("Error") || last.startsWith("Read error") || last.startsWith("No webhook");
        statLast.setText((err ? "⚠  " : (last.length() > 0 ? "✓  " : "")) + "Last status: " + (last.length() > 0 ? last : "nothing sent yet"));
        statLast.setTextColor(err ? cWarn : cMuted);
        connSummary.setText(configured ? host(url) : "Not connected yet");
    }

    private void pill(String text, int bg, int fg) {
        heroPill.setText(text);
        heroPill.setTextColor(fg);
        heroPill.setBackground(round(bg, dp(20)));
    }

    private static String host(String url) {
        try {
            String h = Uri.parse(url).getHost();
            return h == null ? url : h;
        } catch (Exception e) {
            return url;
        }
    }

    private boolean hasListenerAccess() {
        String flat = Settings.Secure.getString(getContentResolver(), "enabled_notification_listeners");
        if (flat == null) return false;
        ComponentName me = new ComponentName(this, WaListenerService.class);
        for (String part : flat.split(":")) {
            ComponentName cn = ComponentName.unflattenFromString(part);
            if (me.equals(cn)) return true;
        }
        return false;
    }

    private void save() {
        Forwarder.prefs(this).edit()
            .putString(Forwarder.K_URL, urlField.getText().toString().trim())
            .putString(Forwarder.K_SECRET, secretField.getText().toString().trim())
            .putBoolean(Forwarder.K_ENABLED, enabledSw.isChecked())
            .putBoolean(Forwarder.K_GROUPS, groupsSw.isChecked())
            .putString(Forwarder.K_EXCLUDE, excludeField.getText().toString())
            .apply();
    }

    private void sendTest() {
        try {
            JSONObject o = new JSONObject();
            o.put("source", "whatsapp");
            o.put("test", true);
            o.put("chat", "Test");
            o.put("sender", "WA Forwarder");
            o.put("text", "Test message from the app");
            o.put("is_group", false);
            o.put("timestamp", System.currentTimeMillis());
            o.put("device", Build.MANUFACTURER + " " + Build.MODEL);
            Forwarder.enqueue(this, o);
            toast("Test message sent");
            handler.postDelayed(new Runnable() {
                @Override public void run() { refreshStatus(); }
            }, 3000);
        } catch (Exception e) {
            toast("Error: " + e.getMessage());
        }
    }

    private void askBattery() {
        try {
            Intent i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            i.setData(Uri.parse("package:" + getPackageName()));
            startActivity(i);
        } catch (Exception e) {
            startActivity(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS));
        }
    }

    private void setConnOpen(boolean open) {
        connOpen = open;
        connFields.setVisibility(open ? View.VISIBLE : View.GONE);
        connToggle.setText(open ? "Close" : "Edit");
    }

    // ------------------------------------------------------------------ theme & widgets

    private void setupPalette() {
        boolean dark = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)
            == Configuration.UI_MODE_NIGHT_YES;
        if (dark) {
            cBg = 0xFF0D1211; cCard = 0xFF171D1C; cInk = 0xFFECF1EF; cMuted = 0xFF97A3A0; cLine = 0xFF26302E;
            cField = 0xFF1F2725; cPrimary = 0xFF1DB660; cPrimarySoft = 0xFF15352A; cOk = 0xFF2BC46F;
            cOkSoft = 0xFF143826; cWarn = 0xFFF5A524; cWarnSoft = 0xFF3A2C12; cRipple = 0x22FFFFFF;
        } else {
            cBg = 0xFFF3F6F5; cCard = 0xFFFFFFFF; cInk = 0xFF13201C; cMuted = 0xFF66736F; cLine = 0xFFE5EAE8;
            cField = 0xFFF5F8F7; cPrimary = 0xFF0E8A4F; cPrimarySoft = 0xFFE5F6EC; cOk = 0xFF12A150;
            cOkSoft = 0xFFE3F6EA; cWarn = 0xFFC26A00; cWarnSoft = 0xFFFFF4E0; cRipple = 0x14000000;
        }
    }

    private void styleWindow() {
        Window w = getWindow();
        w.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        w.setStatusBarColor(Color.TRANSPARENT);
        w.setNavigationBarColor(cBg);
        w.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        w.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
    }

    private int statusBarHeight() {
        int id = getResources().getIdentifier("status_bar_height", "dimen", "android");
        return id > 0 ? getResources().getDimensionPixelSize(id) : dp(24);
    }

    private LinearLayout card() {
        LinearLayout c = new LinearLayout(this);
        c.setOrientation(LinearLayout.VERTICAL);
        GradientDrawable d = round(cCard, dp(18));
        d.setStroke(dp(1), cLine);
        c.setBackground(d);
        c.setElevation(dp(1));
        c.setLayoutParams(matchWrap());
        return c;
    }

    private LinearLayout padded(int l, int t, int r, int bt) {
        LinearLayout v = new LinearLayout(this);
        v.setOrientation(LinearLayout.VERTICAL);
        v.setPadding(l, t, r, bt);
        return v;
    }

    private TextView sectionTitle(String s) {
        TextView v = startText();
        v.setText(s);
        v.setTextSize(14);
        v.setTypeface(Typeface.create("sans-serif-medium", Typeface.BOLD));
        v.setTextColor(cMuted);
        v.setPadding(dp(6), dp(22), dp(6), dp(8));
        return v;
    }

    private TextView startText() {
        TextView v = new TextView(this);
        v.setTextAlignment(View.TEXT_ALIGNMENT_VIEW_START);
        return v;
    }

    private TextView rowTitle(String s) {
        TextView v = startText();
        v.setText(s);
        v.setTextSize(16);
        v.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        v.setTextColor(cInk);
        return v;
    }

    private TextView rowSub(String s) {
        TextView v = startText();
        v.setText(s);
        v.setTextSize(13);
        v.setTextColor(cMuted);
        v.setPadding(0, dp(2), 0, 0);
        return v;
    }

    private TextView fieldLabel(String s) {
        TextView v = startText();
        v.setText(s);
        v.setTextSize(13);
        v.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        v.setTextColor(cMuted);
        v.setPadding(dp(2), dp(14), dp(2), dp(6));
        return v;
    }

    private EditText field(String hint, boolean ltr) {
        EditText e = new EditText(this);
        e.setHint(hint);
        e.setHintTextColor(cMuted);
        e.setTextColor(cInk);
        e.setTextSize(15);
        GradientDrawable d = round(cField, dp(12));
        d.setStroke(dp(1), cLine);
        e.setBackground(d);
        e.setPadding(dp(14), dp(12), dp(14), dp(12));
        if (ltr) e.setTextDirection(View.TEXT_DIRECTION_LTR);
        LinearLayout.LayoutParams lp = matchWrap();
        lp.topMargin = dp(8);
        e.setLayoutParams(lp);
        return e;
    }

    private View switchRow(final Switch sw, String title, String sub, boolean checked) {
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(dp(16), dp(14), dp(16), dp(14));
        row.setBackground(ripple(null));
        LinearLayout texts = new LinearLayout(this);
        texts.setOrientation(LinearLayout.VERTICAL);
        texts.addView(rowTitle(title));
        texts.addView(rowSub(sub));
        row.addView(texts, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        int[][] states = {{android.R.attr.state_checked}, {}};
        sw.setThumbTintList(new ColorStateList(states, new int[]{cPrimary, 0xFFFAFAFA}));
        sw.setTrackTintList(new ColorStateList(states, new int[]{cPrimary, cMuted}));
        sw.setChecked(checked);
        sw.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
            @Override public void onCheckedChanged(CompoundButton b, boolean on) {
                if (binding) return;
                save();
                refreshStatus();
            }
        });
        row.addView(sw);
        row.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) { sw.toggle(); }
        });
        return row;
    }

    private TextView primaryButton(String s, View.OnClickListener l, boolean compact) {
        TextView b = new TextView(this);
        b.setText(s);
        b.setTextSize(compact ? 14 : 16);
        b.setTypeface(Typeface.create("sans-serif-medium", Typeface.BOLD));
        b.setTextColor(Color.WHITE);
        b.setGravity(Gravity.CENTER);
        b.setPadding(dp(18), dp(compact ? 10 : 14), dp(18), dp(compact ? 10 : 14));
        b.setBackground(ripple(round(cPrimary, dp(14))));
        b.setOnClickListener(l);
        b.setClickable(true);
        LinearLayout.LayoutParams lp = compact
            ? new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT)
            : matchWrap();
        lp.topMargin = compact ? dp(12) : 0;
        lp.gravity = Gravity.START;
        b.setLayoutParams(lp);
        return b;
    }

    private TextView secondaryButton(String s, View.OnClickListener l) {
        TextView b = new TextView(this);
        b.setText(s);
        b.setTextSize(15);
        b.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        b.setTextColor(cPrimary);
        b.setGravity(Gravity.CENTER);
        b.setPadding(dp(18), dp(13), dp(18), dp(13));
        GradientDrawable d = round(Color.TRANSPARENT, dp(14));
        d.setStroke(dp(1), cLine);
        b.setBackground(ripple(d));
        b.setOnClickListener(l);
        b.setLayoutParams(matchWrap());
        return b;
    }

    private TextView textButton(String s, View.OnClickListener l) {
        TextView b = new TextView(this);
        b.setText(s);
        b.setTextSize(14);
        b.setTypeface(Typeface.create("sans-serif-medium", Typeface.BOLD));
        b.setTextColor(cPrimary);
        b.setPadding(dp(12), dp(8), dp(12), dp(8));
        b.setBackground(ripple(round(cPrimarySoft, dp(18))));
        b.setOnClickListener(l);
        return b;
    }

    private View divider() {
        View v = new View(this);
        v.setBackgroundColor(cLine);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(1));
        lp.setMargins(dp(16), 0, dp(16), 0);
        v.setLayoutParams(lp);
        return v;
    }

    private GradientDrawable round(int color, int radius) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color);
        d.setCornerRadius(radius);
        return d;
    }

    private GradientDrawable oval(int color) {
        GradientDrawable d = new GradientDrawable();
        d.setShape(GradientDrawable.OVAL);
        d.setColor(color);
        return d;
    }

    private GradientDrawable ring(int fill, int stroke) {
        GradientDrawable d = oval(fill);
        d.setStroke(dp(2), stroke);
        return d;
    }

    private Drawable ripple(Drawable content) {
        Drawable mask = content != null ? content : new android.graphics.drawable.ColorDrawable(Color.WHITE);
        return new RippleDrawable(ColorStateList.valueOf(cRipple), content, mask);
    }

    private LinearLayout.LayoutParams matchWrap() {
        return new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    }

    private String versionName() {
        try {
            String v = getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
            return v == null ? "" : v;
        } catch (Exception e) {
            return "";
        }
    }

    private void toast(String t) {
        Toast.makeText(this, t, Toast.LENGTH_SHORT).show();
    }

    private int dp(int v) {
        return (int) (v * getResources().getDisplayMetrics().density + 0.5f);
    }
}
