import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule }
  from '@angular/material/snack-bar';
import { NavbarComponent }
  from '../../../shared/components/navbar/navbar.component';
import { ProjectService, Project }
  from '../../../core/services/project.service';
import { AuthService }
  from '../../../core/services/auth.service';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatSnackBarModule,
    NavbarComponent
  ],
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.scss']
})
export class ProjectDetailComponent implements OnInit {
  project: Project | null = null;
  loading = true;
  isOwner = false;
  isStarred = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadProject(id);
  }

  loadProject(id: string): void {
    this.projectService.getProjectById(id).subscribe({
      next: (project) => {
        this.project = project;
        const userId = this.authService.getUserId();
        this.isOwner = project.ownerId === userId;
        this.loading = false;
        this.cdr.markForCheck();
        this.checkIfStarred(id);
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
        this.snackBar.open(
          'Project not found', 'Close',
          { duration: 3000 });
        this.router.navigate(['/projects']);
      }
    });
  }

  checkIfStarred(projectId: string): void {
    this.projectService.getStarredIds().subscribe({
      next: (ids) => {
        this.isStarred = ids.includes(projectId);
        this.cdr.markForCheck();
      }
    });
  }

  toggleStar(): void {
    if (!this.project) return;
    this.projectService
      .starProject(this.project.projectId).subscribe({
        next: (res) => {
          this.isStarred = res.isStarred;
          if (this.project) {
            if (res.isStarred) {
              this.project.starCount++;
            } else {
              this.project.starCount--;
            }
          }
          this.cdr.markForCheck();
        }
      });
  }

  openEditor(): void {
    this.router.navigate(
      ['/editor', this.project?.projectId]);
  }

  goBack(): void {
    this.router.navigate(['/projects']);
  }
}