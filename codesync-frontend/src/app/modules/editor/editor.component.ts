import { Component, OnInit, ChangeDetectorRef,
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
export class EditorComponent implements OnInit {
  projectId = '';
  fileTree: FileTreeItem[] = [];
  openFiles: CodeFile[] = [];
  activeFile: CodeFile | null = null;
  unsavedFiles: Set<string> = new Set();
  editorContent = '';
  loading = true;
  saving = false;
  sidebarOpen = true;

  // Execution
  running = false;
  stdin = '';
  showStdin = false;
  showOutput = false;
  executionResult: ExecutionResult | null = null;
  activeOutputTab: 'output' | 'error' | 'info' = 'output';

  @ViewChild('editorContainer')
  editorContainer!: ElementRef;

  private editor: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fileService: FileService,
    private executionService: ExecutionService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.projectId = this.route
      .snapshot.paramMap.get('projectId') || '';
    this.loadFileTree();
    this.waitForMonaco();
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
        autoClosingBrackets: 'always',
        autoClosingQuotes: 'always'
      });

    this.editor.onDidChangeModelContent(() => {
      if (this.activeFile) {
        this.editorContent = this.editor.getValue();
        this.unsavedFiles.add(this.activeFile.fileId);
        this.cdr.detectChanges();
      }
    });

    this.editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
      () => this.saveFile()
    );
  }

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

  // ✅ Run Code
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

        // Auto switch to error tab if failed
        if (result.stderr || result.compileOutput) {
          this.activeOutputTab = 'error';
        }

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

  createFile(): void {
    const path = prompt(
      'Enter file path (e.g. src/main.py):');
    if (!path) return;

    const name = path.split('/').pop() || path;

    this.fileService.createFile({
      projectId: this.projectId,
      name: name,
      path: path,
      content: ''
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