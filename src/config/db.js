const mongoose = require('mongoose');

let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

const connectDB = async () => {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    }).then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
    console.log('✅ MongoDB Connected');
  } catch (error) {
    cached.promise = null;
    console.error(`❌ MongoDB Error: ${error.message}`);
  }

  return cached.conn;
};

module.exports = connectDB;
