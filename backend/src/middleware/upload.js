/**
 * File Upload Middleware
 * 
 * Configures multer for handling bill image uploads.
 * Stores files in /uploads with unique timestamped names.
 * Limits file size to 10MB and accepts common image formats.
 */

const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary with env variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'splitbit_bills',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'],
    public_id: (req, file) => `bill-${Date.now()}-${Math.round(Math.random() * 1e9)}`
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  }
});

module.exports = upload;
