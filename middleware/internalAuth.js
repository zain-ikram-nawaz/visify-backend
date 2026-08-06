// Guards server-to-server routes that only the Visify Shopify app backend
// should be able to call (e.g. auto-provisioning a Brand on install).
// Never expose this secret to a browser/theme — it's app-server-to-app-server only.
const internalOnly = (req, res, next) => {
  const secret = req.headers['x-internal-secret'];

  if (!process.env.VISIFY_INTERNAL_SECRET) {
    return res.status(500).json({ message: 'Internal secret not configured' });
  }

  if (secret !== process.env.VISIFY_INTERNAL_SECRET) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  next();
};

export default internalOnly;
