package com.george.thaili;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.regex.Pattern;

/** Sender metadata is inspected first; only selected sender addresses enter a body query. */
final class SmsInboxReader {
    interface Source {
        List<String> senderAddresses(long since);
        List<Message> messages(long since, List<String> addresses);
    }

    static final class Message {
        final long id, at;
        final String sender, body;
        Message(long id, long at, String sender, String body) {
            this.id = id; this.at = at; this.sender = sender; this.body = body;
        }
    }

    static List<String> senders(Source source, long since, List<Pattern> selected) {
        LinkedHashSet<String> allowed = new LinkedHashSet<>();
        if (!selected.isEmpty()) for (String sender : source.senderAddresses(since)) {
            if (sender != null && selected.stream().anyMatch(p -> p.matcher(sender.trim()).find())) allowed.add(sender);
        }
        return new ArrayList<>(allowed);
    }

    static List<Message> read(Source source, long since, List<Pattern> selected) {
        List<String> addresses = senders(source, since, selected);
        return addresses.isEmpty() ? new ArrayList<>() : source.messages(since, addresses);
    }

    static String selection(int count) {
        if (count < 1 || count > 100) throw new IllegalArgumentException("Invalid sender batch size");
        return "date >= ? AND address IN (" + String.join(",", java.util.Collections.nCopies(count, "?")) + ")";
    }
}
