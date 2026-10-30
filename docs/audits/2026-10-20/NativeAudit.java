package com.george.thaili;
public class NativeAudit {
 public static void main(String[] args) {
  String body = "NPR 500 has been debited from A/C XXXX4821. Merchant code 123456.";
  boolean amount = MoneyNotificationText.AMOUNT.matcher(body).find();
  boolean otp = MoneyNotificationText.OTP.matcher(body).find();
  if (!amount || !otp) throw new AssertionError("Expected native false positive");
  System.out.println("NATIVE_MERCHANT_CODE_DROPPED {\"amountRecognized\":true,\"mistakenForOtp\":true}");
 }
}
