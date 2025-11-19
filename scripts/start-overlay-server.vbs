' NBA 2K Overlay Server - Silent Startup Script
' This script runs the Node.js server without showing a console window

Set objShell = CreateObject("WScript.Shell")

' Get the directory where this script is located (scripts folder)
scriptDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

' Go up one level to project root (where server.js is)
Set fso = CreateObject("Scripting.FileSystemObject")
projectRoot = fso.GetParentFolderName(scriptDir)

' Change to the project directory and run the server
objShell.CurrentDirectory = projectRoot
objShell.Run "node server.js", 0, False

' 0 = Hide window
' False = Don't wait for the script to finish

