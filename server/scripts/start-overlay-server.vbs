' NBA 2K Overlay Server - Silent Startup Script
' This script runs the Node.js server without showing a console window

Set objShell = CreateObject("WScript.Shell")

' Get the directory where this script is located (server/scripts folder)
scriptDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

' Go up two levels to project root
Set fso = CreateObject("Scripting.FileSystemObject")
serverDir = fso.GetParentFolderName(scriptDir)
projectRoot = fso.GetParentFolderName(serverDir)

' Change to project root and run the server
objShell.CurrentDirectory = projectRoot
objShell.Run "node server/server.js", 0, False

' 0 = Hide window
' False = Don't wait for the script to finish


