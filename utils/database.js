import mongoose from 'mongoose';
import dns from 'node:dns';

// Fallback DNS for Windows environments with Node.js
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (error) {
  // Ignored if not supported in the current environment
}

let isConnected = false; // track the connection

export const connectTODB = async () => {
  mongoose.set('strictQuery', true);

  if (isConnected) {
    console.log('MongoDB is already connected');
    return;
  }

  try {
    const uri = (process.env.MONGODB_URI || '').replace(/:<([^>]+)>@/, ':$1@');

    await mongoose.connect(uri, {
      dbName: 'share_prompt',
    });

    isConnected = true;
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};