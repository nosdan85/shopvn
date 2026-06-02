const axios = require('axios');
const qs = require('qs');

const IMGBB_API_URL = 'https://api.imgbb.com/1/upload';

/**
 * Upload an image buffer to imgbb and return the CDN URL.
 */
const uploadToImgbb = async (buffer, filename = 'image.jpg') => {
    const apiKey = process.env.IMGBB_API_KEY;
    
    if (!apiKey) {
        throw new Error('IMGBB_API_KEY is not configured in .env. Images must be uploaded to CDN for persistence.');
    }

    try {
        const base64 = buffer.toString('base64');
        
        // Use application/x-www-form-urlencoded format for ImgBB POST request without complex boundary issues
        const formData = qs.stringify({
            image: base64,
            name: filename
        });

        const response = await axios.post(
            `${IMGBB_API_URL}?key=${apiKey}`,
            formData,
            { 
                headers: { 
                    'Content-Type': 'application/x-www-form-urlencoded' 
                },
                timeout: 30000 
            }
        );
        
        if (response.data?.data?.url) {
            console.log(`[imgbb] Uploaded: ${filename} → ${response.data.data.url}`);
            return response.data.data.url;
        }
        
        throw new Error('ImgBB response missing image URL');
    } catch (error) {
        const errorMsg = error?.response?.data?.error?.message || error.message;
        console.error(`[imgbb] Upload failed for ${filename}:`, errorMsg);
        throw new Error(`ImgBB upload failed: ${errorMsg}`);
    }
};

module.exports = { uploadToImgbb };
