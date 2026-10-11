/** Recognition catalog, not a promise that every app/version emits readable alerts.
 * Only configured SMS sender patterns are enabled; label-only apps use their discovered package. */
export type Institution = { key: string; name: string; kind: "bank" | "wallet"; labels: RegExp; packages?: string[]; sms?: RegExp };
export const INSTITUTIONS: Institution[] = [
  { key: "esewa", name: "eSewa", kind: "wallet", labels: /\be-?sewa\b/i, packages: ["com.f1soft.esewa"] },
  { key: "khalti", name: "Khalti", kind: "wallet", labels: /\bkhalti\b/i, packages: ["com.khalti"], sms: /^KHALTI$/i },
  { key: "ime", name: "IME Pay", kind: "wallet", labels: /\bime\s*pay\b/i, packages: ["com.swifttechnology.imepay"] },
  { key: "fonepay", name: "Fonepay", kind: "wallet", labels: /\bfonepay\b/i },
  { key: "connectips", name: "connectIPS", kind: "wallet", labels: /\bconnect\s*ips\b/i },
  { key: "moru", name: "Moru", kind: "wallet", labels: /\bmoruu?\b/i },
  { key: "namastepay", name: "Namaste Pay", kind: "wallet", labels: /\bnamaste\s*pay\b/i },
  { key: "prabhupay", name: "Prabhu Pay", kind: "wallet", labels: /\bprabhu\s*pay\b/i },
  { key: "cellpay", name: "CellPay", kind: "wallet", labels: /\bcell\s*pay\b/i },
  { key: "qrpay", name: "QR Pay", kind: "wallet", labels: /\bqr\s*pay\b/i },
  { key: "paypal", name: "PayPal", kind: "wallet", labels: /\bpaypal\b/i },
  { key: "venmo", name: "Venmo", kind: "wallet", labels: /\bvenmo\b/i },
  { key: "cashapp", name: "Cash App", kind: "wallet", labels: /\bcash\s*app\b/i },
  { key: "googlepay", name: "Google Pay", kind: "wallet", labels: /\bgoogle\s*pay\b/i },
  { key: "samsungpay", name: "Samsung Pay", kind: "wallet", labels: /\bsamsung\s*pay\b/i },
  { key: "nic", name: "NIC Asia", kind: "bank", labels: /NIC\s*ASIA|(?<![A-Z])NICA?(?![A-Z])/i,
    packages: ["com.f1soft.nicasiamobilebanking"], sms: /^NICA?[_-]?(ALERT|ASIA)?$/i },
  { key: "nabil", name: "Nabil Bank", kind: "bank", labels: /\bnabil\b/i,
    packages: ["com.f1soft.nabilmbank"], sms: /^NABIL[_-]?(ALERT)?$/i },
  { key: "scb", name: "Standard Chartered", kind: "bank", labels: /\bstandard\s*chartered\b|\bsc\s*mobile\s*nepal\b|\bSCB\b|\bSTANCHART\b/i,
    packages: ["com.sc.mobilebanking.np"], sms: /^(SCB?[_-]?ALERT|STANCHART|SCBNL)$/i },
  { key: "everest", name: "Everest Bank", kind: "bank", labels: /\beverest\b|\bebl\b/i,
    packages: ["com.everestbankltd.mbanking"], sms: /^EBL[_-]?ALERT$/i },
  { key: "gibl", name: "Global IME", kind: "bank", labels: /\bglobal\s*(?:ime|smart)\b|\bGIBL\b/i,
    packages: ["com.swifttechnology.globalsmart"], sms: /^GIBL[_-]?(ALERT)?$/i },
  { key: "prabhu", name: "Prabhu Bank", kind: "bank", labels: /\bprabhu\b/i },
  { key: "kumari", name: "Kumari Bank", kind: "bank", labels: /\bkumari\b/i },
  { key: "siddhartha", name: "Siddhartha Bank", kind: "bank", labels: /\bsiddhartha\b/i },
  { key: "sanima", name: "Sanima Bank", kind: "bank", labels: /\bsanima\b/i },
  { key: "machhapuchchhre", name: "Machhapuchchhre Bank", kind: "bank", labels: /\bmachhapuchchhre\b/i },
  { key: "laxmisunrise", name: "Laxmi Sunrise Bank", kind: "bank", labels: /\b(?:laxmi|sunrise)\b/i },
  { key: "himalayan", name: "Himalayan Bank", kind: "bank", labels: /\bhimalayan\b/i },
  { key: "nmb", name: "NMB Bank", kind: "bank", labels: /\bnmb\b/i },
  { key: "nimb", name: "Nepal Investment Mega Bank", kind: "bank", labels: /\bnimb\b|\bnibl\b|\bnepal\s*investment\b/i },
  { key: "nbl", name: "Nepal Bank", kind: "bank", labels: /\bnbl\b|\bnepal\s+bank\b/i },
  { key: "adbl", name: "Agricultural Development Bank", kind: "bank", labels: /\badbl\b|\bagricultur(?:al|e)\s*development\b/i },
  { key: "rbb", name: "Rastriya Banijya Bank", kind: "bank", labels: /\brbb\b|\brastriya\s*banijya\b/i },
  { key: "sbi", name: "Nepal SBI Bank", kind: "bank", labels: /\bsbi\b/i },
  { key: "shangrila", name: "Shangrila Development Bank", kind: "bank", labels: /\bs[ah]ngri?la\b|\bshangrila\b/i },
  { key: "muktinath", name: "Muktinath Development Bank", kind: "bank", labels: /\bmuktinath\b/i },
  { key: "garima", name: "Garima Bikas Bank", kind: "bank", labels: /\bgarima\b/i },
  { key: "jyoti", name: "Jyoti Bikas Bank", kind: "bank", labels: /\bjyoti\b/i },
  { key: "mahalaxmi", name: "Mahalaxmi Bikas Bank", kind: "bank", labels: /\bmahalaxmi\b/i },
  { key: "kamanasewa", name: "Kamana Sewa Bikas Bank", kind: "bank", labels: /\bkamana\s*sewa\b/i },
  { key: "shineresunga", name: "Shine Resunga Development Bank", kind: "bank", labels: /\bshine\s*resunga\b/i },
];

export const institutionForName = (name: string) => INSTITUTIONS.find(i => i.labels.test(name));
export function institutionForAccount(account: { key: string; base?: string; name?: string; type?: string }) {
  if (/manual/i.test(account.type || "")) return undefined;
  return INSTITUTIONS.find(i => i.key === account.key) || institutionForName(account.base || account.name || "");
}
