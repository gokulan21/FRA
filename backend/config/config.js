require('dotenv').config();

module.exports = {
    port: process.env.PORT || 5000,
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/fra_patta_db',
    jwtSecret: process.env.JWT_SECRET || 'fra_patta_secret_key_2025',
    jwtExpire: process.env.JWT_EXPIRE || '7d',
    
    // File upload settings
    maxFileSize: process.env.MAX_FILE_SIZE || 10 * 1024 * 1024, // 10MB
    uploadPath: process.env.UPLOAD_PATH || './uploads',
    
    // Email settings
    emailService: process.env.EMAIL_SERVICE || 'gmail',
    emailUser: process.env.EMAIL_USER || '',
    emailPassword: process.env.EMAIL_PASSWORD || '',
    
    // Application settings
    appName: 'FRA Patta Management System',
    appDescription: 'Digital Forest Rights Management Platform',
    supportEmail: 'support@fra-patta.gov.in',
    
    // Security settings
    bcryptRounds: 12,
    rateLimitWindow: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 100, // limit each IP to 100 requests per windowMs
    
    // Development settings
    isDevelopment: process.env.NODE_ENV !== 'production',
    corsOrigin: process.env.CORS_ORIGIN || '*'
};