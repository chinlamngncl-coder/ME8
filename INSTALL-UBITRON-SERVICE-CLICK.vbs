' Double-click this file if the .bat did not show a YES popup (UAC).
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
ps1 = dir & "\INSTALL-UBITRON-SERVICE.ps1"
args = "-NoProfile -ExecutionPolicy Bypass -File """ & ps1 & """"
CreateObject("Shell.Application").ShellExecute "powershell.exe", args, dir, "runas", 1
