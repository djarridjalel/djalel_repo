<?php
declare(strict_types=1);

/* Djarri Design Portfolio — the publish endpoint.
 *
 * The editor is a static page and a static page cannot write to the server,
 * so every write goes through here. One file, one JSON conversation:
 *
 *   status                 is this installed, configured, and am I signed in
 *   login    {password}    -> {token}
 *   versions {token}       -> the history, newest first, and which is live
 *   publish  {token, content, note}   writes assets/content.json and keeps a copy
 *   restore  {token, id}   puts an earlier copy back
 *
 * Nothing is ever overwritten without a copy of it existing first: publishing
 * writes a numbered file into assets/versions/ and then copies that file to
 * assets/content.json, so the live file is always identical to some version
 * in the list, and going back is a copy rather than a reconstruction.
 */

const MAX_BYTES = 25 * 1024 * 1024;   // a content file with images in it is large
const KEEP      = 40;                 // versions retained; the live one is never pruned
const TOKEN_TTL = 8 * 3600;
const MAX_FAILS = 6;                  // wrong passwords before the lockout
const LOCKOUT   = 300;

$API    = __DIR__;
$DATA   = $API . '/data';
$SITE   = dirname($API);
$ASSETS = $SITE . '/assets';
$VERS   = $ASSETS . '/versions';
$LIVE   = $ASSETS . '/content.json';
$INDEX  = $VERS . '/index.json';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function out(array $o, int $code = 200): void {
    http_response_code($code);
    echo json_encode($o, JSON_UNESCAPED_SLASHES);
    exit;
}
function fail(string $msg, int $code = 400): void { out(['ok' => false, 'error' => $msg], $code); }

/* ---- small json-file helpers ------------------------------------------- */
function readJson(string $path, array $default = []): array {
    if (!is_file($path)) return $default;
    $raw = file_get_contents($path);
    if ($raw === false || $raw === '') return $default;
    $v = json_decode($raw, true);
    return is_array($v) ? $v : $default;
}
/* write-then-rename: a reader never sees a half-written file, and a failed
   write leaves the previous one intact */
function writeAtomic(string $path, string $data): bool {
    $tmp = $path . '.' . bin2hex(random_bytes(4)) . '.tmp';
    if (file_put_contents($tmp, $data, LOCK_EX) === false) return false;
    @chmod($tmp, 0644);
    if (!@rename($tmp, $path)) { @unlink($tmp); return false; }
    return true;
}
function ensureDir(string $dir): bool {
    return is_dir($dir) || @mkdir($dir, 0755, true);
}

/* ---- who is asking ------------------------------------------------------ */
function config(): array {
    global $DATA;
    $f = $DATA . '/config.php';
    return is_file($f) ? (array)(include $f) : [];
}
function clientKey(): string {
    return hash('sha256', $_SERVER['REMOTE_ADDR'] ?? 'cli');
}
function throttle(): array {
    global $DATA;
    $t = readJson($DATA . '/throttle.json');
    $me = $t[clientKey()] ?? ['fails' => 0, 'until' => 0];
    return [$t, $me];
}
function noteFail(): void {
    global $DATA;
    [$t, $me] = throttle();
    $me['fails'] = (int)$me['fails'] + 1;
    if ($me['fails'] >= MAX_FAILS) { $me['until'] = time() + LOCKOUT; $me['fails'] = 0; }
    $t[clientKey()] = $me;
    writeAtomic($DATA . '/throttle.json', json_encode($t));
}
function clearFails(): void {
    global $DATA;
    [$t] = throttle();
    unset($t[clientKey()]);
    writeAtomic($DATA . '/throttle.json', json_encode($t));
}

function issueToken(): string {
    global $DATA;
    $token = bin2hex(random_bytes(24));
    $all = readJson($DATA . '/tokens.json');
    $now = time();
    foreach ($all as $h => $exp) { if ((int)$exp < $now) unset($all[$h]); }   // sweep
    $all[hash('sha256', $token)] = $now + TOKEN_TTL;
    writeAtomic($DATA . '/tokens.json', json_encode($all));
    return $token;
}
function validToken(?string $token): bool {
    global $DATA;
    if (!is_string($token) || $token === '') return false;
    $all = readJson($DATA . '/tokens.json');
    $exp = $all[hash('sha256', $token)] ?? 0;
    return (int)$exp > time();
}
function requireToken(array $in): void {
    if (!validToken($in['token'] ?? null)) fail('Not signed in — enter the password again.', 401);
}

/* ---- the content itself -------------------------------------------------
   Only two maps of strings are ever accepted. Keys are the data-ed names the
   pages carry, so anything outside that shape is a mistake or an attack and
   is dropped rather than argued with. */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=' . "\r\n";

/* An image value is either an embedded picture or a path to one. Checked in
   pieces rather than with a single expression: a data URI runs to megabytes,
   and handing that to a regular expression risks hitting PCRE's backtrack
   limit, which fails by returning false — indistinguishable here from "this
   is not an image" and so a silent way to drop somebody's photograph. */
function okImage(string $v): bool {
    if (strncmp($v, 'data:image/', 11) === 0) {
        $comma = strpos($v, ',');
        if ($comma === false) return false;
        if (!preg_match('#^data:image/[a-z0-9.+-]{1,32};base64$#i', substr($v, 0, $comma))) return false;
        $b64 = substr($v, $comma + 1);
        return $b64 !== '' && strspn($b64, B64) === strlen($b64);
    }
    if (strpos($v, '..') !== false) return false;          // never a path out of the site
    return (bool)preg_match('#^[A-Za-z0-9_./-]{1,200}\.(webp|png|jpe?g|svg|gif|avif)$#i', $v);
}

/* Only two maps of strings are ever accepted, keyed by the data-ed names the
   pages carry. Anything else is refused by name rather than dropped: an
   endpoint that answers "published" while quietly discarding an image is
   worse than one that refuses. */
function cleanContent($raw, bool $strict = true): array {
    if (!is_array($raw)) {
        if (!$strict) return ['texts' => [], 'images' => []];
        fail('The content was not an object.');
    }
    $out = ['texts' => [], 'images' => []];
    $bad = [];
    foreach (['texts', 'images'] as $bucket) {
        $src = $raw[$bucket] ?? [];
        if (!is_array($src)) continue;
        foreach ($src as $k => $v) {
            if (!is_string($k) || !preg_match('/^[A-Za-z0-9_.\-]{1,64}$/', (string)$k)) {
                $bad[] = 'key ' . substr((string)$k, 0, 40); continue;
            }
            if (!is_string($v)) { $bad[] = $k . ' (not text)'; continue; }
            if ($bucket === 'images' && !okImage($v)) { $bad[] = $k . ' (not an image)'; continue; }
            $out[$bucket][$k] = $v;
        }
    }
    if ($bad && $strict) {
        fail('Nothing was published. These entries were not something this endpoint '
           . 'will write: ' . implode(', ', array_slice($bad, 0, 8))
           . (count($bad) > 8 ? ' and ' . (count($bad) - 8) . ' more' : '') . '.');
    }
    return $out;
}

function manifest(): array {
    global $INDEX;
    $m = readJson($INDEX, []);
    if (!isset($m['versions']) || !is_array($m['versions'])) $m['versions'] = [];
    if (!isset($m['current']) || !is_string($m['current'])) $m['current'] = '';
    return $m;
}
function saveManifest(array $m): bool {
    global $INDEX;
    return writeAtomic($INDEX, json_encode($m, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
}
function validId($id): bool {
    return is_string($id) && preg_match('/^[0-9]{8}-[0-9]{6}-[a-f0-9]{4}$/', $id) === 1;
}
function newId(): string {
    return gmdate('Ymd-His') . '-' . bin2hex(random_bytes(2));
}

/* The live file may predate the history — it ships with the site, and it is
   whatever was uploaded by hand before this endpoint existed. Fold it in as
   the first version so the list is never missing a state the site has
   actually been in. */
function adoptLive(array &$m): void {
    global $LIVE, $VERS;
    if ($m['current'] !== '' || !is_file($LIVE)) return;
    $raw = file_get_contents($LIVE);
    if ($raw === false) return;
    $c = cleanContent(json_decode($raw, true) ?: [], false);
    if (!$c['texts'] && !$c['images'] && $m['versions']) return;
    $id = newId();
    $json = json_encode(['generated' => gmdate('c'),
                         'texts' => (object)$c['texts'], 'images' => (object)$c['images']],
                        JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    if (!writeAtomic($VERS . '/' . $id . '.json', $json)) return;
    array_unshift($m['versions'], [
        'id' => $id, 'time' => gmdate('c'), 'bytes' => strlen($json),
        'texts' => count($c['texts']), 'images' => count($c['images']),
        'note' => 'The file already on the server when versioning was switched on',
    ]);
    $m['current'] = $id;
}

function prune(array &$m): void {
    global $VERS;
    if (count($m['versions']) <= KEEP) return;
    $keep = [];
    $extra = [];
    foreach ($m['versions'] as $v) {
        if (count($keep) < KEEP || $v['id'] === $m['current']) $keep[] = $v;
        else $extra[] = $v;
    }
    foreach ($extra as $v) @unlink($VERS . '/' . $v['id'] . '.json');
    $m['versions'] = $keep;
}

/* ---- routing ------------------------------------------------------------ */
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    out(['ok' => true, 'endpoint' => 'djarri-publish', 'hint' => 'POST JSON with an "action".']);
}

$raw = file_get_contents('php://input');
if ($raw === false || $raw === '') {
    // an empty body after a large POST is almost always the server's own limit
    fail('The request arrived empty. If you were publishing, the file is probably '
       . 'larger than this server accepts — see post_max_size in the .htaccess note.', 413);
}
if (strlen($raw) > MAX_BYTES) fail('That content is larger than ' . (MAX_BYTES >> 20) . 'MB.', 413);
$in = json_decode($raw, true);
if (!is_array($in)) fail('The request was not valid JSON.');
$action = is_string($in['action'] ?? null) ? $in['action'] : '';

$cfg = config();
$configured = isset($cfg['hash']) && is_string($cfg['hash']) && $cfg['hash'] !== '';

if ($action === 'status') {
    out(['ok' => true, 'configured' => $configured, 'signedIn' => validToken($in['token'] ?? null),
         'writable' => is_writable($ASSETS), 'maxBytes' => MAX_BYTES, 'keep' => KEEP]);
}

if (!$configured) {
    fail('Publishing is not set up yet. Open api/setup.php once to choose a password.', 503);
}

if ($action === 'login') {
    [, $me] = throttle();
    if ((int)($me['until'] ?? 0) > time()) {
        fail('Too many wrong passwords. Try again in ' . ((int)$me['until'] - time()) . ' seconds.', 429);
    }
    $pw = $in['password'] ?? '';
    if (!is_string($pw) || !password_verify($pw, $cfg['hash'])) { noteFail(); fail('Wrong password.', 401); }
    clearFails();
    out(['ok' => true, 'token' => issueToken(), 'ttl' => TOKEN_TTL]);
}

requireToken($in);

if (!ensureDir($VERS)) fail('Could not create assets/versions/ — check folder permissions.', 500);

/* one writer at a time: two tabs publishing together must not interleave */
$lockPath = $DATA . '/publish.lock';
$lock = fopen($lockPath, 'c');
if ($lock === false || !flock($lock, LOCK_EX)) fail('Could not take the write lock.', 500);

$m = manifest();
adoptLive($m);

if ($action === 'versions') {
    saveManifest($m);
    out(['ok' => true, 'current' => $m['current'], 'versions' => $m['versions'],
         'live' => is_file($LIVE) ? filesize($LIVE) : 0]);
}

if ($action === 'publish') {
    $c = cleanContent($in['content'] ?? null);
    $note = is_string($in['note'] ?? null) ? mb_substr(trim($in['note']), 0, 120) : '';
    $id = newId();
    $json = json_encode(['generated' => gmdate('c'),
                         'texts' => (object)$c['texts'], 'images' => (object)$c['images']],
                        JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    if ($json === false) fail('Could not encode the content.', 500);

    if (!writeAtomic($VERS . '/' . $id . '.json', $json)) {
        fail('Could not write into assets/versions/ — check folder permissions.', 500);
    }
    // the live file is a copy of the version, never a separate encoding of it
    if (!writeAtomic($LIVE, $json)) {
        @unlink($VERS . '/' . $id . '.json');
        fail('Could not write assets/content.json — check file permissions.', 500);
    }
    array_unshift($m['versions'], [
        'id' => $id, 'time' => gmdate('c'), 'bytes' => strlen($json),
        'texts' => count($c['texts']), 'images' => count($c['images']), 'note' => $note,
    ]);
    $m['current'] = $id;
    prune($m);
    saveManifest($m);
    out(['ok' => true, 'id' => $id, 'bytes' => strlen($json),
         'texts' => count($c['texts']), 'images' => count($c['images']),
         'current' => $m['current'], 'versions' => $m['versions']]);
}

if ($action === 'restore') {
    $id = $in['id'] ?? null;
    if (!validId($id)) fail('That is not a version id.');
    $src = $VERS . '/' . $id . '.json';
    if (!is_file($src)) fail('That version is no longer on the server.', 404);
    $json = file_get_contents($src);
    if ($json === false) fail('Could not read that version.', 500);
    if (!writeAtomic($LIVE, $json)) fail('Could not write assets/content.json.', 500);
    $m['current'] = $id;
    saveManifest($m);
    $c = json_decode($json, true) ?: [];
    out(['ok' => true, 'current' => $id, 'versions' => $m['versions'],
         'content' => ['texts' => (object)($c['texts'] ?? []),
                       'images' => (object)($c['images'] ?? [])]]);
}

fail('Unknown action.', 404);
