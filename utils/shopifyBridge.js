// Thin server-to-server client into the visify Shopify app. visify-backend
// itself holds no Shopify access token — the shop's offline session lives
// only in visify's own session storage — so any real Shopify Admin API call
// (price lookup, draft order creation) has to be brokered through visify's
// internal.shopify.* routes. Mirrors visify/app/visify-backend.server.js's
// style in the opposite direction.
const appUrl = () => process.env.VISIFY_APP_URL || '';

const internalHeaders = () => ({
  'Content-Type': 'application/json',
  'X-Internal-Secret': process.env.VISIFY_INTERNAL_SECRET || '',
});

// Resolves a Shopify product handle to its real admin price. Used both when
// a merchant links/changes a shopifyHandle and by the dashboard's "Re-sync"
// button.
export async function getProductPrice(shopDomain, handle) {
  if (!appUrl()) {
    throw new Error('VISIFY_APP_URL not set — cannot reach Shopify');
  }

  const response = await fetch(`${appUrl()}/internal/shopify/product-price`, {
    method: 'POST',
    headers: internalHeaders(),
    body: JSON.stringify({ shopDomain, handle }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `Failed to fetch price for handle "${handle}"`);
  }

  return data; // { shopifyProductId, shopifyVariantId, price }
}

// Creates a Shopify Draft Order with a custom line item priced at the exact
// configured total (base + selected parts) and returns its checkout URL.
export async function createDraftOrder(shopDomain, { title, price, properties }) {
  // DEV STUB — visify's Partner Dashboard "Protected customer data access" is
  // still pending Shopify review (Public distribution requires manual
  // review, not just the in-dashboard questionnaire), so draftOrderCreate
  // gets rejected. Skip the real Shopify call locally so the rest of the
  // add-to-cart flow (session save, price calc, redirect) is still testable.
  // Remove SKIP_DRAFT_ORDER from .env once the app is actually approved.
  if (process.env.SKIP_DRAFT_ORDER === 'true') {
    console.warn(`[DEV STUB] SKIP_DRAFT_ORDER=true — not calling real Shopify Draft Order API. title="${title}" price=${price}`);
    return `https://${shopDomain}/cart`;
  }

  if (!appUrl()) {
    throw new Error('VISIFY_APP_URL not set — cannot reach Shopify');
  }

  const response = await fetch(`${appUrl()}/internal/shopify/draft-order`, {
    method: 'POST',
    headers: internalHeaders(),
    body: JSON.stringify({ shopDomain, title, price, properties }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to create checkout');
  }

  return data.invoiceUrl;
}
