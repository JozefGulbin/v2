// pages/api/upload.js

const formidable = require('formidable');
const fs = require('fs');
const path = require('path');

export const config = {
    api: {
        bodyParser: false,
    },
};

const uploadDir = path.join(process.cwd(), '/public/uploads');
fs.mkdirSync(uploadDir, { recursive: true });

// NOTE: I have removed the 'async' keyword as it's not needed here.
export default function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {
        if (err) {
            console.error('Error parsing form:', err);
            return res.status(500).json({ message: 'Error processing upload' });
        }
        
        const imageFile = files.image;
        if (!imageFile) {
            return res.status(400).json({ message: 'No image file uploaded.' });
        }
        
        const tempPath = imageFile.path;
        const newFilename = `${Date.now()}-${imageFile.name.replace(/\s+/g, '-')}`;
        const newPath = path.join(uploadDir, newFilename);
        const publicPath = `/uploads/${newFilename}`;
        
        fs.rename(tempPath, newPath, (renameErr) => {
            if (renameErr) {
                console.error('Error moving file:', renameErr);
                return res.status(500).json({ message: 'Error saving the file.' });
            }
            
            console.log('File uploaded successfully to:', publicPath);

            return res.status(200).json({
                message: 'File uploaded successfully!',
                filePath: publicPath,
            });
        });
    });
}