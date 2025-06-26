const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const server = http.createServer((req, res) => {
    console.log(`Request: ${req.method} ${req.url}`);
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    let filePath = '';
    let contentType = 'text/html';
    
    // Route requests
    if (req.url === '/test_data.json') {
        filePath = path.join(__dirname, '..', 'test_data.json');
        contentType = 'application/json';
    } else if (req.url === '/witness.json') {
        filePath = path.join(__dirname, '..', 'witness.json');
        contentType = 'application/json';
    } else {
        res.writeHead(404);
        res.end('Not found');
        return;
    }
    
    // Read and serve the file
    fs.readFile(filePath, (err, content) => {
        if (err) {
            console.error(`Error reading ${filePath}:`, err);
            res.writeHead(404);
            res.end('File not found');
            return;
        }
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    });
});

server.listen(PORT, () => {
    console.log(`Test data server running at http://localhost:${PORT}`);
    console.log('Available endpoints:');
    console.log(`  http://localhost:${PORT}/test_data.json`);
    console.log(`  http://localhost:${PORT}/witness.json`);
});