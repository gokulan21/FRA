const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');

// Ensure upload directories exist
const createUploadDirs = () => {
    const dirs = ['uploads/pattas', 'uploads/policies', 'uploads/reports'];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
};

createUploadDirs();

// Storage configuration for pattas
const pattaStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/pattas/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'patta-' + uniqueSuffix + ext);
    }
});

// Storage configuration for policies
const policyStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/policies/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'policy-' + uniqueSuffix + ext);
    }
});

// Storage configuration for reports
const reportStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/reports/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'report-' + uniqueSuffix + ext);
    }
});

// File filter function
const fileFilter = (allowedTypes) => {
    return (req, file, cb) => {
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), false);
        }
    };
};

// Document file types (PDF, DOC, DOCX)
const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

// Image file types
const imageTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif'
];

// Upload configurations
const uploadPatta = multer({
    storage: pattaStorage,
    limits: {
        fileSize: config.maxFileSize
    },
    fileFilter: fileFilter(documentTypes)
}).single('pattaFile');

const uploadPolicy = multer({
    storage: policyStorage,
    limits: {
        fileSize: config.maxFileSize
    },
    fileFilter: fileFilter(documentTypes)
}).single('policyFile');

const uploadReport = multer({
    storage: reportStorage,
    limits: {
        fileSize: config.maxFileSize
    },
    fileFilter: fileFilter([...documentTypes, ...imageTypes])
}).array('reportFiles', 5); // Allow up to 5 files

const uploadMultiplePatta = multer({
    storage: pattaStorage,
    limits: {
        fileSize: config.maxFileSize
    },
    fileFilter: fileFilter(documentTypes)
}).array('pattaFiles', 10); // Allow up to 10 files

// Error handling middleware
const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                message: `File too large. Maximum size allowed: ${config.maxFileSize / (1024 * 1024)}MB` 
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ 
                message: 'Too many files uploaded.' 
            });
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({ 
                message: 'Unexpected field name for file upload.' 
            });
        }
    }
    
    if (error.message.includes('Invalid file type')) {
        return res.status(400).json({ message: error.message });
    }
    
    next(error);
};

// Utility function to clean up uploaded files on error
const cleanupFiles = (files) => {
    if (!files) return;
    
    const fileArray = Array.isArray(files) ? files : [files];
    fileArray.forEach(file => {
        if (file && file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
    });
};

module.exports = {
    uploadPatta,
    uploadPolicy,
    uploadReport,
    uploadMultiplePatta,
    handleUploadError,
    cleanupFiles
};