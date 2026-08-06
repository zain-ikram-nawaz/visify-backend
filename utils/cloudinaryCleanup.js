import cloudinary from '../config/cloudinary.js';
import ConfiguratorProduct from '../models/ConfiguratorProduct.js';

// Cloudinary secure_urls look like:
//   https://res.cloudinary.com/<cloud>/<resource_type>/upload/v169.../<public_id>[.<ext>]
// Raw uploads (.glb models) keep the extension as part of the public_id;
// image uploads (textures) don't, so it must be stripped before destroy().
function extractPublicId(url, resourceType) {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)$/);
  if (!match) return null;
  let publicId = match[1];
  if (resourceType === 'image') {
    publicId = publicId.replace(/\.[^./]+$/, '');
  }
  return decodeURIComponent(publicId);
}

async function destroyAsset(url, resourceType) {
  const publicId = extractPublicId(url, resourceType);
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.error(`Cloudinary cleanup failed for ${publicId} (${resourceType})`, err.message);
  }
}

// Deletes every model/texture asset a brand's ConfiguratorProducts reference.
// Best-effort: one bad/already-deleted public_id is logged and skipped rather
// than aborting the rest of the wipe.
export async function deleteBrandAssets(brandId) {
  const products = await ConfiguratorProduct.find({ brandId }).lean();

  const models = new Set();
  const textures = new Set();

  for (const product of products) {
    if (product.baseModelUrl) models.add(product.baseModelUrl);
    for (const part of product.parts || []) {
      if (part.modelUrl) models.add(part.modelUrl);
      for (const variant of part.variants || []) {
        if (variant.type === 'texture' && variant.value) textures.add(variant.value);
      }
    }
  }

  await Promise.all([
    ...[...models].map((url) => destroyAsset(url, 'raw')),
    ...[...textures].map((url) => destroyAsset(url, 'image')),
  ]);
}
