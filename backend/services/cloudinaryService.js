const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Configure Cloudinary
console.log('Cloudinary Config Check:', {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'MISSING',
    api_key: process.env.CLOUDINARY_API_KEY ? 'FOUND' : 'MISSING',
    api_secret: process.env.CLOUDINARY_API_SECRET ? 'FOUND' : 'MISSING'
});

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Uploads a buffer to Cloudinary with optimized transformations
 * @param {Buffer} fileBuffer - The image buffer from Multer
 * @param {String} folder - Cloudinary folder name
 * @param {String} fileName - Desired public_id prefix
 */
const uploadImage = (fileBuffer, folder = 'events', fileName = 'event') => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                public_id: `${fileName}_${Date.now()}`,
                overwrite: true,
                resource_type: 'image',
                // Production-ready transformations:
                // 1. Auto format (WebP/AVIF if supported)
                // 2. Auto quality (balancing size and visual fidelity)
                // 3. Limit width to 1200px (standard hero width)
                transformation: [
                    { width: 1200, crop: 'limit' },
                    { quality: 'auto', fetch_format: 'auto' }
                ]
            },
            (error, result) => {
                if (result) resolve(result);
                else reject(error);
            }
        );

        streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    });
};

module.exports = {
    cloudinary,
    uploadImage
};
