export default async function handler(req, res) {
  const { number } = req.query;

  if (!number) {
    return res.status(400).json({ error: "Missing NPI number" });
  }

  try {
    const response = await fetch(
      `https://npiregistry.cms.hhs.gov/api/?number=${number}&version=2.1`
    );

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Could not reach NPI registry" });
  }
}
