const fs = require('fs');
const path = require('path');

const directories = [
    'uploads',
    'uploads/pattas',
    'uploads/policies',
    'uploads/reports'
];

directories.forEach(dir => {
    const dirPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`Created directory: ${dir}`);
    }
});

console.log('All directories created successfully!');
