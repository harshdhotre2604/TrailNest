const mammoth = require('mammoth');

const MAX_TEXT_CHARS = 20000;

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

async function extractDocText(file) {
  if (file.mimetype === DOCX_MIME || file.originalname.toLowerCase().endsWith('.docx')) {
    const { value } = await mammoth.extractRawText({ buffer: file.buffer });
    return value.slice(0, MAX_TEXT_CHARS);
  }
  if (file.mimetype === 'text/plain' || file.originalname.toLowerCase().endsWith('.txt')) {
    return file.buffer.toString('utf8').slice(0, MAX_TEXT_CHARS);
  }
  throw new Error(`Unsupported document type: ${file.originalname}`);
}

module.exports = { extractDocText };
