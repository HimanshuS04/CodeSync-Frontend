import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileTreeItem } from '../../../core/services/file.service';

@Component({
  selector: 'app-file-tree',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-tree.component.html',
  styleUrls: ['./file-tree.component.scss']
})
export class FileTreeComponent {
  @Input() items: FileTreeItem[] = [];
  @Input() level: number = 0;
  @Input() selectedFileId: string | null = null;

  @Output() fileSelected = new EventEmitter<FileTreeItem>();
  @Output() fileDeleted = new EventEmitter<string>();

  expandedFolders: Set<string> = new Set();

  onItemClick(item: FileTreeItem): void {
    if (item.type === 'folder') {
      if (this.expandedFolders.has(item.path)) {
        this.expandedFolders.delete(item.path);
      } else {
        this.expandedFolders.add(item.path);
      }
    } else {
      this.fileSelected.emit(item);
    }
  }

  isExpanded(path: string): boolean {
    return this.expandedFolders.has(path);
  }

  onDelete(event: Event, fileId: string): void {
    event.stopPropagation();
    if (confirm('Delete this file?')) {
      this.fileDeleted.emit(fileId);
    }
  }
}