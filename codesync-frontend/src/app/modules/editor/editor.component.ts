import { Component, OnInit, OnDestroy,
         ChangeDetectorRef,
         ViewChild, ElementRef,
         ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule }
  from '@angular/material/snack-bar';
import { FileTreeComponent }
  from './file-tree/file-tree.component';
import { FileTabsComponent }
  from './file-tabs/file-tabs.component';
import { FileService, CodeFile, FileTreeItem }
  from '../../core/services/file.service';
import { ExecutionService, ExecutionResult }
  from '../../core/services/execution.service';
import { VersionService, SnapshotResponse }
  from '../../core/services/version.service';
import { ProjectService }
  from '../../core/services/project.service';
import { AuthService }
  from '../../core/services/auth.service';
import { CollabService, CollabSession,
         CollabParticipant, OTOperation }
  from '../../core/services/collab.service';

declare const monaco: any;

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatSnackBarModule,
    FileTreeComponent,
    FileTabsComponent
  ],
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class EditorComponent implements OnInit, OnDestroy {
  projectId = '';
  fileTree: FileTreeItem[] = [];
  openFiles: CodeFile[] = [];
  activeFile: CodeFile | null = null;
  unsavedFiles: Set<string> = new Set();
  editorContent = '';
  loading = true;
  saving = false;
  sidebarOpen = true;
  canEdit = false;
  isOwner = false;

  // Execution
  running = false;
  stdin = '';
  showStdin = false;
  showOutput = false;
  executionResult: ExecutionResult | null = null;
  activeOutputTab: 'output' | 'error' | 'info' = 'output';

  // Version
  snapshots: SnapshotResponse[] = [];
  loadingHistory = false;

  // Collaboration
  collabSession: CollabSession | null = null;
  isCollabActive = false;
  myColor = '#3d5afe';
  participants: CollabParticipant[] = [];
  cursorDecorations: string[] = [];
  private ignoreNextChange = false;
  private debounceTimer: any = null;

  // Right panel
  rightPanel: 'none' | 'history' | 'collab' = 'none';

  @ViewChild('editorContainer')
  editorContainer!: ElementRef;

  private editor: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fileService: FileService,
    private executionService: ExecutionService,
    private versionService: VersionService,
    private projectService: ProjectService,
    private authService: AuthService,
    private collabService: CollabService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.projectId = this.route
      .snapshot.paramMap.get('projectId') || '';
    this.checkAccess();
    this.loadFileTree();
    this.waitForMonaco();
  }

  ngOnDestroy(): void {
    if (this.isCollabActive && this.collabSession) {
      this.collabService.leaveHub(
        this.collabSession.sessionId);
    }
  }

  checkAccess(): void {
    this.projectService.checkAccess(this.projectId)
      .subscribe({
        next: (result) => {
          this.canEdit =
            result.role === 'OWNER'
            || result.role === 'EDITOR';
          this.isOwner = result.role === 'OWNER';
          this.cdr.detectChanges();
          if (this.editor) {
            this.editor.updateOptions({
              readOnly: !this.canEdit
            });
          }
        },
        error: () => {
          this.canEdit = false;
          this.isOwner = false;
          this.cdr.detectChanges();
        }
      });
  }

  waitForMonaco(): void {
    const check = setInterval(() => {
      if (typeof monaco !== 'undefined') {
        clearInterval(check);
        this.setupTheme();
      }
    }, 200);
  }

  setupTheme(): void {
    monaco.editor.defineTheme('codesync-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#0d1117',
        'editor.foreground': '#e6edf3',
        'editorLineNumber.foreground': '#8b949e',
        'editorCursor.foreground': '#3d5afe',
        'editor.selectionBackground': '#264f78',
      }
    });
  }

  initEditor(): void {
    if (!this.editorContainer?.nativeElement) {
      setTimeout(() => this.initEditor(), 100);
      return;
    }

    if (this.editor) return;

    this.editor = monaco.editor.create(
      this.editorContainer.nativeElement, {
        value: '',
        language: 'plaintext',
        theme: 'codesync-dark',
        automaticLayout: true,
        fontSize: 14,
        fontFamily:
          "'Fira Code', 'Cascadia Code', monospace",
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        lineNumbers: 'on',
        renderLineHighlight: 'all',
        bracketPairColorization: { enabled: true },
        padding: { top: 8 },
        tabSize: 2,
        wordWrap: 'on',
        readOnly: !this.canEdit,
        autoClosingBrackets: 'always',
        autoClosingQuotes: 'always'
      });

    if (this.canEdit) {
      this.editor.onDidChangeModelContent(
        (e: any) => {
          if (this.ignoreNextChange) {
            this.ignoreNextChange = false;
            return;
          }

          if (this.activeFile) {
            this.editorContent =
              this.editor.getValue();
            this.unsavedFiles.add(
              this.activeFile.fileId);

            // Send to collab if active
            if (this.isCollabActive) {
              this.sendCollabEdits(e);
            }

            this.cdr.detectChanges();
          }
        });

      // Cursor position change
      this.editor.onDidChangeCursorPosition(
        (e: any) => {
          if (this.isCollabActive
              && this.collabSession) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
              this.collabService.sendCursor(
                this.collabSession!.sessionId,
                e.position.lineNumber,
                e.position.column,
                this.myColor
              );
            }, 100);
          }
        });

      this.editor.addCommand(
        monaco.KeyMod.CtrlCmd
          | monaco.KeyCode.KeyS,
        () => this.saveFile()
      );
    }
  }

  // ===== File Operations =====
  loadFileTree(): void {
    this.fileService.getFileTree(this.projectId)
      .subscribe({
        next: (tree) => {
          this.fileTree = [...tree];
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  onFileSelected(item: FileTreeItem): void {
    if (!item.fileId) return;

    const existing = this.openFiles
      .find(f => f.fileId === item.fileId);

    if (existing) {
      this.setActiveFile(existing);
      return;
    }

    this.fileService.getFileById(item.fileId)
      .subscribe({
        next: (file) => {
          this.openFiles = [...this.openFiles, file];
          this.setActiveFile(file);
          this.cdr.detectChanges();
        }
      });
  }

  setActiveFile(file: CodeFile): void {
    this.activeFile = file;
    this.editorContent = file.content;
    this.rightPanel = 'none';
    this.snapshots = [];

    if (!this.editor) {
      setTimeout(() => {
        this.initEditor();
        this.updateEditorContent(file);
      }, 100);
    } else {
      this.updateEditorContent(file);
    }

    this.cdr.detectChanges();
  }

  updateEditorContent(file: CodeFile): void {
    if (!this.editor) return;
    const oldModel = this.editor.getModel();
    const newModel = monaco.editor.createModel(
      file.content,
      this.getMonacoLanguage(file.language)
    );
    this.editor.setModel(newModel);
    if (oldModel) oldModel.dispose();
  }

  onTabSelected(file: CodeFile): void {
    this.setActiveFile(file);
  }

  onTabClosed(file: CodeFile): void {
    const index = this.openFiles
      .findIndex(f => f.fileId === file.fileId);
    if (index === -1) return;

    this.openFiles = this.openFiles
      .filter(f => f.fileId !== file.fileId);
    this.unsavedFiles.delete(file.fileId);

    if (this.activeFile?.fileId === file.fileId) {
      if (this.openFiles.length > 0) {
        const newIndex = Math.min(
          index, this.openFiles.length - 1);
        this.setActiveFile(this.openFiles[newIndex]);
      } else {
        this.activeFile = null;
        if (this.editor) this.editor.setValue('');
      }
    }
    this.cdr.detectChanges();
  }

  saveFile(): void {
    if (!this.activeFile) return;
    this.saving = true;

    this.fileService.updateContent(
      this.activeFile.fileId,
      this.editorContent
    ).subscribe({
      next: (updated) => {
        this.saving = false;
        this.unsavedFiles = new Set(
          [...this.unsavedFiles]
            .filter(id => id !== updated.fileId));
        this.openFiles = this.openFiles.map(f =>
          f.fileId === updated.fileId ? updated : f);
        this.activeFile = updated;
        this.snackBar.open('Saved!', 'Close',
          { duration: 1500 });
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.saving = false;
        this.snackBar.open(
          err.error?.message || 'Save failed',
          'Close', { duration: 3000 });
        this.cdr.detectChanges();
      }
    });
  }

  createFile(): void {
    const path = prompt(
      'Enter file path (e.g. src/main.py):');
    if (!path) return;
    const name = path.split('/').pop() || path;

    this.fileService.createFile({
      projectId: this.projectId,
      name, path, content: ''
    }).subscribe({
      next: () => {
        this.loadFileTree();
        this.snackBar.open('File created!', 'Close',
          { duration: 2000 });
      },
      error: (err) => {
        this.snackBar.open(
          err.error?.message || 'Failed',
          'Close', { duration: 3000 });
      }
    });
  }

  onFileDeleted(fileId: string): void {
    this.fileService.deleteFile(fileId).subscribe({
      next: () => {
        const file = this.openFiles
          .find(f => f.fileId === fileId);
        if (file) this.onTabClosed(file);
        this.loadFileTree();
        this.snackBar.open('File deleted', 'Close',
          { duration: 2000 });
      }
    });
  }

  // ===== Run Code =====
  runCode(): void {
    if (!this.activeFile) return;
    this.running = true;
    this.showOutput = true;
    this.executionResult = null;
    this.activeOutputTab = 'output';
    this.cdr.detectChanges();

    this.executionService.runCode({
      projectId: this.projectId,
      fileId: this.activeFile.fileId,
      language: this.activeFile.language,
      sourceCode: this.editorContent,
      stdin: this.stdin || undefined
    }).subscribe({
      next: (result) => {
        this.running = false;
        this.executionResult = result;
        if (result.stderr || result.compileOutput)
          this.activeOutputTab = 'error';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.running = false;
        this.snackBar.open(
          err.error?.message || 'Execution failed',
          'Close', { duration: 3000 });
        this.cdr.detectChanges();
      }
    });
  }

  // ===== Snapshots =====
  createSnapshot(): void {
    if (!this.activeFile) return;
    const message = prompt('Enter commit message:');
    if (!message) return;

    this.versionService.createSnapshot({
      projectId: this.projectId,
      fileId: this.activeFile.fileId,
      message, content: this.editorContent
    }).subscribe({
      next: () => {
        this.snackBar.open(
          'Snapshot created!', 'Close',
          { duration: 2000 });
        if (this.rightPanel === 'history')
          this.loadHistory();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.snackBar.open(
          err.error?.message || 'Failed',
          'Close', { duration: 3000 });
      }
    });
  }

  toggleHistory(): void {
    if (this.rightPanel === 'history') {
      this.rightPanel = 'none';
    } else {
      this.rightPanel = 'history';
      this.loadHistory();
    }
    this.cdr.detectChanges();
  }

  loadHistory(): void {
    if (!this.activeFile) return;
    this.loadingHistory = true;

    this.versionService.getFileHistory(
      this.activeFile.fileId
    ).subscribe({
      next: (s) => {
        this.snapshots = s;
        this.loadingHistory = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingHistory = false;
        this.cdr.detectChanges();
      }
    });
  }

  restoreSnapshot(snap: SnapshotResponse): void {
    if (!confirm(
      `Restore to snapshot #${snap.id}?\n"${snap.message}"`
    )) return;

    this.versionService.restoreSnapshot(snap.id)
      .subscribe({
        next: () => {
          this.snackBar.open('Restored!', 'Close',
            { duration: 2000 });
          if (this.activeFile) {
            this.fileService.getFileById(
              this.activeFile.fileId
            ).subscribe({
              next: (file) => {
                this.openFiles = this.openFiles.map(f =>
                  f.fileId === file.fileId ? file : f);
                this.setActiveFile(file);
                this.loadHistory();
              }
            });
          }
        },
        error: (err) => {
          this.snackBar.open(
            err.error?.message || 'Failed',
            'Close', { duration: 3000 });
        }
      });
  }

  // ===== Collaboration =====
  startCollab(): void {
    if (!this.activeFile) return;

    const userId = this.authService.getUserId();

    this.collabService.createSession({
      projectId: this.projectId,
      fileId: this.activeFile.fileId,
      ownerId: userId || '',
      initialContent: this.editorContent
    }).subscribe({
      next: async (session) => {
        this.collabSession = session;
        this.isCollabActive = true;
        this.rightPanel = 'collab';
        this.participants = session.participants;

        const me = session.participants
          .find(p => p.userId === userId);
        if (me) this.myColor = me.color;

        this.setupCollabCallbacks();
        await this.collabService.connectToHub(
          session.sessionId);

        this.snackBar.open(
          'Session started! Share ID: '
            + session.sessionId.substring(0, 8),
          'Close', { duration: 5000 });
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.snackBar.open(
          err.error?.message || 'Failed',
          'Close', { duration: 3000 });
      }
    });
  }

  joinCollab(): void {
    const sessionId = prompt(
      'Enter session ID to join:');
    if (!sessionId) return;

    const user = this.authService.getStoredUser();

    this.collabService.joinSession({
      sessionId,
      username: user?.username || 'Anonymous'
    }).subscribe({
      next: async (session) => {
        this.collabSession = session;
        this.isCollabActive = true;
        this.rightPanel = 'collab';
        this.participants = session.participants;

        const userId = this.authService.getUserId();
        const me = session.participants
          .find(p => p.userId === userId);
        if (me) this.myColor = me.color;

        // Load the file being collaborated on
        this.fileService.getFileById(session.fileId)
          .subscribe({
            next: (file) => {
              if (!this.openFiles
                .find(f => f.fileId === file.fileId)) {
                this.openFiles =
                  [...this.openFiles, file];
              }
              this.setActiveFile(file);
            }
          });

        this.setupCollabCallbacks();
        await this.collabService.connectToHub(
          session.sessionId);

        this.snackBar.open(
          'Joined session!', 'Close',
          { duration: 2000 });
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.snackBar.open(
          err.error?.message || 'Failed to join',
          'Close', { duration: 3000 });
      }
    });
  }

  setupCollabCallbacks(): void {
    this.collabService.onInitialDocument =
      (content: string) => {
        if (this.editor) {
          this.ignoreNextChange = true;
          this.editor.setValue(content);
          this.editorContent = content;
          this.cdr.detectChanges();
        }
      };

    this.collabService.onEditReceived =
      (op: OTOperation) => {
        const userId = this.authService.getUserId();
        // Skip own operations
        if (op.userId === userId) return;

        if (!this.editor) return;

        this.ignoreNextChange = true;
        const model = this.editor.getModel();
        if (!model) return;

        if (op.type === 'INSERT') {
          const pos = model.getPositionAt(op.position);
          const range = new monaco.Range(
            pos.lineNumber, pos.column,
            pos.lineNumber, pos.column
          );
          model.pushEditOperations(
            [],
            [{
              range: range,
              text: op.text,
              forceMoveMarkers: true
            }],
            () => null
          );
        } else if (op.type === 'DELETE') {
          const startPos = model.getPositionAt(
            op.position);
          const endPos = model.getPositionAt(
            op.position + op.text.length);
          const range = new monaco.Range(
            startPos.lineNumber, startPos.column,
            endPos.lineNumber, endPos.column
          );
          model.pushEditOperations(
            [],
            [{
              range: range,
              text: '',
              forceMoveMarkers: true
            }],
            () => null
          );
        }

        this.editorContent = this.editor.getValue();
        this.cdr.detectChanges();
      };

    this.collabService.onCursorReceived =
      (userId, username, line, col, color) => {
        this.showRemoteCursor(
          userId, username, line, col, color);
      };

    this.collabService.onUserJoined =
      (userId, username) => {
        this.participants = [...this.participants,
          { userId, username, role: 'EDITOR',
            color: '#8b949e' }];
        this.snackBar.open(
          `${username} joined`, 'Close',
          { duration: 2000 });
        this.cdr.detectChanges();
      };

    this.collabService.onUserLeft =
      (userId, username) => {
        this.participants = this.participants
          .filter(p => p.userId !== userId);
        this.removeRemoteCursor(userId);
        this.snackBar.open(
          `${username} left`, 'Close',
          { duration: 2000 });
        this.cdr.detectChanges();
      };
  }

  sendCollabEdits(e: any): void {
    if (!this.collabSession) return;

    const userId = this.authService.getUserId() || '';

    for (const change of e.changes) {
      // DELETE operation
      if (change.rangeLength > 0) {
        const deleteOp: OTOperation = {
          type: 'DELETE',
          position: change.rangeOffset,
          text: 'd'.repeat(change.rangeLength),
          userId,
          timestamp: Date.now()
        };
        this.collabService.sendEdit(
          this.collabSession.sessionId, deleteOp);
      }

      // INSERT operation
      if (change.text.length > 0) {
        const insertOp: OTOperation = {
          type: 'INSERT',
          position: change.rangeOffset,
          text: change.text,
          userId,
          timestamp: Date.now()
        };
        this.collabService.sendEdit(
          this.collabSession.sessionId, insertOp);
      }
    }
  }

  showRemoteCursor(
    userId: string, username: string,
    line: number, col: number, color: string
  ): void {
    if (!this.editor) return;

    // Remove old cursor for this user
    this.removeRemoteCursor(userId);

    // Add new cursor decoration
    const decorations = this.editor
      .deltaDecorations([], [
        {
          range: {
            startLineNumber: line,
            startColumn: col,
            endLineNumber: line,
            endColumn: col + 1
          },
          options: {
            className: `remote-cursor-${userId
              .replace(/-/g, '')}`,
            beforeContentClassName:
              `remote-cursor-label-${userId
                .replace(/-/g, '')}`,
            stickiness: 1
          }
        }
      ]);

    this.cursorDecorations.push(...decorations);

    // Add dynamic CSS
    const style = document.createElement('style');
    style.id = `cursor-style-${userId
      .replace(/-/g, '')}`;
    style.innerHTML = `
      .remote-cursor-${userId.replace(/-/g, '')} {
        border-left: 2px solid ${color} !important;
      }
      .remote-cursor-label-${userId
        .replace(/-/g, '')}::before {
        content: '${username}';
        position: absolute;
        top: -18px;
        left: 0;
        background: ${color};
        color: white;
        padding: 1px 6px;
        border-radius: 3px;
        font-size: 10px;
        white-space: nowrap;
        z-index: 100;
      }
    `;

    const existing = document.getElementById(
      `cursor-style-${userId.replace(/-/g, '')}`);
    if (existing) existing.remove();
    document.head.appendChild(style);
  }

  removeRemoteCursor(userId: string): void {
    const style = document.getElementById(
      `cursor-style-${userId.replace(/-/g, '')}`);
    if (style) style.remove();

    if (this.editor && this.cursorDecorations.length) {
      this.editor.deltaDecorations(
        this.cursorDecorations, []);
      this.cursorDecorations = [];
    }
  }

  async endCollab(): Promise<void> {
    if (!this.collabSession) return;

    if (this.isOwner) {
      this.collabService.endSession(
        this.collabSession.sessionId
      ).subscribe();
    } else {
      this.collabService.leaveSession(
        this.collabSession.sessionId
      ).subscribe();
    }

    await this.collabService.leaveHub(
      this.collabSession.sessionId);

    this.collabSession = null;
    this.isCollabActive = false;
    this.participants = [];
    this.rightPanel = 'none';

    this.snackBar.open(
      'Left session', 'Close',
      { duration: 2000 });
    this.cdr.detectChanges();
  }

  copySessionId(): void {
    if (!this.collabSession) return;
    navigator.clipboard.writeText(
      this.collabSession.sessionId);
    this.snackBar.open(
      'Session ID copied!', 'Close',
      { duration: 1500 });
  }

  // ===== Helpers =====
  getStatusColor(): string {
    if (!this.executionResult) return '#8b949e';
    switch (this.executionResult.status) {
      case 'COMPLETED': return '#3fb950';
      case 'FAILED':
      case 'COMPILATION_ERROR': return '#f85149';
      case 'TIMED_OUT': return '#f0c040';
      default: return '#8b949e';
    }
  }

  getStatusIcon(): string {
    if (!this.executionResult) return '';
    switch (this.executionResult.status) {
      case 'COMPLETED': return '✅';
      case 'FAILED':
      case 'COMPILATION_ERROR': return '❌';
      case 'TIMED_OUT': return '⏱️';
      default: return '⏳';
    }
  }

  getTimeAgo(date: string): string {
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
    this.cdr.detectChanges();
  }

  toggleOutput(): void {
    this.showOutput = !this.showOutput;
    this.cdr.detectChanges();
  }

  toggleStdin(): void {
    this.showStdin = !this.showStdin;
    this.cdr.detectChanges();
  }

  goBack(): void {
    if (this.isCollabActive) this.endCollab();
    this.router.navigate(['/projects', this.projectId]);
  }

  private getMonacoLanguage(lang: string): string {
    const map: Record<string, string> = {
      'python': 'python',
      'javascript': 'javascript',
      'typescript': 'typescript',
      'java': 'java',
      'csharp': 'csharp',
      'c': 'c',
      'cpp': 'cpp',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'markdown': 'markdown',
      'sql': 'sql',
      'shell': 'shell',
      'yaml': 'yaml'
    };
    return map[lang] || 'plaintext';
  }
}