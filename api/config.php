<?php
/* ==========================================================================
   EPL DLS HUB - BACKEND CONFIGURATION
   HostAfrica Subdomain: api.sokomtaa.co.ke
   ========================================================================== */

// Database Credentials (Update with your HostAfrica MySQL Database details)
define('DB_HOST', 'localhost');
define('DB_NAME', 'sokomtaa_epldls');
define('DB_USER', 'sokomtaa_epldls');
define('DB_PASS', 'nakHrhyvEvVp5M886aQG');

// Allowed CORS Origins (Vercel domain and local testing)
$allowed_origins = [
    'https://epldls.vercel.app',
    'http://localhost:3000',
    'http://localhost',
    'http://127.0.0.1'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
if (in_array($origin, $allowed_origins) || strpos($origin, 'vercel.app') !== false) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: *");
}

header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
