// @ts-ignore: Deno resolves remote modules at runtime.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore: Deno resolves remote modules at runtime.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const encoder = new TextEncoder();

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function rotateLeft(value: number, amount: number): number {
  return ((value << amount) | (value >>> (32 - amount))) >>> 0;
}

function md5Bytes(message: Uint8Array): Uint8Array {
  const originalLengthBits = message.length * 8;
  const paddedLength = (((message.length + 8) >>> 6) << 4) + 16;
  const words = new Uint32Array(paddedLength);
  for (let i = 0; i < message.length; i++) {
    words[i >> 2] |= message[i] << ((i % 4) * 8);
  }
  words[message.length >> 2] |= 0x80 << ((message.length % 4) * 8);
  words[paddedLength - 2] = originalLengthBits & 0xffffffff;
  words[paddedLength - 1] = Math.floor(originalLengthBits / 0x100000000);
  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;
  const k = new Uint32Array([
    0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a,
    0xa8304613, 0xfd469501, 0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
    0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821, 0xf61e2562, 0xc040b340,
    0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
    0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8,
    0x676f02d9, 0x8d2a4c8a, 0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
    0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70, 0x289b7ec6, 0xeaa127fa,
    0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
    0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92,
    0xffeff47d, 0x85845dd1, 0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
    0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
  ]);
  const s = new Uint8Array([
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5,
    9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11,
    16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10,
    15, 21,
  ]);
  for (let i = 0; i < words.length; i += 16) {
    let aa = a;
    let bb = b;
    let cc = c;
    let dd = d;
    for (let j = 0; j < 64; j++) {
      let f: number;
      let g: number;
      if (j < 16) {
        f = (bb & cc) | (~bb & dd);
        g = j;
      } else if (j < 32) {
        f = (dd & bb) | (~dd & cc);
        g = (5 * j + 1) % 16;
      } else if (j < 48) {
        f = bb ^ cc ^ dd;
        g = (3 * j + 5) % 16;
      } else {
        f = cc ^ (bb | ~dd);
        g = (7 * j) % 16;
      }
      const temp = dd;
      dd = cc;
      cc = bb;
      const sum = (aa + f + k[j] + words[i + g]) >>> 0;
      bb = (bb + rotateLeft(sum, s[j])) >>> 0;
      aa = temp;
    }
    a = (a + aa) >>> 0;
    b = (b + bb) >>> 0;
    c = (c + cc) >>> 0;
    d = (d + dd) >>> 0;
  }
  const out = new Uint8Array(16);
  const state = [a, b, c, d];
  for (let i = 0; i < 4; i++) {
    out[i * 4] = state[i] & 0xff;
    out[i * 4 + 1] = (state[i] >>> 8) & 0xff;
    out[i * 4 + 2] = (state[i] >>> 16) & 0xff;
    out[i * 4 + 3] = (state[i] >>> 24) & 0xff;
  }
  return out;
}

function md5HexFromBytes(message: Uint8Array): string {
  return bytesToHex(md5Bytes(message));
}

function euplatescMac(data: (string | null)[], hexKey: string): string {
  let str = "";
  for (const d of data) {
    if (d === null || d.length === 0) {
      str += "-";
    } else {
      const length = encoder.encode(d).length;
      str += length.toString() + d;
    }
  }
  let keyBytes = hexToBytes(hexKey);
  if (keyBytes.length > 64) {
    keyBytes = md5Bytes(keyBytes);
  }
  const paddedKey = new Uint8Array(64);
  paddedKey.set(keyBytes);
  const ipad = new Uint8Array(64);
  const opad = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    ipad[i] = paddedKey[i] ^ 0x36;
    opad[i] = paddedKey[i] ^ 0x5c;
  }
  const messageBytes = encoder.encode(str);
  const innerData = new Uint8Array(ipad.length + messageBytes.length);
  innerData.set(ipad);
  innerData.set(messageBytes, ipad.length);
  const innerHash = md5Bytes(innerData);
  const outerData = new Uint8Array(opad.length + innerHash.length);
  outerData.set(opad);
  outerData.set(innerHash, opad.length);
  return md5HexFromBytes(outerData);
}

serve(async (req) => {
  try {
    const formData = await req.formData();

    // Standard EuPlatesc IPN fields
    const amount = formData.get("amount")?.toString();
    const curr = formData.get("curr")?.toString();
    const invoiceId = formData.get("invoice_id")?.toString();
    const epId = formData.get("ep_id")?.toString();
    const merch_id = formData.get("merch_id")?.toString();
    const action = formData.get("action")?.toString();
    const message = formData.get("message")?.toString();
    const approval = formData.get("approval")?.toString();
    const timestamp = formData.get("timestamp")?.toString();
    const nonce = formData.get("nonce")?.toString();
    const fpHash = formData.get("fp_hash")?.toString();

    // ExtraData fields
    const extraDonationType = formData
      .get("ExtraData[donation_type]")
      ?.toString();
    const extraAmount = formData.get("ExtraData[amount]")?.toString();
    const extraCampaignId = formData.get("ExtraData[campaign_id]")?.toString();
    const extraDonorName = formData.get("ExtraData[donor_name]")?.toString();
    const extraDonorEmail = formData.get("ExtraData[donor_email]")?.toString();
    const extraDonorPhone = formData.get("ExtraData[donor_phone]")?.toString();

    console.log("IPN received:", { invoiceId, amount, extraDonationType });

    if (!invoiceId || !fpHash) {
      console.error("Missing required fields");
      return new Response("Missing required fields", { status: 400 });
    }

    // Validate HMAC signature
    const euplatescKey = Deno.env.get("EUPLATESC_KEY")!;
    const dataForMac = [
      amount || null,
      curr || null,
      invoiceId || null,
      epId || null,
      merch_id || null,
      action || null,
      message || null,
      approval || null,
      timestamp || null,
      nonce || null,
    ];
    const calculatedHash = euplatescMac(dataForMac, euplatescKey).toUpperCase();
    const receivedHash = fpHash.toUpperCase();

    if (calculatedHash !== receivedHash) {
      console.error("Invalid signature:", {
        received: receivedHash,
        calculated: calculatedHash,
      });
      return new Response("Invalid signature", { status: 403 });
    }

    // Only process successful payments (action = "0")
    if (action !== "0") {
      console.log("Payment ignored: action is not 0", { invoiceId, action });
      return new Response("OK", { status: 200 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine donation type and amount
    const donationType = extraDonationType || "campaign";
    const paymentAmount = extraAmount
      ? parseInt(extraAmount, 10)
      : Math.round(parseFloat(amount || "0"));

    // Build payment record
    const paymentRecord: Record<string, unknown> = {
      amount: paymentAmount,
      payment_ref: invoiceId,
      donation_type: donationType,
    };

    // Link to campaign donations
    if (donationType === "campaign" && extraCampaignId) {
      paymentRecord.campaign_id = extraCampaignId;
    }

    // Add donor info
    if (extraDonorName) paymentRecord.donor_name = extraDonorName;
    if (extraDonorEmail) paymentRecord.donor_email = extraDonorEmail;
    if (extraDonorPhone) paymentRecord.donor_phone = extraDonorPhone;

    // Insert payment (trigger will auto-update campaign.amount_raised)
    const { error: insertError } = await supabase
      .from("payments")
      .insert(paymentRecord);

    if (insertError) {
      console.error("Error inserting payment:", insertError);
      return new Response("Error recording payment", { status: 500 });
    }

    console.log("Payment recorded:", {
      invoiceId,
      donationType,
      amount: paymentAmount,
      campaignId: extraCampaignId || null,
    });

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Error in notify:", error);
    return new Response("Internal server error", { status: 500 });
  }
});
