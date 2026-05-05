import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { NavbarComponent }
  from '../../shared/components/navbar/navbar.component';
import { AuthService }
  from '../../core/services/auth.service';
import { ProjectService, Project }
  from '../../core/services/project.service';
import { AuthResponse }
  from '../../core/models/user.model';
import { CreateProjectComponent }
  from '../project/create-project/create-project.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDialogModule,
    NavbarComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  user: AuthResponse | null = null;
  myProjects: Project[] = [];
  publicProjects: Project[] = [];
  starredIds: Set<string> = new Set();
  loading = true;

  constructor(
    private authService: AuthService,
    private projectService: ProjectService,
    private router: Router,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$
      .subscribe(u => {
        this.user = u;
        this.cdr.markForCheck();
      });
    this.loadProjects();
    this.loadStarredIds();
  }

  loadProjects(): void {
    this.projectService.getMyProjects().subscribe({
      next: (projects) => {
        this.myProjects = projects;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });

    this.projectService.getPublicProjects().subscribe({
      next: (projects) => {
        this.publicProjects = projects.slice(0, 6);
        this.cdr.markForCheck();
      }
    });
  }

  loadStarredIds(): void {
    this.projectService.getStarredIds().subscribe({
      next: (ids) => {
        this.starredIds = new Set(ids);
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
        const project = [...this.myProjects, ...this.publicProjects]
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

  createProject(): void {
    const dialogRef = this.dialog.open(
      CreateProjectComponent, {
        width: '500px',
        panelClass: 'dark-dialog'
      });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadProjects();
    });
  }
}