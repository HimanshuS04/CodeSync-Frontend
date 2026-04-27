import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CodeFile } from '../../../core/services/file.service';

@Component({
  selector: 'app-file-tabs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-tabs.component.html',
  styleUrls: ['./file-tabs.component.scss']
})
export class FileTabsComponent {
  @Input() openFiles: CodeFile[] = [];
  @Input() activeFileId: string | null = null;
  @Input() unsavedFiles: Set<string> = new Set();

  @Output() tabSelected = new EventEmitter<CodeFile>();
  @Output() tabClosed = new EventEmitter<CodeFile>();

  onSelect(file: CodeFile): void {
    this.tabSelected.emit(file);
  }

  onClose(event: Event, file: CodeFile): void {
    event.stopPropagation();
    this.tabClosed.emit(file);
  }

  isUnsaved(fileId: string): boolean {
    return this.unsavedFiles.has(fileId);
  }
}