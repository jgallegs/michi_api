' Fast portable launcher. <name> is this file's name without leading symbols (e.g. "> App.vbs" next to an
' "App" folder that holds launcher.ps1 and App-<version>-win.zip). If that version is already extracted to
' %LOCALAPPDATA%\<name>-portable\<version>, the app starts directly; otherwise launcher.ps1 extracts it once.
Option Explicit
Dim sh, fso, here, name, folder, file, zipName, version, exe
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
here = fso.GetParentFolderName(WScript.ScriptFullName)
name = fso.GetBaseName(WScript.ScriptFullName)
Do While Len(name) > 0 And Not (UCase(Left(name, 1)) >= "A" And UCase(Left(name, 1)) <= "Z")
  name = Mid(name, 2)
Loop
folder = here & "\" & name
If Not fso.FileExists(folder & "\launcher.ps1") Then
  MsgBox "Launcher not found: " & folder & "\launcher.ps1", 16
  WScript.Quit 1
End If

zipName = ""
For Each file In fso.GetFolder(folder).Files
  If LCase(Right(file.Name, 8)) = "-win.zip" Then zipName = file.Name
Next

If zipName <> "" Then
  version = Mid(zipName, Len(name) + 2, Len(zipName) - Len(name) - 1 - 8)
  exe = sh.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\" & name & "-portable\" & version & "\" & name & ".exe"
  If fso.FileExists(exe) Then
    sh.CurrentDirectory = fso.GetParentFolderName(exe)
    sh.Run """" & exe & """", 1, False
    WScript.Quit 0
  End If
End If

sh.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & folder & "\launcher.ps1""", 0, False
