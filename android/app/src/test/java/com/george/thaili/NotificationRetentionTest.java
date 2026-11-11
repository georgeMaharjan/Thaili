package com.george.thaili;

import static org.junit.Assert.*;
import java.util.ArrayList;
import java.util.List;
import org.junit.Test;

public class NotificationRetentionTest {
    @Test public void expiresOldOccurrencesAndReceiptsButKeepsNinetyDayBoundary() {
        long now = NotificationRetention.WINDOW_MS + 1000;
        List<long[]> records = List.of(new long[] {999, now}, new long[] {now, 999}, new long[] {1000, 1000}, new long[] {now, now});
        List<long[]> kept = NotificationRetention.keep(records, now, r -> r[0], r -> r[1]);
        assertEquals(2, kept.size());
        assertSame(records.get(2), kept.get(0));
        assertSame(records.get(3), kept.get(1));
    }

    @Test public void boundsReplayBufferWithoutChangingOrderOrDeletingLedgerData() {
        List<Long> records = new ArrayList<>();
        for (long i = 0; i < 600; i++) records.add(i);
        List<Long> kept = NotificationRetention.keep(records, 600, r -> r, r -> r);
        assertEquals(500, kept.size());
        assertEquals(Long.valueOf(100), kept.get(0));
        assertEquals(Long.valueOf(599), kept.get(499));
        assertEquals(600, records.size());
    }
}
