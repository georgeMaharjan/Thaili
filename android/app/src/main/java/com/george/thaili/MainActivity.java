package com.george.thaili;

import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewParent;
import android.widget.FrameLayout;
import android.widget.ImageView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private View privacyCover;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ThailiPlugin.class); // local plugin: must be registered before super.onCreate
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onPause() {
        showPrivacyCover();
        super.onPause();
    }

    @Override
    public void onResume() {
        super.onResume();
        clearPrivacyCoverWhenVisible();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) removePrivacyCover();
    }

    private void showPrivacyCover() {
        if (privacyCover != null) return;
        View decor = getWindow().getDecorView();
        if (!(decor instanceof ViewGroup)) return;

        FrameLayout cover = new FrameLayout(this);
        cover.setBackgroundColor(Color.rgb(253, 248, 236));
        cover.setClickable(true);
        cover.setFocusable(true);

        FrameLayout badge = new FrameLayout(this);
        GradientDrawable badgeBackground = new GradientDrawable();
        badgeBackground.setColor(Color.rgb(232, 56, 60));
        badgeBackground.setCornerRadius(dp(20));
        badge.setBackground(badgeBackground);

        ImageView mark = new ImageView(this);
        mark.setImageResource(R.drawable.thaili_mark_line);
        mark.setScaleType(ImageView.ScaleType.FIT_CENTER);
        badge.addView(mark, new FrameLayout.LayoutParams(dp(36), dp(50), Gravity.CENTER));
        cover.addView(badge, new FrameLayout.LayoutParams(dp(72), dp(72), Gravity.CENTER));

        ((ViewGroup) decor).addView(cover, new ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        cover.bringToFront();
        privacyCover = cover;
    }

    private void clearPrivacyCoverWhenVisible() {
        View decor = getWindow().getDecorView();
        decor.postOnAnimationDelayed(() -> {
            if (hasWindowFocus()) removePrivacyCover();
        }, 32);
    }

    private void removePrivacyCover() {
        if (privacyCover == null) return;
        View cover = privacyCover;
        privacyCover = null;
        ViewParent parent = cover.getParent();
        if (parent instanceof ViewGroup) ((ViewGroup) parent).removeView(cover);
    }

    private int dp(float value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
