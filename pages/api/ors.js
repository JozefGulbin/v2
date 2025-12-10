// This is the complete code for pages/api/ors.js

export default async function handler(req, res) {
  // We only allow POST requests to this endpoint
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method Not Allowed' });
    return;
  }

  // Get the profile from the URL (e.g., /api/ors?profile=driving-car)
  const { profile } = req.query;
  const apiKey = req.headers.authorization; // Get the API key from the request header
  const body = req.body; // Get the coordinates from the request body

  const url = `https://api.openrouteservice.org/v2/directions/${profile}/geojson`;

  try {
    const orsResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json, application/geo+json',
        'Content-Type': 'application/json',
        'Authorization': apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!orsResponse.ok) {
      // If the external API call fails, forward its error status and message
      const errorData = await orsResponse.json();
      res.status(orsResponse.status).json(errorData);
      return;
    }

    // If successful, forward the JSON data from openrouteservice
    const data = await orsResponse.json();
    res.status(200).json(data);

  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}