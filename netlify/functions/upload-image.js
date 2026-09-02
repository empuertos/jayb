exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { image } = JSON.parse(event.body);
    const apiKey = process.env.IMGBB_API_KEY; // Direct access sa saved Netlify Environment Variable

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ success: false, error: 'IMGBB_API_KEY is missing in Netlify environment variables.' })
      };
    }

    const params = new URLSearchParams();
    params.append('image', image);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: params
    });

    const data = await response.json();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};