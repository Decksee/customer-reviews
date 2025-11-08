/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Document } from 'mongoose';

/**
 * Transforms a MongoDB document or plain object to a standardized format.
 * - Converts _id to id
 * - Removes MongoDB-specific fields
 * - Handles nested documents
 * 
 * @param doc MongoDB document or plain object to transform
 * @returns Transformed plain object with consistent id field
 */
export function serializeDocument<T extends { _id?: any; id?: string }>(doc: T | Document | null): T | null {
  if (!doc) return null;

  // Convert to plain object if it's a Mongoose document
  const plainDoc = (doc as Document).toObject ? (doc as Document).toObject() : { ...doc };

  // Convert _id to string id
  if (plainDoc._id) {
    plainDoc.id = plainDoc._id.toString();

    // But keep _id for also use in the client
    plainDoc._id = plainDoc._id.toString();
  }

  // Remove MongoDB specific fields
  delete plainDoc._id;
  delete plainDoc.__v;

  return plainDoc as T;
}

/**
 * Transforms an array of MongoDB documents or plain objects to a standardized format.
 * 
 * @param docs Array of MongoDB documents or plain objects to transform
 * @returns Array of transformed plain objects
 */
export function serializeDocuments<T extends { _id?: any; id?: string }>(docs: (T | Document | null)[]): T[] {
  if (!Array.isArray(docs)) return [];
  return docs.map(doc => serializeDocument(doc)).filter((doc): doc is T => doc !== null);
}

/**
 * Transforms paginated results from MongoDB.
 * 
 * @param paginatedData Paginated data object from MongoDB
 * @returns Transformed paginated data with serialized documents
 */
export function serializePaginatedResults<T extends { _id?: any; id?: string }>(
  paginatedData: { 
    results: (T | Document | null)[]; 
    totalPages: number; 
    totalResults: number;
    [key: string]: any;
  }
): {
  results: T[];
  totalPages: number;
  totalResults: number;
  [key: string]: any;
} {
  if (!paginatedData || !paginatedData.results) {
    return {
      results: [],
      totalPages: 0,
      totalResults: 0
    };
  }

  return {
    ...paginatedData,
    results: serializeDocuments(paginatedData.results)
  };
}
