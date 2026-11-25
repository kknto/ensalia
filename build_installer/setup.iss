; ==============================================================================
; ENSALIA - Script Oficial de Instalador Windows Desktop (Inno Setup 6)
; Arquitectura: Next.js Standalone + Node.js 20 LTS Portable + SQLite WAL
; Desacoplamiento:
;   - Binarios inmutables: {localappdata}\Programs\Ensalia
;   - Datos persistentes:  {localappdata}\Ensalia (protegido con uninsneveruninstall)
;   - Respaldos seguros:   {userdocs}\Ensalia Respaldos
; ==============================================================================

#define MyAppName "ENSALIA"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "ENSALIA Materials Quality Systems"
#define MyAppURL "https://ensalia.com"
#define MyAppExeName "Ensalia.exe"
#define AppMutexName "Local\LABSICO.LocalApplication"

[Setup]
AppId={{9F5B6D1E-8B7C-4E2A-9A3F-6C8E7D1A2B3C}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
AppMutex={#AppMutexName}
DefaultDirName={localappdata}\Programs\Ensalia
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
DisableDirPage=no
OutputDir=..\dist_installer
OutputBaseFilename=Instalador-ENSALIA-v{#MyAppVersion}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
CloseApplications=yes
RestartApplications=no
UninstallDisplayIcon={app}\{#MyAppExeName}
#ifexist "..\public\icon.ico"
SetupIconFile=..\public\icon.ico
#endif
#ifexist "..\LICENSE.txt"
LicenseFile=..\LICENSE.txt
#endif

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Dirs]
; Estructura persistente desacoplada de actualizaciones y desinstalaciones
Name: "{localappdata}\Ensalia"; Flags: uninsneveruninstall
Name: "{localappdata}\Ensalia\data"; Flags: uninsneveruninstall
Name: "{localappdata}\Ensalia\documents"; Flags: uninsneveruninstall
Name: "{localappdata}\Ensalia\documents\field-sheets"; Flags: uninsneveruninstall
Name: "{localappdata}\Ensalia\documents\calibrations"; Flags: uninsneveruninstall
Name: "{localappdata}\Ensalia\documents\maintenance"; Flags: uninsneveruninstall
Name: "{localappdata}\Ensalia\documents\compression_photos"; Flags: uninsneveruninstall
Name: "{localappdata}\Ensalia\assets"; Flags: uninsneveruninstall
Name: "{localappdata}\Ensalia\logs"; Flags: uninsneveruninstall
Name: "{userdocs}\Ensalia Respaldos"; Flags: uninsneveruninstall

[Files]
; 1. Runtime embebido Node.js 20 LTS Portable x64 (sin modificar PATH global)
Source: "..\build_payload\runtime\node\*"; DestDir: "{app}\runtime\node"; Flags: ignoreversion recursesubdirs createallsubdirs

; 2. Compilacion Next.js Standalone (.next/standalone + .next/static + public + Prisma DLL)
; IMPORTANTE (Ensamblaje de build_payload): Next.js "output: 'standalone'" NO incluye
; devDependencies en el rastreo de dependencias. Durante el ensamblaje del paquete en
; build_payload\app\node_modules\, el pipeline de compilacion DEBE copiar explicitamente:
;   - node_modules\prisma (CLI necesario para "prisma migrate deploy" en actualizaciones)
;   - node_modules\@prisma\engines (incluyendo schema-engine-windows.exe)
;   - node_modules\.prisma\client\query_engine-windows.dll.node
Source: "..\build_payload\app\*"; DestDir: "{app}\app"; Flags: ignoreversion recursesubdirs createallsubdirs

; 3. Scripts operativos de soporte, respaldo, diagnostico y restauracion
Source: "..\scripts\*.ps1"; DestDir: "{app}\scripts"; Flags: ignoreversion recursesubdirs createallsubdirs

; 4. Lanzador nativo silencioso (cero consolas negras)
Source: "..\build_payload\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
#ifexist "..\public\icon.ico"
Source: "..\public\icon.ico"; DestDir: "{app}"; Flags: ignoreversion
#endif

; 5. Base de datos plantilla pre-migrada y sembrada (inicializacion 0 ms offline)
Source: "..\build_payload\ensalia-template.db"; DestDir: "{app}\app\prisma"; Flags: ignoreversion

; 6. Prerrequisito offline WebView2 Evergreen Bootstrapper/Installer (si se incluye en payload)
#ifexist "..\build_payload\prereqs\MicrosoftEdgeWebView2Setup.exe"
Source: "..\build_payload\prereqs\MicrosoftEdgeWebView2Setup.exe"; DestDir: "{tmp}"; Flags: deleteafterinstall
#endif

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
; Instalacion desatendida de WebView2 solo si no esta presente en el sistema
#ifexist "..\build_payload\prereqs\MicrosoftEdgeWebView2Setup.exe"
Filename: "{tmp}\MicrosoftEdgeWebView2Setup.exe"; Parameters: "/silent /install"; StatusMsg: "Configurando motor visual WebView2..."; Check: NeedsWebView2Install; Flags: waituntilterminated
#endif
; Lanzamiento automatico al concluir la instalacion interactiva (bloqueado si ocurrio algun aborto)
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent; Check: ShouldLaunchApp

[Code]
var
  InstallationAborted: Boolean;

function InitializeSetup(): Boolean;
begin
  InstallationAborted := False;
  Result := True;
end;

function ShouldLaunchApp(): Boolean;
begin
  Result := not InstallationAborted;
end;

function IsWebView2Installed(): Boolean;
var
  Ver: String;
begin
  Result :=
    RegQueryStringValue(HKLM64, 'SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', Ver) or
    RegQueryStringValue(HKLM, 'SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', Ver) or
    RegQueryStringValue(HKCU, 'Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', Ver);
  if Result and (Ver = '') then
    Result := False;
end;

function NeedsWebView2Install(): Boolean;
begin
  Result := not IsWebView2Installed();
end;

function RunPreUpgradeBackup(): Boolean;
var
  CommonScript: String;
  PsCmd: String;
  ResultCode: Integer;
  ExecOk: Boolean;
begin
  Result := True;
  CommonScript := ExpandConstant('{app}\scripts\Ensalia.Common.ps1');
  if not FileExists(CommonScript) then
  begin
    InstallationAborted := True;
    MsgBox('No se encontro el script de respaldo pre-actualizacion (' + CommonScript + '). La actualizacion se abortara para proteger los datos del laboratorio.', mbError, MB_OK);
    WizardForm.Close;
    Result := False;
    Exit;
  end;

  PsCmd := '. ''' + CommonScript + '''; $p = Get-EnsaliaPaths; Initialize-EnsaliaDirectories $p; if (Test-Path -LiteralPath $p.Database) { New-EnsaliaBackupArchive -Paths $p -Reason ''pre-actualizacion-instalador'' | Out-Null }';
  ExecOk := Exec('powershell.exe',
    '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "' + PsCmd + '"',
    '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  if (not ExecOk) or (ResultCode <> 0) then
  begin
    InstallationAborted := True;
    MsgBox('Error al crear el respaldo automatico previo a la actualizacion (codigo de salida: ' + IntToStr(ResultCode) + '). La actualizacion se detendra para evitar la perdida de datos.', mbError, MB_OK);
    WizardForm.Close;
    Result := False;
  end;
end;

function RunIncrementalMigrations(TargetDb: String): Boolean;
var
  NodeExe: String;
  PrismaCli: String;
  SchemaPath: String;
  DbUrl: String;
  CmdArgs: String;
  ResultCode: Integer;
  ExecOk: Boolean;
begin
  Result := True;
  NodeExe := ExpandConstant('{app}\runtime\node\node.exe');
  // Nota: node_modules\prisma y node_modules\@prisma\engines (schema-engine-windows.exe)
  // deben copiarse explicitamente a build_payload\app\node_modules\ durante el ensamblaje
  // porque Next.js output: 'standalone' omite devDependencies.
  PrismaCli := ExpandConstant('{app}\app\node_modules\prisma\build\index.js');
  SchemaPath := ExpandConstant('{app}\app\prisma\schema.prisma');

  if (not FileExists(NodeExe)) or (not FileExists(PrismaCli)) or (not FileExists(SchemaPath)) then
  begin
    InstallationAborted := True;
    MsgBox('Faltan archivos requeridos para aplicar migraciones de base de datos (node.exe, prisma CLI o schema.prisma). Verifique que node_modules\prisma y @prisma\engines hayan sido incluidos en build_payload\app\node_modules\.', mbError, MB_OK);
    WizardForm.Close;
    Result := False;
    Exit;
  end;

  DbUrl := TargetDb;
  StringChangeEx(DbUrl, '\', '/', True);
  DbUrl := 'file:' + DbUrl + '?connection_limit=1&busy_timeout=5000';
  CmdArgs := '/C set "DATABASE_URL=' + DbUrl + '" && "' + NodeExe + '" "' + PrismaCli + '" migrate deploy --schema="' + SchemaPath + '"';
  ExecOk := Exec(ExpandConstant('{cmd}'), CmdArgs, ExpandConstant('{app}\app'), SW_HIDE, ewWaitUntilTerminated, ResultCode);
  if (not ExecOk) or (ResultCode <> 0) then
  begin
    InstallationAborted := True;
    MsgBox('Error al aplicar las migraciones incrementales de la base de datos (codigo de salida: ' + IntToStr(ResultCode) + '). La actualizacion se abortara; sus datos previos permanecen protegidos en el respaldo pre-actualizacion. Si la base fue creada originalmente con db push (error P3005), ejecute prisma migrate resolve --applied antes de reintentar.', mbError, MB_OK);
    WizardForm.Close;
    Result := False;
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  NativeDb: String;
  LegacyDb: String;
  TemplateDb: String;
begin
  if CurStep = ssPostInstall then
  begin
    NativeDb := ExpandConstant('{localappdata}\Ensalia\data\ensalia.db');
    LegacyDb := ExpandConstant('{localappdata}\LABSICO\data\labsico.db');
    TemplateDb := ExpandConstant('{app}\app\prisma\ensalia-template.db');

    // Inicializacion de 0 ms: solo si no existe base nativa ni heredada (legacy-alias)
    if (not FileExists(NativeDb)) and (not FileExists(LegacyDb)) then
    begin
      if FileExists(TemplateDb) then
      begin
        if not CopyFile(TemplateDb, NativeDb, False) then
        begin
          InstallationAborted := True;
          MsgBox('Error al copiar la base de datos plantilla hacia "' + NativeDb + '". La instalacion se abortara.', mbError, MB_OK);
          WizardForm.Close;
          Exit;
        end;
      end;
    end
    else
    begin
      // Safe Upgrade: respaldo atomico con manifest SHA-256 ANTES de ejecutar migraciones DDL
      if not RunPreUpgradeBackup() then
      begin
        InstallationAborted := True;
        Exit;
      end;

      // Actualizacion no destructiva: aplica migraciones incrementales sobre la base activa
      if FileExists(NativeDb) then
      begin
        if not RunIncrementalMigrations(NativeDb) then
        begin
          InstallationAborted := True;
          Exit;
        end;
      end
      else if FileExists(LegacyDb) then
      begin
        if not RunIncrementalMigrations(LegacyDb) then
        begin
          InstallationAborted := True;
          Exit;
        end;
      end;
    end;
  end;
end;
