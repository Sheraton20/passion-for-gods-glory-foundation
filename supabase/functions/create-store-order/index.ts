import { createClient } from "npm:@supabase/supabase-js@2.57.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });
const clean = (v: unknown, max = 500) => String(v ?? "").trim().slice(0, max);
const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 160;
const uuidOk = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply(405, { error: "Use POST to place an order." });
  const length = Number(req.headers.get("content-length") || 0);
  if (length > 30000) return reply(413, { error: "Order request is too large." });

  const url = Deno.env.get("SUPABASE_URL");
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY");
  if (!url || !secret) {
    console.error("Missing Supabase server environment configuration.");
    return reply(500, { error: "Order service is not configured yet. Please try again later." });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return reply(400, { error: "The order details could not be read." }); }
  const customer_name = clean(body.customer_name, 120);
  const email = clean(body.email, 160).toLowerCase();
  const phone = clean(body.phone, 30);
  const country = clean(body.country, 100);
  const town = clean(body.town, 120);
  const address_line1 = clean(body.address_line1, 180);
  const shipping_method = clean(body.shipping_method, 40);
  const currencyInput = clean(body.currency, 3).toUpperCase();
  const items = Array.isArray(body.items) ? body.items : [];
  const idempotency_key = clean(body.request_id, 80);
  if (customer_name.length < 2 || !emailOk(email) || phone.length < 5 || country.length < 2 ||
      town.length < 1 || address_line1.length < 3 || !idempotency_key ||
      !body.address_confirmed || !body.shipping_quote_acknowledged) {
    return reply(400, { error: "Please check the required recipient, address and shipping-confirmation fields." });
  }
  if (!["local_delivery", "international_shipping", "pickup"].includes(shipping_method)) {
    return reply(400, { error: "Choose a valid shipping method." });
  }
  if ((country.toLowerCase() === "uganda" && shipping_method === "international_shipping") ||
      (country.toLowerCase() !== "uganda" && shipping_method !== "international_shipping")) {
    return reply(400, { error: "The shipping method must match the selected destination." });
  }
  if (shipping_method === "international_shipping" && !body.customs_acknowledged) {
    return reply(400, { error: "Please acknowledge that import duties and fees may apply." });
  }
  if (items.length < 1 || items.length > 30) return reply(400, { error: "Your basket must contain between 1 and 30 product lines." });
  const quantities = new Map<string, number>();
  for (const raw of items) {
    const item = raw as Record<string, unknown>;
    const id = clean(item.product_id, 50);
    const qty = Number(item.quantity);
    if (!uuidOk(id) || !Number.isInteger(qty) || qty < 1 || qty > 20) return reply(400, { error: "One or more basket items are invalid." });
    quantities.set(id, (quantities.get(id) || 0) + qty);
  }
  if ([...quantities.values()].some(qty => qty > 20)) return reply(400, { error: "A product quantity cannot exceed 20." });

  const sb = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const prior = await sb.from("store_orders").select("id,order_reference,fulfillment_status,payment_status,items_subtotal,currency").eq("idempotency_key", idempotency_key).maybeSingle();
  if (prior.data) return reply(200, { ok: true, order_reference: prior.data.order_reference, status: prior.data.fulfillment_status, payment_status: prior.data.payment_status, items_subtotal: prior.data.items_subtotal, currency: prior.data.currency, repeated_request: true });

  const productIds = [...quantities.keys()];
  const { data: products, error: productError } = await sb.from("store_products")
    .select("id,name,slug,price,currency,image_urls,published")
    .in("id", productIds).eq("published", true);
  if (productError) {
    console.error("Product validation failed:", productError.message);
    return reply(503, { error: "We could not verify the products. Please try again shortly." });
  }
  if (!products || products.length !== productIds.length) return reply(400, { error: "A product in your basket is no longer available. Refresh the store and try again." });
  const productCurrency = String(products[0].currency || "UGX").toUpperCase();
  if (!["UGX", "USD", "EUR", "GBP"].includes(productCurrency) || (currencyInput && currencyInput !== productCurrency) ||
      products.some((p: any) => String(p.currency || "UGX").toUpperCase() !== productCurrency)) {
    return reply(400, { error: "Please order products in one currency at a time." });
  }
  const orderItems = products.map((p: any) => {
    const quantity = quantities.get(p.id)!;
    const unitPrice = Number(p.price);
    if (!Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 100000000000) throw new Error("Invalid product price in catalogue.");
    const photos = Array.isArray(p.image_urls) ? p.image_urls : [];
    return { product_id: p.id, product_name: clean(p.name, 180), product_slug: clean(p.slug, 180), product_image_url: clean(photos[0], 1000) || null, quantity, unit_price: unitPrice, currency: productCurrency, line_total: Math.round(unitPrice * quantity * 100) / 100 };
  });
  const items_subtotal = Math.round(orderItems.reduce((sum: number, p: any) => sum + p.line_total, 0) * 100) / 100;
  if (!Number.isFinite(items_subtotal) || items_subtotal > 1000000000000) return reply(400, { error: "The order total is outside the allowed range." });

  const order = {
    idempotency_key, customer_name, email, phone,
    alternate_phone: clean(body.alternate_phone, 30) || null,
    country, region: clean(body.region, 120) || null, town,
    postal_code: clean(body.postal_code, 30) || null, address_line1,
    address_line2: clean(body.address_line2, 180) || null,
    delivery_instructions: clean(body.delivery_instructions, 500) || null,
    shipping_method, shipment_notes: clean(body.shipment_notes, 500) || null,
    currency: productCurrency, items_subtotal, shipping_quote: null, shipping_currency: null,
    payment_status: "unpaid", fulfillment_status: "received",
    address_confirmed: true, shipping_quote_acknowledged: true,
    customs_acknowledged: shipping_method === "international_shipping" ? true : Boolean(body.customs_acknowledged),
  };
  const { data: created, error: createError } = await sb.from("store_orders").insert(order).select("id,order_reference,fulfillment_status,payment_status").single();
  if (createError || !created) {
    if (createError?.code === "23505") {
      const again = await sb.from("store_orders").select("order_reference,fulfillment_status,payment_status,items_subtotal,currency").eq("idempotency_key", idempotency_key).maybeSingle();
      if (again.data) return reply(200, { ok: true, order_reference: again.data.order_reference, status: again.data.fulfillment_status, payment_status: again.data.payment_status, items_subtotal: again.data.items_subtotal, currency: again.data.currency, repeated_request: true });
    }
    console.error("Order creation failed:", createError?.message);
    return reply(500, { error: "We could not save your order. Please try again; you have not been charged." });
  }
  const { error: itemError } = await sb.from("store_order_items").insert(orderItems.map((item: any) => ({ ...item, order_id: created.id })));
  if (itemError) {
    await sb.from("store_orders").delete().eq("id", created.id);
    console.error("Order item save failed:", itemError.message);
    return reply(500, { error: "We could not save all order items. Please try again; you have not been charged." });
  }
  await sb.from("store_order_events").insert({
    order_id: created.id, event_type: "order_created", to_status: "received",
    note: "Order received. Stock, destination serviceability, shipping quote and payment still require confirmation."
  });
  return reply(201, { ok: true, order_reference: created.order_reference, status: created.fulfillment_status, payment_status: created.payment_status, items_subtotal, currency: productCurrency, shipping_confirmed: false, payment_required: false });
});