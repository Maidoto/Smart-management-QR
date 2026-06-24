<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json; charset=utf-8');

$teacherPassword = getenv('TEACHER_PASSWORD') ?: 'teacher2026';
$dataDir = __DIR__ . DIRECTORY_SEPARATOR . 'data';
$dataFile = $dataDir . DIRECTORY_SEPARATOR . 'certificates.json';

$starterCertificates = [
    [
        'id' => 'SM-2026-0001',
        'fullName' => 'Диана Маннанова',
        'courseTopic' => 'Аудитор СМК по ISO 9001',
        'courseDate' => '01-05.01.2026',
        'validUntil' => '01.01.2029',
    ],
];

if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

if (!file_exists($dataFile)) {
    file_put_contents(
        $dataFile,
        json_encode($starterCertificates, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)
    );
}

function readCertificates(string $dataFile): array
{
    $raw = file_get_contents($dataFile);
    $decoded = json_decode($raw ?: '[]', true);
    return is_array($decoded) ? $decoded : [];
}

function respond(mixed $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function requireTeacher(): void
{
    if (empty($_SESSION['teacher_authenticated'])) {
        respond(['error' => 'Требуется вход учителя.'], 401);
    }
}

function findCertificateById(array $certificates, string $id): ?array
{
    foreach ($certificates as $certificate) {
        if (($certificate['id'] ?? '') === $id) {
            return $certificate;
        }
    }

    return null;
}

$method = $_SERVER['REQUEST_METHOD'];
$action = (string) ($_GET['action'] ?? '');

if ($method === 'GET' && $action === 'session') {
    respond(['authenticated' => !empty($_SESSION['teacher_authenticated'])]);
}

if ($method === 'GET' && isset($_GET['id'])) {
    $id = trim((string) $_GET['id']);
    $certificate = findCertificateById(readCertificates($dataFile), $id);

    if (!$certificate) {
        respond(['error' => 'Сертификат не найден.'], 404);
    }

    respond($certificate);
}

if ($method === 'GET' && $action === 'list') {
    requireTeacher();
    respond(readCertificates($dataFile));
}

if ($method !== 'POST') {
    respond(['error' => 'Method not allowed'], 405);
}

$payload = json_decode(file_get_contents('php://input') ?: '{}', true);
$postAction = (string) ($payload['action'] ?? '');

if ($postAction === 'login') {
    $password = (string) ($payload['password'] ?? '');

    if (!hash_equals($teacherPassword, $password)) {
        respond(['error' => 'Неверный пароль.'], 401);
    }

    session_regenerate_id(true);
    $_SESSION['teacher_authenticated'] = true;
    respond(['authenticated' => true]);
}

if ($postAction === 'logout') {
    $_SESSION = [];
    session_destroy();
    respond(['authenticated' => false]);
}

if ($postAction !== 'create') {
    respond(['error' => 'Unknown action'], 400);
}

requireTeacher();

$requiredFields = ['fullName', 'courseTopic', 'courseDate', 'validUntil'];
foreach ($requiredFields as $field) {
    if (!isset($payload[$field]) || trim((string) $payload[$field]) === '') {
        respond(['error' => "Missing field: {$field}"], 422);
    }
}

$certificates = readCertificates($dataFile);
$year = date('Y');
$nextNumber = str_pad((string) (count($certificates) + 1), 4, '0', STR_PAD_LEFT);

$certificate = [
    'id' => "SM-{$year}-{$nextNumber}",
    'fullName' => trim((string) $payload['fullName']),
    'courseTopic' => trim((string) $payload['courseTopic']),
    'courseDate' => trim((string) $payload['courseDate']),
    'validUntil' => trim((string) $payload['validUntil']),
];

$certificates[] = $certificate;
file_put_contents(
    $dataFile,
    json_encode($certificates, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
    LOCK_EX
);

respond($certificate, 201);
