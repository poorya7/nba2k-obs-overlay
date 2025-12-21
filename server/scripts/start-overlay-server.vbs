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
objShell.Run "cmd /c node server/server.js", 1, False

' 1 = Show window (changed from 0 for debugging)
' 0 = Hide window
' False = Don't wait for the script to finish


