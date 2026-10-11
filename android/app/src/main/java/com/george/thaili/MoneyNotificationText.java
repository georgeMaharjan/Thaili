package com.george.thaili;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/** Text extraction shared by the listener and unit tests; no Android dependencies. */
final class MoneyNotificationText {
    static final Pattern AMOUNT = Pattern.compile("(?i)(NPR|NRs?\\.?|Rs\\.?|रु\\.?|रू\\.?)\\s*[:=-]?\\s*[0-9,]+|[0-9,]+(?:\\.[0-9]{1,2})?\\s*(NPR|NRs?\\.?|Rs\\.?|रु\\.?|रू\\.?)|\\b(amount|amt)\\s*[:=]\\s*[0-9,]+");
    static final Pattern OTP = Pattern.compile("(?i)(OTP|one[- ]?time password|verification code|passcode|code)\\W{0,8}(is\\W*)?[0-9]{4,8}\\b|\\b[0-9]{4,8}\\s+(is your\\s+)?(OTP|verification code)\\b");

    static String normalize(String body) {
        StringBuilder out = new StringBuilder();
        for (char c : body.toCharArray()) {
            if (c >= '०' && c <= '९') out.append((char) ('0' + c - '०'));
            else if (c == '\u00a0') out.append(' ');
            else if (c != '\u200b' && c != '\u200c' && c != '\u200d' && c != '\ufeff') out.append(c);
        }
        return out.toString();
    }

    static List<String> bodies(CharSequence title, CharSequence big, CharSequence text, CharSequence[] lines) {
        String heading = title == null ? "" : title.toString().trim();
        List<String> bodies = new ArrayList<>();
        if (lines != null && lines.length > 0) {
            for (CharSequence line : lines) {
                if (line != null && !line.toString().trim().isEmpty()) bodies.add(heading + "\n" + line.toString().trim());
            }
        } else {
            CharSequence content = big != null && !big.toString().trim().isEmpty() ? big : text;
            bodies.add((heading + "\n" + (content == null ? "" : content)).trim());
        }
        return new ArrayList<>(bodies);
    }
}
