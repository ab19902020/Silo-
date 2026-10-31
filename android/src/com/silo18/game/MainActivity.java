package com.silo18.game;

import android.app.Activity;
import android.content.Intent;
import android.content.res.AssetManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.Constructor;
import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.Map;

/**
 * Silo 18 as an Android app: one full-screen WebView running the same files
 * that are published to GitHub Pages, packed into the APK under assets/www.
 *
 * The game is written as ES modules, and a browser will only run a module from
 * an http(s) origin — file:// pages cannot import one another. So the files are
 * served from a made-up https host that never touches the network: every
 * request to it is answered here, straight out of the APK. Anything else (the
 * research links in the About panel) opens in the phone's browser.
 */
public class MainActivity extends Activity {
    static final String HOST = "appassets.androidplatform.net";
    static final String ORIGIN = "https://" + HOST + "/";
    static final Map<String, String> TYPES = new HashMap<String, String>();
    static {
        TYPES.put("html", "text/html"); TYPES.put("js", "text/javascript"); TYPES.put("mjs", "text/javascript");
        TYPES.put("css", "text/css"); TYPES.put("json", "application/json"); TYPES.put("txt", "text/plain");
        TYPES.put("svg", "image/svg+xml"); TYPES.put("png", "image/png"); TYPES.put("jpg", "image/jpeg");
        TYPES.put("jpeg", "image/jpeg"); TYPES.put("webp", "image/webp"); TYPES.put("ktx2", "image/ktx2");
        TYPES.put("mp3", "audio/mpeg"); TYPES.put("wav", "audio/wav"); TYPES.put("ogg", "audio/ogg");
        TYPES.put("m4a", "audio/mp4"); TYPES.put("glb", "model/gltf-binary"); TYPES.put("gltf", "model/gltf+json");
        TYPES.put("bin", "application/octet-stream"); TYPES.put("wasm", "application/wasm");
        TYPES.put("woff2", "font/woff2"); TYPES.put("woff", "font/woff"); TYPES.put("ttf", "font/ttf");
    }

    WebView web;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(0x10, 0x16, 0x14));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        // The page hides controls that make no sense inside the app (its
        // fullscreen button) when it sees this.
        s.setUserAgentString(s.getUserAgentString() + " Silo18App/1.0");
        // The opening music and the cafeteria sound start before the first tap.
        call(s, "setMediaPlaybackRequiresUserGesture", new Class<?>[]{boolean.class}, false);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                return serve(url);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                Uri uri = Uri.parse(url);
                if (HOST.equals(uri.getHost())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) { }
                return true;
            }
        });
        setContentView(web);
        immersive();
        // Always a fresh page: the game keeps its own save in local storage, and
        // a WebView history restored after Android reclaimed the app can come
        // back empty and leave a blank screen.
        web.loadUrl(ORIGIN + "index.html");
    }

    WebResourceResponse serve(String url) {
        Uri uri = Uri.parse(url);
        if (!HOST.equals(uri.getHost())) return null;
        String path = uri.getPath();
        if (path == null || path.equals("") || path.equals("/")) path = "/index.html";
        while (path.startsWith("/")) path = path.substring(1);
        if (path.contains("..")) return missing();
        String type = "application/octet-stream";
        int dot = path.lastIndexOf('.');
        if (dot >= 0) {
            String known = TYPES.get(path.substring(dot + 1).toLowerCase());
            if (known != null) type = known;
        }
        String encoding = type.startsWith("text/") || type.endsWith("json") || type.endsWith("svg+xml") ? "utf-8" : null;
        try {
            InputStream in = getAssets().open("www/" + path, AssetManager.ACCESS_STREAMING);
            return respond(type, encoding, 200, "OK", in);
        } catch (IOException e) {
            return missing();
        }
    }

    WebResourceResponse missing() {
        return respond("text/plain", "utf-8", 404, "Not Found", new ByteArrayInputStream(new byte[0]));
    }

    /** Status codes and headers arrived in API 21; older WebViews get a plain 200. */
    WebResourceResponse respond(String type, String encoding, int status, String reason, InputStream in) {
        if (Build.VERSION.SDK_INT >= 21) {
            try {
                Map<String, String> headers = new HashMap<String, String>();
                headers.put("Access-Control-Allow-Origin", "*");
                headers.put("Cache-Control", "no-cache");
                Constructor<WebResourceResponse> c = WebResourceResponse.class.getConstructor(
                        String.class, String.class, int.class, String.class, Map.class, InputStream.class);
                return c.newInstance(type, encoding, status, reason, headers, in);
            } catch (Exception ignored) { }
        }
        return new WebResourceResponse(type, encoding, in);
    }

    void immersive() {
        // LAYOUT_STABLE | LAYOUT_HIDE_NAVIGATION | LAYOUT_FULLSCREEN |
        // HIDE_NAVIGATION | FULLSCREEN | IMMERSIVE_STICKY
        int flags = 0x100 | 0x200 | 0x400 | 0x2 | 0x4 | (Build.VERSION.SDK_INT >= 19 ? 0x1000 : 0);
        getWindow().getDecorView().setSystemUiVisibility(flags);
        if (Build.VERSION.SDK_INT >= 28) {
            // Draw into the camera cut-out in landscape rather than leaving a black bar.
            try {
                WindowManager.LayoutParams p = getWindow().getAttributes();
                p.getClass().getField("layoutInDisplayCutoutMode").setInt(p, 1);
                getWindow().setAttributes(p);
            } catch (Exception ignored) { }
        }
    }

    static void call(Object target, String name, Class<?>[] types, Object... args) {
        try {
            Method m = target.getClass().getMethod(name, types);
            m.invoke(target, args);
        } catch (Exception ignored) { }
    }

    @Override
    public void onWindowFocusChanged(boolean focus) {
        super.onWindowFocusChanged(focus);
        if (focus) immersive();
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (web != null) { web.onPause(); web.pauseTimers(); }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) { web.resumeTimers(); web.onResume(); }
        immersive();
    }

    @Override
    protected void onDestroy() {
        if (web != null) { web.destroy(); web = null; }
        super.onDestroy();
    }

    /**
     * Back is the game's Escape key: it closes whatever panel is open, and
     * otherwise opens the pause menu. A key event made here would not count as
     * a real key press to the page, and the page closes its panels on the
     * browser's own "cancel" event, which only a real Escape raises — so the
     * same two things are done directly in the page instead.
     */
    static final String ESCAPE =
        "(function(){var d=[].slice.call(document.querySelectorAll('dialog[open]')).pop();" +
        "if(d){var e=new Event('cancel',{cancelable:true});d.dispatchEvent(e);if(!e.defaultPrevented)d.close();return;}" +
        "['keydown','keyup'].forEach(function(t){document.body.dispatchEvent(new KeyboardEvent(t,{key:'Escape',code:'Escape',bubbles:true}));});})()";

    @Override
    public boolean onKeyDown(int code, KeyEvent event) {
        if (code == KeyEvent.KEYCODE_BACK && web != null) {
            if (event.getRepeatCount() == 0) {
                try {
                    Class<?> callback = Class.forName("android.webkit.ValueCallback");
                    web.getClass().getMethod("evaluateJavascript", String.class, callback).invoke(web, ESCAPE, null);
                } catch (Exception e) {
                    web.loadUrl("javascript:" + ESCAPE);
                }
            }
            return true;
        }
        return super.onKeyDown(code, event);
    }
}
