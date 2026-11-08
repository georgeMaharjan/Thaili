package com.george.thaili;

import static org.junit.Assert.*;
import java.util.Arrays;
import org.junit.Test;

public class MoneyNotificationTextTest {
    @Test public void currenciesAndNepaliDigitsReachTheParser() {
        for (String body : Arrays.asList("रु १,२५०.५० भुक्तानी भयो", "You have received NPR. 50.0 from NABIL BANK LTD.", "You received 500 NPR", "NRs. 500 paid", "Amount: 400")) {
            assertTrue(body, MoneyNotificationText.AMOUNT.matcher(MoneyNotificationText.normalize(body)).find());
        }
        assertEquals("Rs 500", MoneyNotificationText.normalize("Rs\u00a0५\u200b००"));
    }
    @Test public void expandedAndInboxNotificationsPreserveIndividualAlerts() {
        assertEquals(Arrays.asList("Payment\nYou paid Rs 500"), MoneyNotificationText.bodies("Payment", "You paid Rs 500", "You paid…", null));
        assertEquals(Arrays.asList("Wallet\nRs 500 paid", "Wallet\nRs 200 received"), MoneyNotificationText.bodies("Wallet", null, "2 alerts", new CharSequence[] {"Rs 500 paid", "Rs 200 received"}));
        assertEquals(Arrays.asList("Credit\nRs 500 received"), MoneyNotificationText.bodies("Credit", "", "Rs 500 received", null));
        assertEquals(Arrays.asList("Wallet\nRs 500 paid", "Wallet\nRs 500 paid"),
            MoneyNotificationText.bodies("Wallet", null, "2 alerts", new CharSequence[] {"Rs 500 paid", "Rs 500 paid"}));
    }
    @Test public void otpIsExcludedButBankFootersAreAllowed() {
        assertTrue(MoneyNotificationText.OTP.matcher("OTP is 123456 for Rs 500").find());
        assertTrue(MoneyNotificationText.OTP.matcher("123456 is your OTP").find());
        assertFalse(MoneyNotificationText.OTP.matcher("Rs 500 paid. Never share OTP with anyone.").find());
    }
}
