package com.george.thaili;

import static org.junit.Assert.*;
import java.util.*;
import java.util.regex.Pattern;
import org.junit.Test;

public class SmsInboxReaderTest {
    static class Inbox implements SmsInboxReader.Source {
        int headers, bodies;
        List<String> requested;
        public List<String> senderAddresses(long since) {
            headers++;
            return Arrays.asList("NABIL", "+9779800000000", "NIC_ASIA", "NABIL", "NABIL' OR 1=1 --", null);
        }
        public List<SmsInboxReader.Message> messages(long since, List<String> addresses) {
            bodies++; requested = addresses;
            return Arrays.asList(new SmsInboxReader.Message(1, since, "NABIL", "NPR 100 debited"));
        }
    }
    @Test public void selectionReadsOnlyMatchingAddresses() {
        Inbox inbox = new Inbox();
        assertEquals(1, SmsInboxReader.read(inbox, 100, Arrays.asList(Pattern.compile("^NABIL$", Pattern.CASE_INSENSITIVE))).size());
        assertEquals(Arrays.asList("NABIL"), inbox.requested);
        assertEquals(1, inbox.headers); assertEquals(1, inbox.bodies);
    }
    @Test public void noSelectionAndNoMatchesNeverReadBodies() {
        Inbox inbox = new Inbox();
        assertTrue(SmsInboxReader.read(inbox, 100, Collections.emptyList()).isEmpty());
        assertEquals(0, inbox.headers); assertEquals(0, inbox.bodies);
        assertTrue(SmsInboxReader.read(inbox, 100, Arrays.asList(Pattern.compile("^PRIME$"))).isEmpty());
        assertEquals(1, inbox.headers); assertEquals(0, inbox.bodies);
    }
    @Test public void discoveryUsesOnlySenderMetadataAndQueriesAreParameterized() {
        Inbox inbox = new Inbox();
        assertEquals(Arrays.asList("NABIL", "NIC_ASIA"), SmsInboxReader.senders(inbox, 100,
            Arrays.asList(Pattern.compile("^NABIL$"), Pattern.compile("^NIC_ASIA$"))));
        assertEquals(0, inbox.bodies);
        assertEquals("date >= ? AND address IN (?,?)", SmsInboxReader.selection(2));
        assertThrows(IllegalArgumentException.class, () -> SmsInboxReader.selection(0));
    }
}
