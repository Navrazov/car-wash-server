import mongoose, { Schema, Document } from 'mongoose';

export interface IGeocodingCacheResult {
  displayName: string;
  shortDisplay?: string;
  lat: number;
  lng: number;
}

export interface IGeocodingCache extends Document {
  queryKey: string;
  queryType: 'forward' | 'cities' | 'addresses';
  results: IGeocodingCacheResult[];
  expiresAt: Date;
}

const GeocodingCacheSchema = new Schema<IGeocodingCache>(
  {
    queryKey: { type: String, required: true },
    queryType: { type: String, required: true, enum: ['forward', 'cities', 'addresses'] },
    results: [
      {
        displayName: { type: String },
        shortDisplay: { type: String },
        lat: { type: Number },
        lng: { type: Number },
        _id: false,
      },
    ],
    expiresAt: { type: Date, required: true },
  },
  { timestamps: false }
);

GeocodingCacheSchema.index({ queryKey: 1, queryType: 1 }, { unique: true });
GeocodingCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IGeocodingCache>('GeocodingCache', GeocodingCacheSchema);
