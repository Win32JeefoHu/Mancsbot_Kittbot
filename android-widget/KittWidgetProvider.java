package hu.nagydaniel.mancsbot;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.SystemClock;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class KittWidgetProvider extends AppWidgetProvider {
    private static final String BASE = "http://127.0.0.1:3000";
    private static final String ACTION_REFRESH = "hu.nagydaniel.mancsbot.ai.WIDGET_REFRESH";
    private static final long REFRESH_MS = 60_000L;
    private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();

    @Override
    public void onEnabled(Context context) {
        super.onEnabled(context);
        schedule(context);
    }

    @Override
    public void onDisabled(Context context) {
        cancelSchedule(context);
        super.onDisabled(context);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) updateAsync(context, manager, id);
        schedule(context);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        if (ACTION_REFRESH.equals(intent.getAction())) {
            final PendingResult pending = goAsync();
            EXECUTOR.execute(() -> {
                try {
                    AppWidgetManager manager = AppWidgetManager.getInstance(context);
                    int[] ids = manager.getAppWidgetIds(new ComponentName(context, KittWidgetProvider.class));
                    for (int id : ids) updateNow(context, manager, id);
                } finally {
                    pending.finish();
                }
            });
            return;
        }
        super.onReceive(context, intent);
    }

    private static void updateAsync(Context context, AppWidgetManager manager, int id) {
        RemoteViews loading = baseViews(context);
        loading.setTextViewText(R.id.widget_backend, "BACKEND · CONNECTING");
        manager.updateAppWidget(id, loading);
        EXECUTOR.execute(() -> updateNow(context, manager, id));
    }

    private static void updateNow(Context context, AppWidgetManager manager, int id) {
        RemoteViews v = baseViews(context);
        try {
            JSONObject bot = getJson(BASE + "/api/bot/status");
            JSONObject lab = getJson(BASE + "/api/ai-lab/status");

            boolean running = bot.optBoolean("running", false);
            boolean paper = bot.optBoolean("paperTrade", true);
            double balance = bot.optDouble("portfolioValue", 0);
            double pnl = bot.optDouble("pnl", 0);
            double pnlPct = bot.optDouble("pnlPercent", 0);

            JSONObject prices = bot.optJSONObject("lastPrices");
            double btc = prices == null ? 0 : prices.optDouble("BTC-USD", 0);
            double eth = prices == null ? 0 : prices.optDouble("ETH-USD", 0);
            double sol = prices == null ? 0 : prices.optDouble("SOL-USD", 0);

            JSONObject tradeAnalysis = lab.optJSONObject("tradeAnalysis");
            int closed = tradeAnalysis == null ? 0 : tradeAnalysis.optInt("closedTrades", 0);
            Object winRaw = tradeAnalysis == null ? null : tradeAnalysis.opt("winRate");
            String winRate = "—";
            if (winRaw instanceof Number) {
                double w = ((Number) winRaw).doubleValue();
                if (w <= 1.0) w *= 100.0;
                winRate = String.format(Locale.US, "%.1f%%", w);
            }

            v.setTextViewText(R.id.widget_title, running ? "KITT AI · ONLINE" : "KITT AI · STANDBY");
            v.setTextViewText(R.id.widget_mode, paper ? "PAPER MODE" : "LIVE MODE");
            v.setTextViewText(R.id.widget_backend, "● BACKEND CONNECTED");
            v.setTextViewText(R.id.widget_balance, money(balance));
            v.setTextViewText(R.id.widget_pnl, String.format(Locale.US, "%+.2f%%  ·  %s", pnlPct, money(pnl)));
            v.setTextViewText(R.id.widget_btc, btc > 0 ? price(btc) : "—");
            v.setTextViewText(R.id.widget_eth, eth > 0 ? price(eth) : "—");
            v.setTextViewText(R.id.widget_sol, sol > 0 ? price(sol) : "—");
            v.setTextViewText(R.id.widget_ai, "AI LAB · 60s · " + closed + " CLOSED · WR " + winRate);
        } catch (Exception e) {
            v.setTextViewText(R.id.widget_title, "KITT AI · OFFLINE");
            v.setTextViewText(R.id.widget_mode, "BACKEND REQUIRED");
            v.setTextViewText(R.id.widget_backend, "● BACKEND OFFLINE");
            v.setTextViewText(R.id.widget_balance, "$0.00");
            v.setTextViewText(R.id.widget_pnl, "Nyomd meg: FRISSÍTÉS");
            v.setTextViewText(R.id.widget_btc, "—");
            v.setTextViewText(R.id.widget_eth, "—");
            v.setTextViewText(R.id.widget_sol, "—");
            v.setTextViewText(R.id.widget_ai, "AI LAB · WAITING");
        }
        manager.updateAppWidget(id, v);
    }

    private static RemoteViews baseViews(Context context) {
        RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.widget_kitt);

        Intent open = new Intent(context, MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openPi = PendingIntent.getActivity(
                context, 200, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.widget_open, openPi);
        v.setOnClickPendingIntent(R.id.widget_root, openPi);

        Intent refresh = new Intent(context, KittWidgetProvider.class);
        refresh.setAction(ACTION_REFRESH);
        PendingIntent refreshPi = PendingIntent.getBroadcast(
                context, 201, refresh, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.widget_refresh, refreshPi);

        return v;
    }

    private static JSONObject getJson(String urlString) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(urlString).openConnection();
        c.setConnectTimeout(2500);
        c.setReadTimeout(3500);
        c.setRequestMethod("GET");
        c.setRequestProperty("Accept", "application/json");
        int code = c.getResponseCode();
        if (code < 200 || code >= 300) {
            c.disconnect();
            throw new IllegalStateException("HTTP " + code);
        }
        BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream()));
        StringBuilder b = new StringBuilder();
        String line;
        while ((line = r.readLine()) != null) b.append(line);
        r.close();
        c.disconnect();
        return new JSONObject(b.toString());
    }

    private static String money(double n) {
        return String.format(Locale.US, "$%,.2f", n);
    }

    private static String price(double n) {
        return n < 10 ? String.format(Locale.US, "$%.4f", n) : String.format(Locale.US, "$%,.2f", n);
    }

    private static PendingIntent alarmIntent(Context context) {
        Intent i = new Intent(context, KittWidgetProvider.class);
        i.setAction(ACTION_REFRESH);
        return PendingIntent.getBroadcast(
                context, 202, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void schedule(Context context) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        PendingIntent pi = alarmIntent(context);
        am.cancel(pi);
        am.setInexactRepeating(
                AlarmManager.ELAPSED_REALTIME,
                SystemClock.elapsedRealtime() + REFRESH_MS,
                REFRESH_MS,
                pi);
    }

    private static void cancelSchedule(Context context) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(alarmIntent(context));
    }
}
