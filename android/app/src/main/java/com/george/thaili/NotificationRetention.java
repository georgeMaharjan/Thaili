package com.george.thaili;

import java.util.ArrayList;
import java.util.List;
import java.util.function.ToLongFunction;

/** Bounded replay buffer, separate from the user's durable transaction ledger. */
final class NotificationRetention {
    static final int LIMIT = 500;
    static final long WINDOW_MS = 90L * 24 * 60 * 60 * 1000;

    static <T> List<T> keep(List<T> items, long now, ToLongFunction<T> occurred, ToLongFunction<T> received) {
        List<T> recent = new ArrayList<>();
        long cutoff = now - WINDOW_MS;
        for (T item : items) {
            if (occurred.applyAsLong(item) >= cutoff && received.applyAsLong(item) >= cutoff) recent.add(item);
        }
        return new ArrayList<>(recent.subList(Math.max(0, recent.size() - LIMIT), recent.size()));
    }
}
