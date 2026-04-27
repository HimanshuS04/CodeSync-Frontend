import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService, AppNotification }
  from '../../../core/services/notification.service';
import { AuthResponse } from '../../../core/models/user.model';
import { MatSnackBar, MatSnackBarModule }
  from '@angular/material/snack-bar';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatToolbarModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    MatSnackBarModule
  ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  user: AuthResponse | null = null;
  notifications: AppNotification[] = [];
  unreadCount = 0;
  loadingNotifications = false;
  isAdmin = false;


  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router,
     private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$
      .subscribe(u => {
        this.user = u;
        this.isAdmin = u?.role === 'ADMIN';
        this.cdr.markForCheck();
      });
    this.loadUnreadCount();
  }

  loadNotifications(): void {
    this.loadingNotifications = true;
    this.notificationService.getMyNotifications()
      .subscribe({
        next: (data) => {
          this.notifications = data;
          this.loadingNotifications = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingNotifications = false;
          this.cdr.markForCheck();
        }
      });
  }

  loadUnreadCount(): void {
    this.notificationService.getUnreadCount()
      .subscribe({
        next: (res) => {
          this.unreadCount = res.count;
          this.cdr.markForCheck();
        }
      });
  }

  openNotifications(): void {
    this.loadNotifications();
    this.loadUnreadCount();
  }
  handleNotificationClick(notification: AppNotification): void {
    this.markRead(notification);

    // If session notification, copy session ID
    if (notification.relatedType === 'SESSION'
        && notification.relatedId) {
      navigator.clipboard.writeText(
        notification.relatedId);
      this.snackBar.open(
        'Session ID copied! Use "Join Session" in editor',
        'Close',
        { duration: 3000 });
    }
  }

  markRead(notification: AppNotification): void {
    if (notification.isRead) return;

    this.notificationService.markRead(notification.id)
      .subscribe({
        next: () => {
          notification.isRead = true;
          this.unreadCount = Math.max(0, this.unreadCount - 1);
          this.cdr.markForCheck();
        }
      });
  }

  markAllRead(): void {
    this.notificationService.markAllRead()
      .subscribe({
        next: () => {
          this.notifications = this.notifications.map(n => ({
            ...n,
            isRead: true
          }));
          this.unreadCount = 0;
          this.cdr.markForCheck();
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

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  logout(): void {
    this.authService.logout();
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}