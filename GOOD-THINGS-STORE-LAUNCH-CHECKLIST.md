# The Good Things Store — launch preparation checklist

Status: preparation only. The live storefront is not currently accepting paid orders. Do not enable live payments until the merchant account is approved, delivery fees are confirmed, and payment verification is tested.

## Flutterwave NGO / Other Entity onboarding (Uganda)

Use the current Uganda-specific instructions in Flutterwave's Help Center and confirm any changes with Flutterwave before submitting.

- [ ] Certificate of Registration for the foundation.
- [ ] Valid NGO Bureau Permit to Operate (check expiry/renewal status).
- [ ] Certified Memorandum and Articles of Association / governing documents.
- [ ] Board resolution letter authorising the Flutterwave account and signatory, signed by the relevant directors/board members.
- [ ] URA PIN certificate.
- [ ] Valid, clear identity documents for directors/authorised representatives (Flutterwave's Uganda page lists National ID, driving licence or passport; follow the upload instructions shown in the dashboard).
- [ ] Foundation bank account details and cancelled cheque or bank reference letter confirming the account.
- [ ] Verifiable website URL and accurate foundation profile.
- [ ] Physical operating address and any proof of address requested in the dashboard.
- [ ] Confirm with Flutterwave whether The Good Things Store's product-sales activity is acceptable under the foundation's account type and whether a separate merchant/business account is required.
- [ ] Confirm who is authorised to sign, receive settlements and manage refunds.

If a required document is missing, do not upload an unrelated document or claim it is available. Ask Flutterwave whether the application can remain in test/pending status while the document is obtained.

## Store readiness

### Products
- [ ] Confirm each product is actually available for sale.
- [ ] Confirm final price, currency, sizes/variants, stock quantity and product photos.
- [ ] Confirm who fulfils each order and how stock changes are recorded.

### Delivery and customer policies
- [ ] Define delivery areas (for example, specific towns/regions), without promising areas not yet served.
- [ ] Obtain courier/rider quotes and set delivery fees or a transparent quote-before-payment method.
- [ ] Confirm dispatch time, estimated delivery window, tracking/contact process and failed-delivery handling.
- [ ] Decide whether verified pickup is available.
- [ ] Publish cancellation, returns, damaged-item and refund rules.
- [ ] Publish customer support contact and privacy notice.

### Payment and technical safeguards
- [ ] Keep checkout disabled until account approval and delivery/stock data are confirmed.
- [ ] Store Flutterwave secret keys only in Railway server-side environment variables; never in GitHub, browser JavaScript, or public configuration.
- [ ] Build server-side order creation using database prices, not prices sent by the browser.
- [ ] Start with Flutterwave test mode and test success, failure, cancellation, duplicate callbacks and delayed status.
- [ ] Verify payment status server-side and through the provider's documented webhook/signature flow before marking an order paid or dispatching goods.
- [ ] Make payment processing idempotent; keep an auditable order/payment status history.
- [ ] Protect order/customer data with appropriate access controls and row-level security.
- [ ] Switch to live keys only after Flutterwave approves the account and end-to-end tests pass.

## Important distinction
Store purchases and charitable donations must be accounted for separately. Do not describe store purchases as tax-deductible donations unless that status has been confirmed by the appropriate authority.
