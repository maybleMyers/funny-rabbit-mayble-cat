const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { file, filename, contentType } = JSON.parse(event.body);
    
    // For Cloudflare R2
    const r2Response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/r2/buckets/${process.env.R2_BUCKET}/objects/${filename}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': contentType
        },
        body: Buffer.from(file, 'base64')
      }
    );

    if (r2Response.ok) {
      const publicUrl = `https://${process.env.R2_PUBLIC_URL}/${filename}`;
      return {
        statusCode: 200,
        body: JSON.stringify({ url: publicUrl })
      };
    }

    // For Cloudflare Stream (videos)
    if (contentType.startsWith('video/')) {
      const streamResponse = await fetch(
        'https://api.cloudflare.com/client/v4/accounts/' + 
        process.env.CLOUDFLARE_ACCOUNT_ID + '/stream',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.CLOUDFLARE_STREAM_TOKEN}`,
            'Content-Type': contentType
          },
          body: Buffer.from(file, 'base64')
        }
      );

      const data = await streamResponse.json();
      return {
        statusCode: 200,
        body: JSON.stringify({ url: data.result.preview })
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Upload failed' })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};