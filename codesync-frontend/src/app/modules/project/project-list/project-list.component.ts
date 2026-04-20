import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule }
  from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog }
  from '@angular/material/dialog';
import { NavbarComponent }
  from '../../../shared/components/navbar/navbar.component';
import { ProjectService, Project }
  from '../../../core/services/project.service';
import { CreateProjectComponent }
  from '../create-project/create-project.component';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatDialogModule,
    NavbarComponent
  ],
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.scss']
})
export class ProjectListComponent implements OnInit {
  projects: Project[] = [];
  filteredProjects: Project[] = [];
  starredIds: Set<string> = new Set();
  searchQuery = '';
  loading = true;
  activeTab = 'my';

  constructor(
    private projectService: ProjectService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadMyProjects();
    this.loadStarredIds();
  }

  loadStarredIds(): void {
    this.projectService.getStarredIds().subscribe({
      next: (ids) => {
        this.starredIds = new Set(ids);
        this.cdr.markForCheck();
      }
    });
  }

  loadMyProjects(): void {
    this.activeTab = 'my';
    this.loading = true;
    this.projectService.getMyProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.filteredProjects = projects;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadPublicProjects(): void {
    this.activeTab = 'public';
    this.loading = true;
    this.projectService.getPublicProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.filteredProjects = projects;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onSearch(): void {
    if (!this.searchQuery.trim()) {
      this.filteredProjects = this.projects;
      this.cdr.markForCheck();
      return;
    }
    this.projectService
      .searchProjects(this.searchQuery).subscribe({
        next: (results) => {
          this.filteredProjects = results;
          this.cdr.markForCheck();
        }
      });
  }

  isStarred(projectId: string): boolean {
    return this.starredIds.has(projectId);
  }

  toggleStar(event: Event, projectId: string): void {
    event.stopPropagation();
    this.projectService.starProject(projectId).subscribe({
      next: (res) => {
        const project = this.filteredProjects
          .find(p => p.projectId === projectId);

        if (res.isStarred) {
          this.starredIds.add(projectId);
          if (project) project.starCount++;
        } else {
          this.starredIds.delete(projectId);
          if (project) project.starCount--;
        }
        this.cdr.markForCheck();
      }
    });
  }

  openProject(id: string): void {
    this.router.navigate(['/projects', id]);
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(
      CreateProjectComponent, {
        width: '500px',
        panelClass: 'dark-dialog'
      });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadMyProjects();
    });
  }
}