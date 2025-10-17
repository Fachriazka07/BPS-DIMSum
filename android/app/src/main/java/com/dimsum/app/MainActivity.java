package com.dimsum.app;

import com.getcapacitor.BridgeActivity;
import android.webkit.WebView;

public class MainActivity extends BridgeActivity {
    @Override
    public void onBackPressed() {
        // Tangani navigasi kembali di dalam WebView; jangan keluar dari aplikasi
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        // Panggil super.onBackPressed() jika tidak ada history WebView
        super.onBackPressed();
    }

    @Override
    public void onResume() {
        super.onResume();
        // Disable zoom (pinch and controls) on Android WebView
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            webView.getSettings().setSupportZoom(false);
            webView.getSettings().setBuiltInZoomControls(false);
            webView.getSettings().setDisplayZoomControls(false);
        }
    }
}
