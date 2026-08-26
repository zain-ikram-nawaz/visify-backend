import mongoose from 'mongoose';

// Security audit F25: one-time record of every exchanged SSO token's jti.
// The TTL index self-deletes entries after 15 minutes — longer than the 10m
// token lifetime plus clock tolerance — so the collection stays tiny.
const consumedSsoTokenSchema = new mongoose.Schema(
  {
    jti: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

consumedSsoTokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 15 });

export default mongoose.model('ConsumedSsoToken', consumedSsoTokenSchema);
