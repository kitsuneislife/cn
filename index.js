const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const staticDir = path.join(__dirname, 'src');

// Serve static files from src/
app.use(express.static(staticDir));

// Fallback to src/index.html for SPA or root requests
// Use a RegExp route to avoid `path-to-regexp` parsing issues with the string '*'.
// This matches any path and serves the SPA entrypoint.
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});