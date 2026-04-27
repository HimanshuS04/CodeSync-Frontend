import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule }
  from '@angular/material/snack-bar';
import { NavbarComponent }
  from '../../shared/components/navbar/navbar.component';
import { AdminService, AdminUser, AdminProject,
         ActiveSession }
  from '../../core/services/admin.service';
import { AuthService }
  from '../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatSnackBarModule,
    NavbarComponent
  ],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {
  // Active tab
  activeTab = 'dashboard';

  // Data
  users: AdminUser[] = [];
  projects: AdminProject[] = [];
  sessions: ActiveSession[] = [];

  // Stats
  totalUsers = 0;
  totalProjects = 0;
  totalFiles = 0;
  publicProjects = 0;
  privateProjects = 0;
  totalExecutions = 0;
  completedExecutions = 0;
  failedExecutions = 0;
  activeSessions = 0;

  // Broadcast
  broadcastTitle = '';
  broadcastMessage = '';
  sendingBroadcast = false;

  // Loading
  loading = true;

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Check admin role
    const user = this.authService.getStoredUser();
    if (user?.role !== 'ADMIN') {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.loadDashboard();
  }

  switchTab(tab: string): void {
    this.activeTab = tab;
    switch (tab) {
      case 'dashboard': this.loadDashboard(); break;
      case 'users': this.loadUsers(); break;
      case 'projects': this.loadProjects(); break;
      case 'sessions': this.loadSessions(); break;
    }
    this.cdr.detectChanges();
  }

  // Dashboard
  loadDashboard(): void {
    this.loading = true;

    this.adminService.getAllUsers().subscribe({
      next: (users) => {
        this.totalUsers = users.length;
        this.cdr.detectChanges();
      }
    });

    this.adminService.getProjectStats().subscribe({
      next: (stats: any) => {
        this.totalProjects = stats.totalProjects;
        this.publicProjects = stats.publicProjects;
        this.privateProjects = stats.privateProjects;
        this.totalFiles = stats.totalFiles;
        this.cdr.detectChanges();
      }
    });

    this.adminService.getExecutionStats().subscribe({
      next: (stats: any) => {
        this.totalExecutions = stats.totalExecutions;
        this.completedExecutions = stats.completedExecutions;
        this.failedExecutions = stats.failedExecutions;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });

    this.adminService.getActiveSessions().subscribe({
      next: (sessions) => {
        this.activeSessions = sessions.length;
        this.cdr.detectChanges();
      }
    });
  }

  // Users
  loadUsers(): void {
    this.loading = true;
    this.adminService.getAllUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  suspendUser(userId: string): void {
    if (!confirm('Suspend this user?')) return;
    this.adminService.suspendUser(userId).subscribe({
      next: () => {
        this.snackBar.open('User suspended', 'Close',
          { duration: 2000 });
        this.loadUsers();
      },
      error: (err) => {
        this.snackBar.open(
          err.error?.message || 'Failed',
          'Close', { duration: 3000 });
      }
    });
  }

  reactivateUser(userId: string): void {
    this.adminService.reactivateUser(userId).subscribe({
      next: () => {
        this.snackBar.open('User reactivated', 'Close',
          { duration: 2000 });
        this.loadUsers();
      },
      error: (err) => {
        this.snackBar.open(
          err.error?.message || 'Failed',
          'Close', { duration: 3000 });
      }
    });
  }

  // Projects
  loadProjects(): void {
    this.loading = true;
    this.adminService.getAllProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  deleteProject(projectId: string): void {
    if (!confirm('Delete this project permanently?'))
      return;
    this.adminService.deleteProject(projectId).subscribe({
      next: () => {
        this.snackBar.open('Project deleted', 'Close',
          { duration: 2000 });
        this.loadProjects();
      },
      error: (err) => {
        this.snackBar.open(
          err.error?.message || 'Failed',
          'Close', { duration: 3000 });
      }
    });
  }

  // Sessions
  loadSessions(): void {
    this.loading = true;
    this.adminService.getActiveSessions().subscribe({
      next: (sessions) => {
        this.sessions = sessions;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Broadcast
  sendBroadcast(): void {
    if (!this.broadcastTitle.trim()
        || !this.broadcastMessage.trim()) return;

    this.sendingBroadcast = true;
    const recipientIds = this.users.map(u => u.userId);

    this.adminService.broadcast(
      this.broadcastTitle.trim(),
      this.broadcastMessage.trim(),
      recipientIds
    ).subscribe({
      next: () => {
        this.sendingBroadcast = false;
        this.broadcastTitle = '';
        this.broadcastMessage = '';
        this.snackBar.open(
          'Broadcast sent!', 'Close',
          { duration: 2000 });
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.sendingBroadcast = false;
        this.snackBar.open(
          err.error?.message || 'Failed',
          'Close', { duration: 3000 });
        this.cdr.detectChanges();
      }
    });
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
}