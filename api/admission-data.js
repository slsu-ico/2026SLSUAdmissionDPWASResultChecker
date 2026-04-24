module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(410).json({
    error: 'Raw admission data downloads are disabled. Use /api/search-result for secure lookups.'
  });
};