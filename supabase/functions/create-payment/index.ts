// @ts-ignore: Deno provides remote module resolution at runtime.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore: Deno provides remote module resolution at runtime.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23,
    4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15,
    21, 6, 10, 15, 21,
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

function formatTimestamp(date: Date): string {
  const pad = (value: number) => value.toString().padStart(2, "0");
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds())
  );
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

// Valid donation types and their fixed amounts
const VALID_TYPES: Record<string, number | null> = {
  family_150: 150,
  family_250: 250,
  family_400: 400,
  campaign: null, // variable amount
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      donation_type,
      amount: requestedAmount,
      donor_name,
      donor_email,
      donor_phone,
      campaign_id,
      ambassador,
    } = await req.json();

    // Validate donation type
    if (!donation_type || !(donation_type in VALID_TYPES)) {
      return new Response(
        JSON.stringify({ error: "Invalid donation type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine amount
    const fixedAmount = VALID_TYPES[donation_type];
    const amount = fixedAmount !== null ? fixedAmount : requestedAmount;

    if (!amount || typeof amount !== "number" || amount < 10) {
      return new Response(
        JSON.stringify({ error: "Invalid amount (minimum 10 lei)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For campaign, validate campaign exists and is active
    let resolvedCampaignId = campaign_id || null;
    if (donation_type === "campaign") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      if (resolvedCampaignId) {
        const { data: campaign, error } = await supabase
          .from("campaigns")
          .select("id, status")
          .eq("id", resolvedCampaignId)
          .single();

        if (error || !campaign || campaign.status !== "active") {
          return new Response(
            JSON.stringify({ error: "Campaign not active" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        // Get first active campaign
        const { data: campaigns } = await supabase
          .from("campaigns")
          .select("id")
          .eq("status", "active")
          .limit(1);

        if (campaigns && campaigns.length > 0) {
          resolvedCampaignId = campaigns[0].id;
        }
      }
    }

    // Generate payment ID
    const paymentId = `SN${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // EuPlatesc payment data
    const merchantId = Deno.env.get("EUPLATESC_MERCHANT_ID")!;
    const euplatescKey = Deno.env.get("EUPLATESC_KEY")!;
    const amountStr = Number(amount).toFixed(2);
    const currency = "RON";
    const orderDescription = donation_type === "campaign"
      ? "Donație Masa Festivă de Paște"
      : `Donație pachet familie ${amount} lei`;
    const timestamp = formatTimestamp(new Date());
    const nonce = md5HexFromBytes(encoder.encode(`${timestamp}-${Math.random()}`));

    const successUrl = Deno.env.get("EUPLATESC_SUCCESS_URL") || null;
    const cancelUrl = Deno.env.get("EUPLATESC_CANCEL_URL") || null;

    // Calculate HMAC
    const dataForMac = [
      amountStr,
      currency,
      paymentId,
      orderDescription,
      merchantId,
      timestamp,
      nonce,
    ];
    const fp_hash = euplatescMac(dataForMac, euplatescKey).toUpperCase();

    // Build EuPlatesc URL
    const euplatescUrl = new URL("https://secure.euplatesc.ro/tdsprocess/tranzactd.php");
    euplatescUrl.searchParams.append("amount", amountStr);
    euplatescUrl.searchParams.append("curr", currency);
    euplatescUrl.searchParams.append("invoice_id", paymentId);
    euplatescUrl.searchParams.append("order_desc", orderDescription);
    euplatescUrl.searchParams.append("merch_id", merchantId);
    euplatescUrl.searchParams.append("timestamp", timestamp);
    euplatescUrl.searchParams.append("nonce", nonce);
    euplatescUrl.searchParams.append("fp_hash", fp_hash);

    // Billing details
    if (donor_name) euplatescUrl.searchParams.append("fname", donor_name);
    if (donor_email) euplatescUrl.searchParams.append("email", donor_email);
    if (donor_phone) euplatescUrl.searchParams.append("phone", donor_phone);

    // Silent URL for IPN
    if (successUrl) {
      euplatescUrl.searchParams.append("ExtraData[silenturl]", successUrl);
    }

    // ExtraData for notify function
    euplatescUrl.searchParams.append("ExtraData[donation_type]", donation_type);
    euplatescUrl.searchParams.append("ExtraData[amount]", amount.toString());
    if (resolvedCampaignId) {
      euplatescUrl.searchParams.append("ExtraData[campaign_id]", resolvedCampaignId);
    }
    if (donor_name) euplatescUrl.searchParams.append("ExtraData[donor_name]", donor_name);
    if (donor_email) euplatescUrl.searchParams.append("ExtraData[donor_email]", donor_email);
    if (donor_phone) euplatescUrl.searchParams.append("ExtraData[donor_phone]", donor_phone);
    if (ambassador) euplatescUrl.searchParams.append("ExtraData[ambassador]", ambassador);

    return new Response(
      JSON.stringify({ redirect: euplatescUrl.toString(), payment_id: paymentId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in create-payment:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
