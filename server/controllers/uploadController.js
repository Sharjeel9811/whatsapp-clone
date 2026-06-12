import Upload from '../models/Upload.js';

const serveFile = async (req, res) => {
  try {
    const file = await Upload.findById(req.params.id);
    if (!file) return res.status(404).json({ message: 'File not found' });
    res.set('Content-Type', file.mimetype);
    res.send(file.data);
  } catch {
    res.status(404).json({ message: 'File not found' });
  }
};

export { serveFile };
