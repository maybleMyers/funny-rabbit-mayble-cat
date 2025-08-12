// Netlify Function for handling uploads with Netlify Blobs
const { getStore } = require("@netlify/blobs");

exports.handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse the multipart form data
    const contentType = event.headers['content-type'];
    if (!contentType || !contentType.includes('multipart/form-data')) {
      // For base64 uploads (simpler approach)
      const data = JSON.parse(event.body);
      const { file, filename, fileType } = data;
      
      if (!file) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'No file provided' })
        };
      }

      // Generate unique filename
      const uniqueFilename = `${Date.now()}-${filename || 'upload.jpg'}`;
      
      // Store using Netlify Blobs
      const mediaStore = getStore('media');
      
      // Convert base64 to buffer
      const buffer = Buffer.from(file, 'base64');
      
      // Store the file
      await mediaStore.set(uniqueFilename, buffer, {
        metadata: {
          contentType: fileType || 'image/jpeg',
          uploadDate: new Date().toISOString(),
          originalName: filename
        }
      });
      
      // Generate public URL
      const siteUrl = process.env.URL || process.env.DEPLOY_URL || 'http://localhost:8888';
      const publicUrl = `${siteUrl}/.netlify/blobs/${uniqueFilename}`;
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          url: publicUrl,
          filename: uniqueFilename
        })
      };
    }
    
  } catch (error) {
    console.error('Upload error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Upload failed',
        details: error.message
      })
    };
  }
};