<?php
declare(strict_types=1);

/* One-time setup: choose the password that lets the editor publish.
 *
 * It writes data/config.php and then refuses to run again, so it can be left
 * on the server without being a way in. To change the password later, delete
 * api/data/config.php and open this page once more.
 */

$DATA = __DIR__ . '/data';
$SITE = dirname(__DIR__);
$CFG  = $DATA . '/config.php';

$deny = "<IfModule mod_authz_core.c>\n  Require all denied\n</IfModule>\n"
      . "<IfModule !mod_authz_core.c>\n  Order allow,deny\n  Deny from all\n</IfModule>\n";

$done = false; $error = ''; $notes = [];

if (is_file($CFG)) {
    $error = 'Publishing is already set up. To choose a new password, delete '
           . 'api/data/config.php on the server and reload this page.';
} elseif (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $a = (string)($_POST['pw'] ?? '');
    $b = (string)($_POST['pw2'] ?? '');
    if (strlen($a) < 10)      $error = 'Use at least 10 characters.';
    elseif ($a !== $b)        $error = 'The two entries do not match.';
    else {
        if (!is_dir($DATA) && !@mkdir($DATA, 0755, true)) {
            $error = 'Could not create api/data/ — check folder permissions.';
        } else {
            @file_put_contents($DATA . '/.htaccess', $deny);
            $php = "<?php\n// Written by setup.php. The password itself is not stored — only a\n"
                 . "// bcrypt hash of it, which cannot be turned back into the password.\n"
                 . "return ['hash' => " . var_export(password_hash($a, PASSWORD_DEFAULT), true) . "];\n";
            if (@file_put_contents($CFG, $php) === false) {
                $error = 'Could not write api/data/config.php — check folder permissions.';
            } else {
                @chmod($CFG, 0640);
                $done = true;

                $vers = $SITE . '/assets/versions';
                if (!is_dir($vers) && !@mkdir($vers, 0755, true)) {
                    $notes[] = 'Could not create assets/versions/ — create it yourself and allow writing.';
                } else {
                    @file_put_contents($vers . '/.htaccess', "Options -Indexes\n");
                }
                if (!is_writable($SITE . '/assets')) {
                    $notes[] = 'assets/ is not writable by the web server — publishing will fail '
                             . 'until its permissions allow writing (755 usually does).';
                }
            }
        }
    }
}
?>
<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Set the publishing password</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0A0A0B;color:#fff;
       font:15px/1.55 'Poppins',system-ui,-apple-system,'Segoe UI',sans-serif;padding:24px}
  .card{width:min(460px,100%);background:#141416;border:1px solid rgba(255,255,255,.13);
        border-radius:6px;padding:26px 24px}
  h1{font-size:1.15rem;margin:0 0 6px}
  p{color:rgba(255,255,255,.62);margin:0 0 18px}
  label{display:block;font:500 .68rem/1 'IBM Plex Mono',ui-monospace,monospace;
        letter-spacing:.13em;text-transform:uppercase;color:rgba(255,255,255,.52);margin:0 0 7px}
  input{width:100%;box-sizing:border-box;background:#0A0A0B;color:#fff;
        border:1px solid rgba(255,255,255,.13);border-radius:3px;padding:11px 12px;
        font:15px 'IBM Plex Mono',ui-monospace,monospace;margin:0 0 16px}
  input:focus{outline:2px solid #FFCE00;outline-offset:1px}
  button{width:100%;background:#FFCE00;color:#0A0A0B;border:0;border-radius:3px;padding:12px;
         font:500 .7rem/1 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.13em;
         text-transform:uppercase;cursor:pointer}
  .msg{border-radius:3px;padding:11px 13px;margin:0 0 18px;font-size:.9rem}
  .bad{background:rgba(255,138,91,.13);border:1px solid rgba(255,138,91,.4);color:#FFB999}
  .good{background:rgba(123,216,143,.12);border:1px solid rgba(123,216,143,.4);color:#B7E9C4}
  code{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:.85em;color:#FFCE00}
  a{color:#FFCE00}
</style>
<div class="card">
<?php if ($done): ?>
  <h1>Password set</h1>
  <div class="msg good">The editor can publish now. This page has locked itself.</div>
  <?php foreach ($notes as $n): ?><div class="msg bad"><?= htmlspecialchars($n) ?></div><?php endforeach; ?>
  <p>Open <a href="../editor.html">the editor</a>, make a change, and press
     <b>Publish to site</b>. Keep the password somewhere safe — it is stored here
     only as a hash and cannot be read back.</p>
<?php else: ?>
  <h1>Set the publishing password</h1>
  <p>This is the password the content editor will ask for before it writes
     anything to the site. Choose it once; this page then stops working.</p>
  <?php if ($error): ?><div class="msg bad"><?= htmlspecialchars($error) ?></div><?php endif; ?>
  <?php if (!is_file($CFG)): ?>
  <form method="post">
    <label for="pw">Password — 10 characters or more</label>
    <input id="pw" name="pw" type="password" autocomplete="new-password" required>
    <label for="pw2">Type it again</label>
    <input id="pw2" name="pw2" type="password" autocomplete="new-password" required>
    <button type="submit">Set password</button>
  </form>
  <?php endif; ?>
<?php endif; ?>
</div>
