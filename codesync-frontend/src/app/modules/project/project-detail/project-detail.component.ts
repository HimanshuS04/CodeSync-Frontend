import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
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
    FormsModule,
    MatButtonModule,
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

  // Add member
  searchQuery = '';
  searchResults: any[] = [];
  selectedUser: any = null;
  searching = false;
  addingMember = false;
  showDropdown = false;
  private searchTimer: any = null;

  // Members
  members: any[] = [];
  loadingMembers = false;

  // Edit mode
  editMode = false;
  editName = '';
  editDesc = '';
  editVisibility = '';
  saving = false;

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
        this.cdr.detectChanges();
        this.checkIfStarred(id);
        if (this.isOwner) this.loadMembers();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
        this.snackBar.open(
          'Project not found', 'Close',
          { duration: 3000 });
        this.router.navigate(['/projects']);
      }
    });
  }

  loadMembers(): void {
    if (!this.project) return;
    this.loadingMembers = true;

    this.projectService.getMembers(
      this.project.projectId
    ).subscribe({
      next: (members) => {
        this.members = members;
        this.loadingMembers = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingMembers = false;
        this.cdr.detectChanges();
      }
    });
  }

  checkIfStarred(projectId: string): void {
    this.projectService.getStarredIds().subscribe({
      next: (ids) => {
        this.isStarred = ids.includes(projectId);
        this.cdr.detectChanges();
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
            if (res.isStarred) this.project.starCount++;
            else this.project.starCount--;
          }
          this.cdr.detectChanges();
        }
      });
  }

  // Edit Project
  startEdit(): void {
    if (!this.project) return;
    this.editMode = true;
    this.editName = this.project.name;
    this.editDesc = this.project.description || '';
    this.editVisibility = this.project.visibility;
    this.cdr.detectChanges();
  }

  cancelEdit(): void {
    this.editMode = false;
    this.cdr.detectChanges();
  }

  saveEdit(): void {
    if (!this.project || !this.editName.trim()) return;
    this.saving = true;

    this.projectService.updateProject({
      projectId: this.project.projectId,
      name: this.editName.trim(),
      description: this.editDesc.trim(),
      visibility: this.editVisibility
    }).subscribe({
      next: (updated) => {
        this.project = updated;
        this.editMode = false;
        this.saving = false;
        this.snackBar.open('Project updated!', 'Close',
          { duration: 2000 });
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.saving = false;
        this.snackBar.open(
          err.error?.message || 'Update failed',
          'Close', { duration: 3000 });
        this.cdr.detectChanges();
      }
    });
  }

  // Delete Project
  deleteProject(): void {
    if (!this.project) return;
    if (!confirm(
      `Delete "${this.project.name}" permanently?\nThis cannot be undone!`
    )) return;

    this.projectService.deleteProject(
      this.project.projectId
    ).subscribe({
      next: () => {
        this.snackBar.open('Project deleted', 'Close',
          { duration: 2000 });
        this.router.navigate(['/projects']);
      },
      error: (err) => {
        this.snackBar.open(
          err.error?.message || 'Delete failed',
          'Close', { duration: 3000 });
      }
    });
  }

  // Remove Member
  removeMember(userId: string): void {
    if (!this.project) return;
    if (!confirm('Remove this member?')) return;

    this.projectService.removeMember(
      this.project.projectId, userId
    ).subscribe({
      next: () => {
        this.snackBar.open('Member removed', 'Close',
          { duration: 2000 });
        this.loadMembers();
      },
      error: (err) => {
        this.snackBar.open(
          err.error?.message || 'Failed',
          'Close', { duration: 3000 });
      }
    });
  }

  // Search Users
  onSearchInput(): void {
    this.selectedUser = null;
    if (this.searchQuery.trim().length < 2) {
      this.searchResults = [];
      this.showDropdown = false;
      this.cdr.detectChanges();
      return;
    }

    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.searchUsers();
    }, 300);
  }

  searchUsers(): void {
    this.searching = true;
    this.authService.searchUsers(this.searchQuery.trim())
      .subscribe({
        next: (users) => {
          this.searchResults = users.filter(
            (u: any) => u.userId !== this.project?.ownerId
          );
          this.showDropdown = this.searchResults.length > 0;
          this.searching = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.searchResults = [];
          this.showDropdown = false;
          this.searching = false;
          this.cdr.detectChanges();
        }
      });
  }

  selectUser(user: any): void {
    this.selectedUser = user;
    this.searchQuery = user.username;
    this.showDropdown = false;
    this.cdr.detectChanges();
  }

  addMember(): void {
    if (!this.project || !this.selectedUser) return;
    this.addingMember = true;

    this.projectService.addMember(
      this.project.projectId,
      this.selectedUser.userId
    ).subscribe({
      next: () => {
        this.addingMember = false;
        this.searchQuery = '';
        this.selectedUser = null;
        this.searchResults = [];
        this.snackBar.open('Member added!', 'Close',
          { duration: 2000 });
        this.loadMembers();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.addingMember = false;
        this.snackBar.open(
          err.error?.message || 'Failed',
          'Close', { duration: 3000 });
        this.cdr.detectChanges();
      }
    });
  }

  closeDropdown(): void {
    setTimeout(() => {
      this.showDropdown = false;
      this.cdr.detectChanges();
    }, 200);
  }

  openEditor(): void {
    this.router.navigate(
      ['/editor', this.project?.projectId]);
  }

  goBack(): void {
    this.router.navigate(['/projects']);
  }
}