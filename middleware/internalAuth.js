// Guards server-to-server routes that only the Visify Shopify app backend
// should be able to call (e.g. auto-provisioning a Brand on install).
// Never expose this secret to a browser/theme — it's app-server-to-app-server only.
// Never expose this secret to a browser/theme — it's app-server-to-app-server only.
import crypto from 'crypto';

const internalOnly = (req, res, next) => {
  const secret = typeof req.headers['x-internal-secret'] === 'string'
    ? req.headers['x-internal-secret']
    : '';

  if (!process.env.VISIFY_INTERNAL_SECRET) {
    return res.status(500).json({ message: 'Internal secret not configured' });
  }

  // Security audit F26: compare in constant time so response timing cannot
  // leak how much of the secret matched.
  const expected = Buffer.from(process.env.VISIFY_INTERNAL_SECRET);
  const provided = Buffer.from(secret);
  const mismatch =
    provided.length !== expected.length ||
    !crypto.timingSafeEqual(provided.subarray(0, expected.length), expected);

  if (mismatch) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  next();
};

export default internalOnly;
