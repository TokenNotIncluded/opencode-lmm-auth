import { execFile } from 'node:child_process';
import { join } from 'node:path';

type ACL = { ownerMatches: boolean; protected: boolean; ruleCount: number; onlyCurrent: boolean; fingerprint: string };
const program = String.raw`$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$inputData = ConvertFrom-Json -InputObject ([Console]::In.ReadToEnd())
$path = [string]$inputData.path
$attributes = [System.IO.File]::GetAttributes($path)
if (($attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Unsafe test path.' }
$isDirectory = ($attributes -band [System.IO.FileAttributes]::Directory) -ne 0
$sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
if ($isDirectory) { $acl = [System.IO.Directory]::GetAccessControl($path) } else { $acl = [System.IO.File]::GetAccessControl($path) }
if ($inputData.action -eq 'grant_other') {
    $other = [System.Security.Principal.SecurityIdentifier]::new('S-1-1-0')
    $rule = [System.Security.AccessControl.FileSystemAccessRule]::new($other, [System.Security.AccessControl.FileSystemRights]::Read, [System.Security.AccessControl.AccessControlType]::Allow)
    $acl.AddAccessRule($rule)
} elseif ($inputData.action -eq 'private') {
    if ($isDirectory) { $acl = [System.Security.AccessControl.DirectorySecurity]::new() } else { $acl = [System.Security.AccessControl.FileSecurity]::new() }
    $acl.SetOwner($sid)
    $acl.SetAccessRuleProtection($true, $false)
    $inheritance = [System.Security.AccessControl.InheritanceFlags]::None
    if ($isDirectory) { $inheritance = [System.Security.AccessControl.InheritanceFlags]::ContainerInherit -bor [System.Security.AccessControl.InheritanceFlags]::ObjectInherit }
    $rule = [System.Security.AccessControl.FileSystemAccessRule]::new($sid, [System.Security.AccessControl.FileSystemRights]::FullControl, $inheritance, [System.Security.AccessControl.PropagationFlags]::None, [System.Security.AccessControl.AccessControlType]::Allow)
    $acl.AddAccessRule($rule)
} elseif ($inputData.action -ne 'read') { throw 'Invalid test operation.' }
if ($inputData.action -ne 'read') {
    if ($isDirectory) { [System.IO.Directory]::SetAccessControl($path, $acl) } else { [System.IO.File]::SetAccessControl($path, $acl) }
}
if ($isDirectory) { $acl = [System.IO.Directory]::GetAccessControl($path) } else { $acl = [System.IO.File]::GetAccessControl($path) }
$rules = $acl.GetAccessRules($true, $true, [System.Security.Principal.SecurityIdentifier])
$onlyCurrent = $true
foreach ($rule in $rules) {
    if ($rule.IdentityReference.Value -ne $sid.Value -or $rule.AccessControlType -ne [System.Security.AccessControl.AccessControlType]::Allow -or $rule.FileSystemRights -ne [System.Security.AccessControl.FileSystemRights]::FullControl) { $onlyCurrent = $false }
}
$sha = [System.Security.Cryptography.SHA256]::Create()
try {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($acl.GetSecurityDescriptorSddlForm([System.Security.AccessControl.AccessControlSections]::Owner -bor [System.Security.AccessControl.AccessControlSections]::Access))
    $fingerprint = ([System.BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-', '').ToLowerInvariant()
} finally { $sha.Dispose() }
@{ ownerMatches = $acl.GetOwner([System.Security.Principal.SecurityIdentifier]).Value -eq $sid.Value; protected = $acl.AreAccessRulesProtected; ruleCount = $rules.Count; onlyCurrent = $onlyCurrent; fingerprint = $fingerprint } | ConvertTo-Json -Compress
`;

// Only callers in these tests pass their newly created, owned temporary paths.
export function windowsTestACL(path: string, action: 'read' | 'grant_other' | 'private' = 'read'): Promise<ACL> {
  if (process.platform !== 'win32' || !process.env.SystemRoot) throw Error('Windows test helper unavailable.');
  return new Promise((resolve, reject) => {
    const child = execFile(join(process.env.SystemRoot!, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
      ['-NoProfile', '-NonInteractive', '-Command', program],
      { windowsHide: true, timeout: 5000, maxBuffer: 4096, encoding: 'utf8' }, (error, stdout) => {
        if (error) { reject(error); return; }
        try { resolve(JSON.parse(stdout) as ACL); } catch (failure) { reject(failure); }
      });
    child.stdin!.on('error', reject);
    child.stdin!.end(JSON.stringify({ path, action }));
  });
}
